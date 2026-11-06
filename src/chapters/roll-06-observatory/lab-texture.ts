/**
 * The lab's texture pipeline, in two flavours behind one interface.
 *
 * native:    a raw WebGL texture filled with `texElementSubImage2D` (legacy
 *            `texElementImage2D` as fallback), exactly like
 *            hic/element-texture.ts, but with the knobs the lab exposes:
 *            UNPACK_FLIP_Y_WEBGL, pre-allocation and LINEAR vs mipmaps.
 * simulated: an element stand-in painted on a 2D canvas (scenes/element-standin),
 *            with the same knobs mapped onto three.js texture settings.
 */
import { ExternalTexture, LinearFilter, LinearMipmapLinearFilter, type Texture, type WebGLRenderer } from 'three';
import type { DrawableCanvas, DrawableWebGL } from '../../hic/types';
import { createStandIn, type StandIn } from '../../scenes/element-standin';
import { needsAllocation, textureBytes } from './rules';

export interface Knobs {
  flipY: boolean;
  preallocate: boolean;
  mipmaps: boolean;
}

export interface UploadReport {
  ok: boolean;
  allocated: boolean;
  bytes: number;
  api: string;
  error?: string;
}

export interface LabTexture {
  readonly texture: Texture;
  readonly api: string;
  upload(knobs: Knobs): UploadReport;
  dispose(): void;
}

type GL = WebGL2RenderingContext & DrawableWebGL;

export function createNativeTexture(renderer: WebGLRenderer, element: HTMLElement): LabTexture {
  const gl = renderer.getContext() as GL;
  const canvas = gl.canvas as DrawableCanvas;
  const glTexture = gl.createTexture()!;
  const texture = new ExternalTexture(glTexture);
  const modern = typeof gl.texElementSubImage2D === 'function';
  const api = modern ? 'texElementSubImage2D' : 'texElementImage2D (legacy)';
  let size = { width: 0, height: 0 };

  return {
    texture,
    api,
    upload(knobs) {
      let allocated = false;
      try {
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, knobs.flipY);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, knobs.mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const natural = canvas.getElementImageDefaultSize?.(element) ?? { width: element.offsetWidth * devicePixelRatio, height: element.offsetHeight * devicePixelRatio };
        const w = Math.max(1, Math.ceil(natural.width));
        const h = Math.max(1, Math.ceil(natural.height));
        const sizeChanged = w !== size.width || h !== size.height;
        if (modern) {
          if (needsAllocation({ preallocate: knobs.preallocate, allocated: size.width > 0, sizeChanged })) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            allocated = true;
          }
          gl.texElementSubImage2D!(gl.TEXTURE_2D, 0, 0, 0, element);
        } else {
          // The legacy call allocated storage itself, every time.
          const legacy = gl.texElementImage2D!;
          if (legacy.length === 3) legacy.call(gl, gl.TEXTURE_2D, gl.RGBA8, element);
          else legacy.call(gl, gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, element);
          allocated = true;
        }
        if (knobs.mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
        size = { width: w, height: h };
        return { ok: true, allocated, bytes: textureBytes(w, h), api };
      } catch (error) {
        return { ok: false, allocated, bytes: 0, api, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
      } finally {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        renderer.resetState();
      }
    },
    dispose() {
      gl.deleteTexture(glTexture);
      texture.dispose();
    },
  };
}

export function createSimTexture(element: HTMLElement): LabTexture {
  const standIn: StandIn = createStandIn(element);
  let allocatedOnce = false;
  let last = { width: 0, height: 0 };
  return {
    texture: standIn.texture,
    api: 'stand-in (simulated)',
    upload(knobs) {
      const bytes = standIn.paint();
      const { width, height } = standIn.canvas;
      const sizeChanged = width !== last.width || height !== last.height;
      const allocated = needsAllocation({ preallocate: knobs.preallocate, allocated: allocatedOnce, sizeChanged });
      allocatedOnce = true;
      last = { width, height };
      const t = standIn.texture;
      t.flipY = knobs.flipY;
      t.generateMipmaps = knobs.mipmaps;
      t.minFilter = knobs.mipmaps ? LinearMipmapLinearFilter : LinearFilter;
      t.needsUpdate = true;
      return { ok: true, allocated, bytes, api: 'stand-in (simulated)' };
    },
    dispose: () => standIn.dispose(),
  };
}
