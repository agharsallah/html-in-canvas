/**
 * Feature detection, per context. The `content` reflection check comes from the
 * Chrome docs (fallback strategies); the per-context checks guard each section,
 * because a browser may have the 2D API but not, say, the WebGPU one.
 *
 * `?fallback` in the URL forces the plain-HTML path so you can test it anywhere;
 * `?no-webgpu` skips WebGPU so the 2D path of the Voices section can be tested.
 */
export interface Support {
  /** `<canvas content="drawable">` reflects, and `requestPaint()` exists. */
  html: boolean;
  /** `CanvasRenderingContext2D.drawElementImage`. */
  ctx2d: boolean;
  /** `WebGL2RenderingContext.texElementSubImage2D`. */
  webgl: boolean;
  /** `GPUQueue.drawElementImageToTexture` (an adapter is still checked later). */
  webgpu: boolean;
  /** `captureElementImage` + `OffscreenCanvasRenderingContext2D.drawElementImage`. */
  worker: boolean;
  /** The user asked for the fallback with `?fallback`. */
  forced: boolean;
}

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('content', 'drawable');
  return canvas.content === 'drawable' && typeof canvas.requestPaint === 'function';
}

let cached: Support | null = null;

export function detect(): Support {
  if (cached) return cached;
  const params = new URLSearchParams(location.search);
  const forced = params.has('fallback');
  const html = !forced && supportsHtmlInCanvas();
  const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  cached = {
    forced,
    html,
    ctx2d: html && 'drawElementImage' in CanvasRenderingContext2D.prototype,
    webgl: html && typeof WebGL2RenderingContext !== 'undefined' && 'texElementSubImage2D' in WebGL2RenderingContext.prototype,
    webgpu: html && !params.has('no-webgpu') && 'gpu' in navigator && typeof GPUQueue !== 'undefined' && 'drawElementImageToTexture' in GPUQueue.prototype,
    worker:
      html &&
      'captureElementImage' in proto &&
      'transferControlToOffscreen' in proto &&
      typeof OffscreenCanvasRenderingContext2D !== 'undefined' &&
      'drawElementImage' in OffscreenCanvasRenderingContext2D.prototype,
  };
  return cached;
}
