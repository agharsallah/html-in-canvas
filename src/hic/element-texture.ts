/**
 * ElementTexture — uploads a `drawable` element's snapshot into a WebGL
 * texture that three.js can sample.
 *
 * Why not three's built-in `HTMLTexture`? It only knows the legacy
 * `texElementImage2D` entry point and overwrites `canvas.onpaint`. Here we:
 *   1. own the GL texture and hand it to three via `ExternalTexture`,
 *   2. allocate storage with `getElementImageDefaultSize()` + texImage2D(null),
 *   3. copy the snapshot with `texElementSubImage2D()` (legacy fallback kept),
 *   4. call `renderer.resetState()` so three's GL state cache stays honest.
 */
import { ExternalTexture, type WebGLRenderer } from 'three';
import type { DrawableCanvas, DrawableWebGL } from './types';

type GL = WebGL2RenderingContext & DrawableWebGL;

export class ElementTexture {
  readonly texture: ExternalTexture;
  private readonly gl: GL;
  private readonly glTexture: WebGLTexture;
  private width = 0;
  private height = 0;
  /** Set when an upload failed (e.g. no snapshot recorded yet); retried next paint. */
  private pending = true;

  constructor(
    private readonly renderer: WebGLRenderer,
    readonly element: HTMLElement,
  ) {
    this.gl = renderer.getContext() as GL;
    const tex = this.gl.createTexture();
    if (!tex) throw new Error('ElementTexture: could not create a WebGL texture');
    this.glTexture = tex;
    this.texture = new ExternalTexture(tex);
  }

  /** True when the texture still needs a successful upload. */
  get needsUpload(): boolean {
    return this.pending;
  }

  /** Request an upload on the next paint, regardless of changedElements. */
  invalidate(): void {
    this.pending = true;
  }

  /**
   * Copy the element's latest snapshot. Call this from a `paint` event.
   * Returns false when the browser had no snapshot to give us yet.
   */
  upload(): boolean {
    const { gl } = this;
    const canvas = gl.canvas as DrawableCanvas;
    try {
      gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
      // Same orientation trick as the official WebGL demo: flip rows so the
      // element's top edge lands at v = 1 like any other three.js texture.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      if (typeof gl.texElementSubImage2D === 'function') {
        this.uploadModern(canvas);
      } else {
        this.uploadLegacy();
      }
      this.pending = false;
      return true;
    } catch {
      this.pending = true;
      return false;
    } finally {
      // We touched GL state behind three's back.
      this.renderer.resetState();
    }
  }

  private uploadModern(canvas: DrawableCanvas): void {
    const { gl, element } = this;
    const size = canvas.getElementImageDefaultSize?.(element) ?? {
      width: Math.round(element.offsetWidth * devicePixelRatio),
      height: Math.round(element.offsetHeight * devicePixelRatio),
    };
    const w = Math.max(1, Math.ceil(size.width));
    const h = Math.max(1, Math.ceil(size.height));
    if (w !== this.width || h !== this.height) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.width = w;
      this.height = h;
    }
    gl.texElementSubImage2D!(gl.TEXTURE_2D, 0, 0, 0, element);
  }

  /** Early builds: texElementImage2D(target, internalformat, el) or the 6-arg form. */
  private uploadLegacy(): void {
    const { gl, element } = this;
    const legacy = gl.texElementImage2D;
    if (typeof legacy !== 'function') throw new Error('No element upload API');
    if (legacy.length === 3) {
      legacy.call(gl, gl.TEXTURE_2D, gl.RGBA8, element);
    } else {
      legacy.call(gl, gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, element);
    }
  }

  dispose(): void {
    this.gl.deleteTexture(this.glTexture);
    this.texture.dispose();
  }
}
