/**
 * One WebGL context for every figure on the page.
 *
 * Browsers cap live WebGL contexts (about 16), and this page has more
 * figures than that. So a single offscreen three.js renderer draws each
 * figure's scene into the bottom-left corner of its own canvas, and the
 * figure copies that region into its own (2D, `content="drawable"`) canvas
 * with `drawImage`. The copy happens in the same task as the render, so the
 * WebGL drawing buffer is still valid without `preserveDrawingBuffer`.
 *
 * The figure canvases scroll with the page like any element, so nothing lags
 * behind the scroll position the way a single fixed overlay canvas would.
 */
import { SRGBColorSpace, WebGLRenderer, type Camera, type Scene } from 'three';

export interface RenderedRegion {
  source: HTMLCanvasElement;
  /** Top of the rendered region in the source canvas (image coordinates, y down). */
  sy: number;
}

let shared: SharedRenderer | null = null;

export class SharedRenderer {
  readonly renderer: WebGLRenderer;
  private width = 1;
  private height = 1;

  private constructor() {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    // Figures clip with material clipping planes (e.g. the source-rect crop).
    this.renderer.localClippingEnabled = true;
    this.renderer.setSize(1, 1, false);
  }

  static get(): SharedRenderer {
    shared ??= new SharedRenderer();
    return shared;
  }

  /** Render `scene` at `width` x `height` device pixels and say where it landed. */
  render(scene: Scene, camera: Camera, width: number, height: number): RenderedRegion {
    // Grow only: reallocating the drawing buffer every figure would thrash.
    if (width > this.width || height > this.height) {
      this.width = Math.max(this.width, width);
      this.height = Math.max(this.height, height);
      this.renderer.setSize(this.width, this.height, false);
    }
    const { renderer } = this;
    renderer.setViewport(0, 0, width, height);
    renderer.setScissor(0, 0, width, height);
    renderer.setScissorTest(true);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
    // GL's origin is bottom-left; the 2D canvas' is top-left.
    return { source: renderer.domElement, sy: this.height - height };
  }
}
