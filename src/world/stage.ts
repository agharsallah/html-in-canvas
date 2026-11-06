/**
 * Stage: the three.js renderer, scene and camera bound to the world canvas.
 *
 * The canvas is a `content="drawable"` host. Its drawable children are the
 * hanging prints' HTML, which the native surface backend copies into
 * textures. Sizing follows the official examples: device-pixel-content-box.
 */
import { Color, FogExp2, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { observeCanvasSize, type CanvasSize } from '../hic/canvas-sizing';
import { makeDrawableHost } from '../hic/types';

export interface Viewport {
  width: number;
  height: number;
}

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(38, 1, 0.1, 120);
  /** Canvas size in CSS px (what updateElementGeometry speaks). */
  viewport: Viewport = { width: 1, height: 1 };
  private readonly resizeListeners = new Set<(size: CanvasSize) => void>();
  private readonly disconnect: () => void;

  constructor(readonly canvas: HTMLCanvasElement) {
    makeDrawableHost(canvas);
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // We size the grid ourselves in device pixels, so three must not rescale.
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = SRGBColorSpace;

    this.scene.background = new Color('#1d0f1f');
    this.scene.fog = new FogExp2('#1d0f1f', 0.04);

    this.disconnect = observeCanvasSize(
      canvas,
      (size) => {
        this.renderer.setSize(size.device.width, size.device.height, false);
        this.camera.aspect = size.css.width / Math.max(1, size.css.height);
        this.camera.updateProjectionMatrix();
        this.viewport = { ...size.css };
        this.resizeListeners.forEach((listener) => listener(size));
      },
      { maxScale: 2, applyToCanvas: false },
    );
  }

  onResize(listener: (size: CanvasSize) => void): () => void {
    this.resizeListeners.add(listener);
    return () => this.resizeListeners.delete(listener);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disconnect();
    this.renderer.dispose();
  }
}
