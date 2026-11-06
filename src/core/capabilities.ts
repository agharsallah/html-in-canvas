/**
 * Feature detection for HTML-in-Canvas.
 *
 * The site runs in two modes:
 *  - "native":    the browser implements the proposal; prints in the 3D
 *                 darkroom are real HTML drawn into WebGL textures.
 *  - "simulated": no support (or `?sim` in the URL); the same HTML is shown
 *                 with CSS 3D transforms so the journey still works.
 */

export type RenderMode = 'native' | 'simulated';

export interface Capabilities {
  mode: RenderMode;
  /** `drawElementImage` on CanvasRenderingContext2D + `requestPaint`. */
  canvas2d: boolean;
  /** `texElementSubImage2D` (or the legacy `texElementImage2D`). */
  webgl: boolean;
  /** WebGL support only through the legacy upload name. */
  webglLegacyOnly: boolean;
  /** `GPUQueue.drawElementImageToTexture`. */
  webgpu: boolean;
  /** `captureElementImage` for handing snapshots to an OffscreenCanvas. */
  elementImage: boolean;
  /** True when `?sim` forced the fallback even though support exists. */
  forcedSimulation: boolean;
}

/** The subset of globals we probe; injectable so detection is unit-testable. */
export interface CapabilityEnv {
  HTMLCanvasElement?: { prototype: object };
  CanvasRenderingContext2D?: { prototype: object };
  WebGL2RenderingContext?: { prototype: object };
  WebGLRenderingContext?: { prototype: object };
  GPUQueue?: { prototype: object };
}

const has = (ctor: { prototype: object } | undefined, key: string): boolean =>
  !!ctor && key in ctor.prototype;

export function detectCapabilities(
  env: CapabilityEnv = globalThis as unknown as CapabilityEnv,
  search = typeof location === 'undefined' ? '' : location.search,
): Capabilities {
  const forced = new URLSearchParams(search).has('sim');

  const canvas2d =
    has(env.HTMLCanvasElement, 'requestPaint') &&
    has(env.CanvasRenderingContext2D, 'drawElementImage');

  const glModern =
    has(env.WebGL2RenderingContext, 'texElementSubImage2D') ||
    has(env.WebGLRenderingContext, 'texElementSubImage2D');
  const glLegacy =
    has(env.WebGL2RenderingContext, 'texElementImage2D') ||
    has(env.WebGLRenderingContext, 'texElementImage2D');

  const webgl = canvas2d && (glModern || glLegacy);
  const native = webgl && !forced;

  return {
    mode: native ? 'native' : 'simulated',
    canvas2d: canvas2d && !forced,
    webgl: native,
    webglLegacyOnly: native && !glModern && glLegacy,
    webgpu: !forced && has(env.GPUQueue, 'drawElementImageToTexture'),
    elementImage: !forced && has(env.HTMLCanvasElement, 'captureElementImage'),
    forcedSimulation: forced && webgl,
  };
}

/**
 * Where to send people who want the real thing. Per the Chrome docs
 * (docs-llm/html-in-canvas-blogs/concepts.md, "Fallback strategies") the
 * API shipped in Chrome 157.
 */
export const ENABLE_HINT = 'Open this page in Chrome 157 or later to see the real API at work.';
