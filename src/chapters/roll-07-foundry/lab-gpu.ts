/**
 * The WebGPU crucible: a small spin-off of the official jelly slider.
 *
 *  - A real <input type=range> sits in the canvas, invisible (opacity 0) and
 *    never drawn. It only gets geometry, so pointer, Tab and arrow keys work.
 *  - Only the readout <div inert> is drawn: device.queue.drawElementImageToTexture
 *    copies it into an rgba8unorm texture made with the guide's usage flags.
 *  - The shader draws the molten bar. Its colour comes from CSS through
 *    getComputedStyle(range).color, refreshed on focus and blur.
 *
 * Without WebGPU support it runs a 2D simulation and positions the input with
 * CSS, the same fallback the jelly slider uses when updateElementGeometry is
 * missing.
 */
import type { Capabilities } from '../../core/capabilities';
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { isDrawableCanvas, makeDrawableHost, type DrawableGPUQueue } from '../../hic/types';
import { h } from '../../ui/dom';
import { drawSim, GPU_SHADER, readColour } from './lab-gpu-draw';

/** WebGPU flag namespaces are runtime globals; this TS lib only types the classes. */
type FlagNamespace = Record<string, number>;
const gpuFlags = () => globalThis as unknown as { GPUTextureUsage: FlagNamespace; GPUBufferUsage: FlagNamespace };

export const GPU_CSS = { width: 320, height: 140, readout: 96, bar: { x: 16, y: 98, width: 288, height: 34 } };

export interface GpuCrucible {
  readonly el: HTMLElement;
  /** Resolves to the mode actually running. */
  readonly ready: Promise<'webgpu' | 'simulated'>;
  /** Theme changed: re-read colours and repaint. */
  refresh(): void;
  destroy(): void;
}

