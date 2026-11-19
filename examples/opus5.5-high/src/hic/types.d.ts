/**
 * Typings for the WICG HTML-in-Canvas API, written from the explainer's IDL.
 *
 * The API shipped in Chrome 157 and may be missing elsewhere, so these members
 * are declared as present but every call site goes through `support.ts` first.
 */
export {};

declare global {
  interface UpdateElementGeometryOptions {
    /** If already in the canvas's hit-test stack, leave it where it is. Otherwise it goes on top. */
    preserveHitTestOrder?: boolean;
    /** Hit-test clip in the coordinate space of `canvasTransform` (CSS px). Never clips pixels. */
    canvasClip?: DOMRectInit;
    /** Maps the element's border box (before CSS transforms) to canvas CSS px. */
    canvasTransform?: DOMMatrixInit;
  }

  interface DrawElementImageOptions {
    /** true: draw without moving the element's DOM geometry (hit testing, a11y bounds). */
    preserveElementGeometry?: boolean;
  }

  interface ElementImageDefaultSize {
    width: number;
    height: number;
  }

  /** A transferable snapshot of a drawable element (`captureElementImage`). */
  interface ElementImage {
    close(): void;
  }

  interface CanvasPaintEvent extends Event {
    readonly changedElements: readonly Element[];
  }

  interface ElementGeometryUpdateEvent extends Event {
    readonly elements: readonly Element[];
  }

  interface HTMLElementEventMap {
    paint: CanvasPaintEvent;
    elementgeometryupdate: ElementGeometryUpdateEvent;
  }

  interface HTMLCanvasElement {
    /** `"fallback"` (default) or `"drawable"`. Unknown values reflect as `"fallback"`. */
    content: string;
    onpaint: ((this: HTMLCanvasElement, ev: CanvasPaintEvent) => unknown) | null;
    onelementgeometryupdate: ((this: HTMLCanvasElement, ev: ElementGeometryUpdateEvent) => unknown) | null;
    requestPaint(): void;
    captureElementImage(element: Element): ElementImage;
    updateElementGeometry(element: Element | ElementImage, options?: UpdateElementGeometryOptions): void;
    clearElementGeometry(element: Element | ElementImage): void;
    getElementTransform(element: Element): DOMMatrix;
    getElementImageDefaultSize(element: Element | ElementImage): ElementImageDefaultSize;
  }

  interface OffscreenCanvas {
    updateElementGeometry(element: Element | ElementImage, options?: UpdateElementGeometryOptions): void;
    clearElementGeometry(element: Element | ElementImage): void;
    getElementImageDefaultSize(element: Element | ElementImage): ElementImageDefaultSize;
  }

  interface CanvasDrawElementImage {
    drawElementImage(element: Element | ElementImage, dx: number, dy: number, options?: DrawElementImageOptions): void;
    drawElementImage(element: Element | ElementImage, dx: number, dy: number, dwidth: number, dheight: number, options?: DrawElementImageOptions): void;
    drawElementImage(element: Element | ElementImage, sx: number, sy: number, swidth: number, sheight: number, dx: number, dy: number, options?: DrawElementImageOptions): void;
    drawElementImage(
      element: Element | ElementImage,
      sx: number, sy: number, swidth: number, sheight: number,
      dx: number, dy: number, dwidth: number, dheight: number,
      options?: DrawElementImageOptions,
    ): void;
  }

  interface CanvasRenderingContext2D extends CanvasDrawElementImage {}
  interface OffscreenCanvasRenderingContext2D extends CanvasDrawElementImage {}

  interface WebGLCopyElementImageConfig {
    /** Source rect, CSS px. */
    sx?: number;
    sy?: number;
    swidth?: number;
    sheight?: number;
    /** Texture px to rasterize into (scales the snapshot). */
    width?: number;
    height?: number;
  }

  interface WebGL2RenderingContext {
    texElementSubImage2D(
      target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint,
      element: Element | ElementImage, config?: WebGLCopyElementImageConfig,
    ): void;
  }

  interface GPUDrawElementImageSource {
    source: Element | ElementImage;
    /** All four or none. CSS px. */
    sourceX?: number;
    sourceY?: number;
    sourceWidth?: number;
    sourceHeight?: number;
  }

  interface GPUDrawElementImageDestination {
    texture: GPUTexture;
    size?: GPUExtent3D;
    origin?: GPUOrigin3D;
    mipLevel?: number;
    aspect?: GPUTextureAspect;
    colorSpace?: PredefinedColorSpace;
    premultipliedAlpha?: boolean;
  }

  interface GPUQueue {
    drawElementImageToTexture(source: GPUDrawElementImageSource, destination: GPUDrawElementImageDestination): void;
  }
}
