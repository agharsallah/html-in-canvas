/**
 * MiniStage: a small, self-managing three.js scene embedded in a page.
 *
 * - Sizes its canvas to device pixels (same helper as every lab).
 * - Pauses when scrolled out of view and when the tab is hidden.
 * - Caps rendering at 60 fps (30 under reduced motion, or `maxFps`): 120 Hz
 *   displays would otherwise double the GPU and CPU cost for no gain.
 * - Renders on demand: a frame callback returns `false` when its scene is
 *   at rest, and if no callback needs a frame (and the pointer and size
 *   did not change), the GPU draw is skipped entirely.
 * - Releases its WebGL context on destroy: browsers cap live contexts
 *   (~16), and chapters mount and unmount scenes all the time.
 */
import { PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { observeCanvasSize } from '../hic/canvas-sizing';
import { h, prefersReducedMotion } from '../ui/dom';

export interface MiniStageOptions {
  label: string;
  fov?: number;
  /** Extra class on the wrapper for per-scene styling. */
  className?: string;
  /** Frame-rate ceiling for this scene. Default 60. */
  maxFps?: number;
}

/** Return `false` when nothing in the scene changed this frame. */
export type FrameCallback = (dt: number, time: number) => boolean | void;

export class MiniStage {
  readonly el: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  /** Pointer position in [-1, 1], for parallax. */
  readonly pointer = { x: 0, y: 0 };
  readonly reducedMotion = prefersReducedMotion();
  private readonly callbacks = new Set<FrameCallback>();
  private readonly cleanups: Array<() => void> = [];
  private visible = true;
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private readonly minInterval: number;
  /** Set by pointer moves and resizes: the next frame must be drawn. */
  private invalidated = true;

  constructor(host: HTMLElement, { label, fov = 35, className = '', maxFps = 60 }: MiniStageOptions) {
    this.canvas = h('canvas', { class: 'mini-stage-canvas', role: 'img', 'aria-label': label });
    this.el = h('div', { class: `mini-stage ${className}`.trim() }, this.canvas);
    host.append(this.el);

    this.minInterval = 1000 / Math.min(maxFps, this.reducedMotion ? 30 : 60) - 2;
    this.camera = new PerspectiveCamera(fov, 1, 0.1, 100);
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = SRGBColorSpace;

    this.cleanups.push(observeCanvasSize(this.canvas, ({ device, css }) => {
      this.renderer.setSize(device.width, device.height, false);
      this.camera.aspect = css.width / Math.max(1, css.height);
      this.camera.updateProjectionMatrix();
      this.invalidate();
    }, { maxScale: 2, applyToCanvas: false }));

    const io = new IntersectionObserver(([entry]) => {
      this.visible = !!entry?.isIntersecting;
      if (this.visible) this.start();
    });
    io.observe(this.el);
    this.cleanups.push(() => io.disconnect());

    const onVisibility = () => {
      if (!document.hidden) this.start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

    const onMove = (event: PointerEvent) => {
      const rect = this.el.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      this.invalidate();
    };
    this.el.addEventListener('pointermove', onMove);
    this.cleanups.push(() => this.el.removeEventListener('pointermove', onMove));
  }

  /** Force a draw on the next frame (e.g. after an external state change). */
  invalidate(): void {
    this.invalidated = true;
    this.start();
  }

  onFrame(callback: FrameCallback): () => void {
    this.callbacks.add(callback);
    this.start();
    return () => this.callbacks.delete(callback);
  }

  private start(): void {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = 0;
      if (!this.visible || document.hidden) return;
      if (now - this.last < this.minInterval) {
        this.raf = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min((now - this.last) / 1000, 1 / 20);
      this.last = now;
      this.elapsed += dt;
      let busy = this.invalidated;
      this.callbacks.forEach((cb) => {
        if (cb(dt, this.elapsed) !== false) busy = true;
      });
      this.invalidated = false;
      if (busy) this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.callbacks.clear();
    this.cleanups.forEach((cleanup) => cleanup());
    this.scene.traverse((object) => {
      const mesh = object as { geometry?: { dispose(): void }; material?: { dispose(): void } | Array<{ dispose(): void }> };
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      materials.forEach((m) => m.dispose());
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.el.remove();
  }
}