export function mountGpuCrucible(opts: { caps: Capabilities; onUpload(api: string): void; onInput(value: number): void }): GpuCrucible {
  const range = h('input', { type: 'range', min: '600', max: '1600', step: '10', value: '1080', class: 'fdy-range', 'aria-label': 'Furnace temperature', 'aria-valuetext': '1080 degrees' });
  const degrees = h('span', { class: 'fdy-readout-big', 'data-standin': 'text' }, '1080 °C');
  const note = h('span', { class: 'fdy-readout-small', 'data-standin': 'text' }, 'Bronze pours');
  const readout = h('div', { class: 'fdy-readout', inert: true }, degrees, note);
  const canvas = h('canvas', { class: 'fdy-gpu-canvas', 'aria-label': 'WebGPU crucible' });
  const status = h('p', { class: 'fdy-gpu-status' }, 'Heating up…');
  const el = h('div', { class: 'fdy-gpu' }, h('div', { class: 'fdy-gpu-frame' }, canvas), status);
  const cleanups: Array<() => void> = [];
  let render: () => void = () => {};
  let alive = true;

  const onInput = () => {
    const v = Number(range.value);
    degrees.textContent = `${v} °C`;
    note.textContent = v < 900 ? 'Too cold to pour' : v < 1250 ? 'Bronze pours' : 'Iron pours';
    range.setAttribute('aria-valuetext', `${v} degrees`);
    opts.onInput(v);
    if (isDrawableCanvas(canvas)) canvas.requestPaint();
    render();
  };
  range.addEventListener('input', onInput);
  const recolour = () => (isDrawableCanvas(canvas) ? canvas.requestPaint() : render());
  range.addEventListener('focus', recolour);
  range.addEventListener('blur', recolour);
  cleanups.push(() => range.removeEventListener('input', onInput));

  const fraction = () => (Number(range.value) - 600) / 1000;

  const simulate = (): 'simulated' => {
    el.dataset.mode = 'simulated';
    readout.classList.add('fdy-sim-hidden');
    range.style.transform = `translate(${GPU_CSS.bar.x}px, ${GPU_CSS.bar.y}px)`; // the jelly's CSS fallback
    canvas.parentElement!.append(range, readout);
    const ctx = canvas.getContext('2d')!;
    render = () => {
      drawSim(ctx, canvas, readout, { value: fraction(), focused: document.activeElement === range, colour: getComputedStyle(range).color });
      opts.onUpload('stand-in (simulated)');
    };
    cleanups.push(observeCanvasSize(canvas, () => render(), { maxScale: 2 }));
    status.textContent = 'Simulated: a 2D stand-in. The input is placed with CSS, like the jelly slider’s fallback.';
    return 'simulated';
  };

  const start = async (): Promise<'webgpu' | 'simulated'> => {
    if (!opts.caps.webgpu || !navigator.gpu) return simulate();
    const adapter = await navigator.gpu.requestAdapter().catch(() => null);
    const device = await adapter?.requestDevice().catch(() => null);
    if (!alive) {
      device?.destroy();
      return 'simulated';
    }
    if (!device) return simulate();
    makeDrawableHost(canvas);
    range.setAttribute('drawable', '');
    readout.setAttribute('drawable', '');
    canvas.append(range, readout);
    const context = canvas.getContext('webgpu') as GPUCanvasContext | null;
    if (!context || !isDrawableCanvas(canvas)) return simulate();
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });
    el.dataset.mode = 'webgpu';

    const { GPUTextureUsage, GPUBufferUsage } = gpuFlags();
    const module = device.createShaderModule({ code: GPU_SHADER });
    const pipeline = device.createRenderPipeline({ layout: 'auto', vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format }] } });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    const uniforms = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM! | GPUBufferUsage.COPY_DST! });
    let texture: GPUTexture | null = null;
    let bindGroup: GPUBindGroup | null = null;
    let size = { width: 0, height: 0 };
    const queue = device.queue as GPUQueue & DrawableGPUQueue;

    const ensureTexture = () => {
      const natural = canvas.getElementImageDefaultSize!(readout);
      const width = Math.max(1, Math.ceil(natural.width));
      const height = Math.max(1, Math.ceil(natural.height));
      if (texture && width === size.width && height === size.height) return;
      texture?.destroy();
      texture = device.createTexture({
        size: { width, height },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING! | GPUTextureUsage.COPY_DST! | GPUTextureUsage.RENDER_ATTACHMENT!,
      });
      size = { width, height };
      bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: sampler }, { binding: 1, resource: texture.createView() }, { binding: 2, resource: { buffer: uniforms } }] });
    };

    render = () => {
      if (!bindGroup) return;
      const [r, g, b] = readColour(getComputedStyle(range).color);
      device.queue.writeBuffer(uniforms, 0, new Float32Array([r, g, b, 1, fraction(), document.activeElement === range ? 1 : 0, GPU_CSS.readout / GPU_CSS.height, 0]));
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0.06, g: 0.02, b: 0.01, a: 1 } }] });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };

    const paint = () => {
      ensureTexture();
      let api = 'drawElementImageToTexture';
      try {
        queue.drawElementImageToTexture!({ source: readout }, { texture: texture!, size });
      } catch {
        api = 'copyElementImageToTexture (legacy)';
        queue.copyElementImageToTexture?.({ source: readout }, { destination: { texture }, width: size.width, height: size.height });
      }
      opts.onUpload(api);
      render();
      canvas.updateElementGeometry?.(readout, { canvasTransform: new DOMMatrix() });
      canvas.updateElementGeometry?.(range, { canvasTransform: new DOMMatrix().translate(GPU_CSS.bar.x, GPU_CSS.bar.y) });
    };
    canvas.addEventListener('paint', paint);
    cleanups.push(() => canvas.removeEventListener('paint', paint));
    cleanups.push(observeCanvasSize(canvas, () => canvas.requestPaint(), { maxScale: 2 }));
    cleanups.push(() => {
      texture?.destroy();
      uniforms.destroy();
      device.destroy();
    });
    canvas.requestPaint();
    status.textContent = 'Native WebGPU: the readout is copied with drawElementImageToTexture. The slider is real, invisible, and only has geometry.';
    return 'webgpu';
  };

  const ready = start();
  return {
    el,
    ready,
    refresh: recolour,
    destroy() {
      alive = false;
      cleanups.forEach((fn) => fn());
      el.remove();
    },
  };
}
