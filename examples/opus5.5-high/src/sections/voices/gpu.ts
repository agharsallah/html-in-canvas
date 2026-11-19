/**
 * WebGPU renderer for the quotes: two textures (outgoing, incoming) composited
 * through a field of growing discs.
 */
const WGSL = /* wgsl */ `
struct U {
  canvas: vec2f,   // grid px
  progress: f32,
  cell: f32,       // disc grid size, grid px
  rectA: vec4f,    // x, y, w, h in grid px (texture placement incl. outsets)
  rectB: vec4f,
  rim: vec4f,      // rim colour (premultiplied rgb, a)
};
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var texA: texture_2d<f32>;
@group(0) @binding(3) var texB: texture_2d<f32>;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}

fn sampleIn(t: texture_2d<f32>, r: vec4f, px: vec2f) -> vec4f {
  let uv = (px - r.xy) / r.zw;
  let c = textureSampleLevel(t, samp, clamp(uv, vec2f(0.0), vec2f(1.0)), 0.0);
  let inside = select(0.0, 1.0, all(uv >= vec2f(0.0)) && all(uv <= vec2f(1.0)));
  // Uploaded with premultipliedAlpha: false, so premultiply here.
  return vec4f(c.rgb * c.a, c.a) * inside;
}

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let px = pos.xy;
  let a = sampleIn(texA, u.rectA, px);
  let b = sampleIn(texB, u.rectB, px);
  if (u.progress <= 0.0) { return a; }
  if (u.progress >= 1.0) { return b; }
  let cell = floor(px / u.cell);
  let f = fract(px / u.cell) - 0.5;
  // Discs grow from the left, each with its own delay.
  let delay = (cell.x * u.cell / u.canvas.x) * 0.55 + hash(cell) * 0.25;
  let t = clamp((u.progress - delay) / 0.35, 0.0, 1.0);
  let r = t * 0.75;
  let d = length(f);
  let aa = 1.5 / u.cell;
  let m = 1.0 - smoothstep(r - aa, r, d);
  let rim = (1.0 - smoothstep(r, r + 0.06, d)) * (1.0 - m) * step(0.001, t) * (1.0 - t);
  let mixed = mix(a, b, m);
  return mixed * (1.0 - rim) + u.rim * rim;
}`;

export interface QuoteRenderer {
  /** Copy an element's snapshot into its texture (call from paint). */
  upload(index: number, el: HTMLElement, outset: number, scale: number): { width: number; height: number };
  render(from: number, to: number, progress: number, rects: [number[], number[]], cell: number, rim: [number, number, number]): void;
}

export async function createRenderer(canvas: HTMLCanvasElement, count: number): Promise<QuoteRenderer | null> {
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) return null;
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  const module = device.createShaderModule({ code: WGSL });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });
  const uniform = device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  const textures: (GPUTexture | null)[] = Array.from({ length: count }, () => null);
  const blank = device.createTexture({ size: [1, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING });

  return {
    upload(index, el, outset, s) {
      const size = canvas.getElementImageDefaultSize(el); // grid px, fractional
      const cssW = size.width / s, cssH = size.height / s;
      const width = Math.max(1, Math.ceil(size.width + 2 * outset * s));
      const height = Math.max(1, Math.ceil(size.height + 2 * outset * s));
      let tex = textures[index];
      if (!tex || tex.width !== width || tex.height !== height) {
        tex?.destroy();
        // Explicit allocation, with the usages drawElementImageToTexture needs.
        tex = device.createTexture({
          size: { width, height },
          format: 'rgba8unorm',
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        textures[index] = tex;
      }
      device.queue.drawElementImageToTexture(
        // Source rect in CSS px: all four or none. Outsets keep the overflowing quote mark and shadow.
        { source: el, sourceX: -outset, sourceY: -outset, sourceWidth: cssW + 2 * outset, sourceHeight: cssH + 2 * outset },
        { texture: tex, size: { width, height } },
      );
      return { width, height };
    },
    render(from, to, progress, rects, cell, rim) {
      const data = new Float32Array(20);
      data.set([canvas.width, canvas.height, progress, cell], 0);
      data.set(rects[0], 4);
      data.set(rects[1], 8);
      data.set([rim[0], rim[1], rim[2], 1], 12);
      device.queue.writeBuffer(uniform, 0, data);
      const bind = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniform } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: (textures[from] ?? blank).createView() },
          { binding: 3, resource: (textures[to] ?? blank).createView() },
        ],
      });
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bind);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
    },
  };
}
