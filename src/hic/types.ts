/**
 * Type declarations for the experimental HTML-in-Canvas API (WICG proposal).
 *
 * The API shipped in Chrome 157 and may not be supported in every browser
 * (Chrome docs, concepts.md, Fallback strategies), so nothing here is
 * guaranteed to exist at runtime. Always go through `capabilities.ts` / the
 * guards below before calling into it.
 */

/** Options accepted by `canvas.updateElementGeometry()`. */
export interface UpdateElementGeometryOptions {
  /** Keep the element's current position in the hit-test stack. */
  preserveHitTestOrder?: boolean;
  /** Hit-test clip, in the coordinate space of `canvasTransform`. */
  canvasClip?: DOMRectInit;
  /** Maps the element's border box (pre CSS transforms) to canvas CSS px. */
  canvasTransform?: DOMMatrixInit;
}

/** Options accepted as the last argument of `drawElementImage()`. */
export interface DrawElementImageOptions {
  /** When true, drawing does NOT update the element's DOM geometry. */
  preserveElementGeometry?: boolean;
}

/** The `paint` event fired on a `content="drawable"` canvas. */
export interface CanvasPaintEvent extends Event {
  readonly changedElements?: readonly Element[];
}

/** An opaque, transferable snapshot handle returned by `captureElementImage`. */
export interface ElementImage {
  close(): void;
}

export interface ElementImageSize {
  width: number;
  height: number;
}

/** An HTMLCanvasElement with the proposal's additions. */
export interface DrawableCanvas extends HTMLCanvasElement {
  requestPaint(): void;
  captureElementImage?(element: Element): ElementImage;
  updateElementGeometry?(element: Element | ElementImage, options?: UpdateElementGeometryOptions): void;
  clearElementGeometry?(element: Element | ElementImage): void;
  getElementTransform?(element: Element): DOMMatrix;
  getElementImageDefaultSize?(element: Element | ElementImage): ElementImageSize;
}

/**
 * `drawElementImage` has four overloads (see README "IDL changes"):
 *   (el, dx, dy, opts?)
 *   (el, dx, dy, dw, dh, opts?)
 *   (el, sx, sy, sw, sh, dx, dy, opts?)
 *   (el, sx, sy, sw, sh, dx, dy, dw, dh, opts?)
 */
export interface Drawable2DContext extends CanvasRenderingContext2D {
  drawElementImage(
    element: Element | ElementImage,
    ...args: Array<number | DrawElementImageOptions>
  ): void;
}

/** WebGL additions: the current and the legacy upload entry points. */
export interface DrawableWebGL {
  texElementSubImage2D?(
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    element: Element | ElementImage,
    config?: Partial<Record<'sx' | 'sy' | 'swidth' | 'sheight' | 'width' | 'height', number>>,
  ): void;
  /** Legacy name used by early builds and by three.js' HTMLTexture. */
  texElementImage2D?(...args: unknown[]): void;
}

export function isDrawableCanvas(canvas: HTMLCanvasElement): canvas is DrawableCanvas {
  return typeof (canvas as Partial<DrawableCanvas>).requestPaint === 'function';
}

export function isDrawable2D(ctx: CanvasRenderingContext2D | null): ctx is Drawable2DContext {
  return !!ctx && typeof (ctx as Partial<Drawable2DContext>).drawElementImage === 'function';
}

/**
 * Turns a canvas into a drawable host. Sets both the current attribute
 * (`content="drawable"`) and the legacy one (`layoutsubtree`), exactly like
 * the official demos do for backwards compatibility.
 */
export function makeDrawableHost(canvas: HTMLCanvasElement): void {
  canvas.setAttribute('content', 'drawable');
  canvas.setAttribute('layoutsubtree', '');
}

/** Fired on a canvas when batched OffscreenCanvas geometry updates are applied (README IDL). */
export interface ElementGeometryUpdateEvent extends Event {
  readonly elements: readonly Element[];
}

/** An OffscreenCanvas 2D context with the proposal's `drawElementImage` (worker side). */
export interface DrawableOffscreen2D extends OffscreenCanvasRenderingContext2D {
  drawElementImage(image: ElementImage, ...args: Array<number | DrawElementImageOptions>): void;
}

/** True when this canvas can hand out transferable `ElementImage` snapshots. */
export function canCaptureElementImage(canvas: HTMLCanvasElement): canvas is DrawableCanvas & { captureElementImage(el: Element): ElementImage } {
  return typeof (canvas as Partial<DrawableCanvas>).captureElementImage === 'function';
}

/** `GPUDrawElementImageSource` (README IDL): all four source fields or none, CSS px. */
export interface GPUDrawElementImageSourceInit {
  source: Element | ElementImage;
  sourceX?: number;
  sourceY?: number;
  sourceWidth?: number;
  sourceHeight?: number;
}

/** `GPUDrawElementImageDestination`: a texel-copy destination plus `size` in texture px. */
export interface GPUDrawElementImageDestinationInit {
  texture: GPUTexture;
  size?: { width: number; height: number };
  origin?: GPUOrigin3D;
  mipLevel?: number;
  aspect?: GPUTextureAspect;
  colorSpace?: PredefinedColorSpace;
  premultipliedAlpha?: boolean;
}

/** WebGPU additions: the current entry point and the legacy name. */
export interface DrawableGPUQueue {
  drawElementImageToTexture?(source: GPUDrawElementImageSourceInit, destination: GPUDrawElementImageDestinationInit): void;
  /** Legacy name used by early builds (see the jelly slider example). */
  copyElementImageToTexture?(...args: unknown[]): void;
}
