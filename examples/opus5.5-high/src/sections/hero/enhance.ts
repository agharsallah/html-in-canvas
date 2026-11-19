/**
 * Hero · WebGL.
 *
 * The poster (an <article drawable>) is uploaded into a texture with
 * texElementSubImage2D and shown on a plane that tilts toward the pointer, in
 * front of Bauhaus shapes at different depths. Its sticker ("Get a pass") is a
 * nested drawable: excluded from the poster's snapshot, uploaded on its own,
 * and floated 56px in front of the poster.
 *
 * WebGL can't infer where a texture lands, so each frame we hand
 * updateElementGeometry() a projective 4×4 canvasTransform. That's what keeps
 * the email field, the button and the sticker hoverable, clickable and
 * focusable on a perspective-tilted plane. No raycasting.
 */
import { elementToCanvas, inFront } from '../../hic/geometry';
import { PaintLoop } from '../../hic/loop';
import { mul, perspective, rotationX, rotationY, rotationZ, scaling, translation, type Mat4 } from '../../hic/mat4';
import { observeGrid, type Grid } from '../../hic/sizing';
import { upgradeStage } from '../../hic/stage';
import type { Support } from '../../hic/support';
import { palette } from '../../lib/palette';
import { prefs } from '../../lib/prefs';
import { setup } from './gl';

/** CSS px of ink overflow around the sticker (its hard shadow) to keep in the texture. */
const STICKER_OUTSET = 12;
const FOV = (26 * Math.PI) / 180;

interface Tex {
  el: HTMLElement;
  gl: WebGLTexture;
  width: number;
  height: number;
  outset: number;
  ready: boolean;
}

export function enhanceHero(root: HTMLElement, support: Support): void {
  const stage = root.querySelector<HTMLElement>('[data-stage="hero"]');
  const poster = root.querySelector<HTMLElement>('.poster');
  const sticker = root.querySelector<HTMLElement>('.poster-cta');
  wireForm(root);
  if (!stage || !poster || !sticker) return;
  if (!support.webgl) return cssTilt(root, poster);

  const canvas = upgradeStage(stage);
  canvas.setAttribute('aria-label', 'Festival poster');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl) return;
  const P = setup(gl);

  const makeTex = (el: HTMLElement, outset: number): Tex => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    // Linear filtering reads better than mipmaps for text.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { el, gl: t, width: 0, height: 0, outset, ready: false };
  };
  const texPoster = makeTex(poster, 0);
  const texSticker = makeTex(sticker, STICKER_OUTSET);

  /** Upload a snapshot. Pre-allocates storage once per size, then copies a sub-image. */
  const upload = (t: Tex) => {
    // Size from getElementImageDefaultSize (fractional grid px), never from offsetWidth/Height:
    // those are rounded, and a snapshot 0.3px taller than its texture fails with INVALID_VALUE.
    const size = canvas.getElementImageDefaultSize(t.el); // canvas grid px
    const s = grid?.scaleX ?? 1; // grid px per CSS px
    const cssW = size.width / s, cssH = size.height / s;
    const w = Math.max(1, Math.ceil(size.width + 2 * t.outset * s));
    const h = Math.max(1, Math.ceil(size.height + 2 * t.outset * s));
    gl.bindTexture(gl.TEXTURE_2D, t.gl);
    // Verified in Chrome 157: this flag applies to element uploads. Row 0 = the element's top, matching our v-down UVs.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if (w !== t.width || h !== t.height) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      t.width = w;
      t.height = h;
    }
    if (t.outset) {
      // WebGLCopyElementImageConfig: a source rect with outsets (CSS px) to include the
      // hard shadow outside the border box, rasterized at the texture size we allocated.
      gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, t.el, {
        sx: -t.outset, sy: -t.outset, swidth: cssW + 2 * t.outset, sheight: cssH + 2 * t.outset, width: w, height: h,
      });
    } else {
      // Rasterize into exactly the storage we allocated.
      gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, t.el, { width: w, height: h });
    }
    t.ready = true;
  };

  // ── State ────────────────────────────────────────────────────────────────
  let grid: Grid | null = null;
  let dirty = true;
  const tilt = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  const cam = { x: 0, y: 0, tx: 0, ty: 0 };
  const light = { x: 0.7, y: 0.2 };
  let intro = prefs.reducedMotion ? 1 : 0;
  let firstGeometry = true;

  observeGrid(canvas, (g) => {
    grid = g;
    dirty = true;
  });

  root.addEventListener('pointermove', (e) => {
    if (prefs.reducedMotion || !grid) return;
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    tilt.tx = nx * 0.16;
    tilt.ty = ny * 0.11;
    cam.tx = nx * 28;
    cam.ty = -ny * 20;
    light.x = (nx + 1) / 2;
    light.y = (ny + 1) / 2;
    loop.kick();
  });
  root.addEventListener('pointerleave', () => {
    tilt.tx = tilt.ty = cam.tx = cam.ty = 0;
    loop.kick();
  });
  prefs.subscribe(() => {
    if (prefs.reducedMotion) {
      intro = 1;
      tilt.tx = tilt.ty = cam.tx = cam.ty = 0;
    }
    loop.kick();
  });

  const loop = new PaintLoop(canvas, ({ dt, changed }) => {
    if (!grid) return false;
    // 1 · Upload only what changed (changedElements), or everything after a resize.
    for (const t of [texPoster, texSticker]) if (dirty || !t.ready || changed.includes(t.el)) upload(t);
    dirty = false;

    // 2 · Springs.
    const k = 70, damp = 13;
    const ax = (tilt.tx - tilt.x) * k - tilt.vx * damp;
    const ay = (tilt.ty - tilt.y) * k - tilt.vy * damp;
    tilt.vx += ax * dt; tilt.vy += ay * dt;
    tilt.x += tilt.vx * dt; tilt.y += tilt.vy * dt;
    cam.x += (cam.tx - cam.x) * Math.min(1, dt * 6);
    cam.y += (cam.ty - cam.y) * Math.min(1, dt * 6);
    if (intro < 1) intro = Math.min(1, intro + dt / 1.7);

    // 3 · Camera: at rest, 1 world unit = 1 CSS px on the poster plane, so the texture is shown 1:1.
    const W = grid.cssWidth, H = grid.cssHeight;
    const d = H / 2 / Math.tan(FOV / 2);
    const proj = perspective(FOV, W / H, d * 0.2, d * 4);
    const view = translation(-cam.x, -cam.y, -d);
    const vp = mul(proj, view);

    const pw = poster.offsetWidth, ph = poster.offsetHeight;
    const fit = Math.min(1, (W - 24) / pw, (H * 0.9) / ph);
    const posterModel = mul(translation(0, H * 0.01, 0), rotationX(tilt.y), rotationY(tilt.x), scaling(fit, fit, fit));
    const sw = sticker.offsetWidth, sh = sticker.offsetHeight;
    const scx = sticker.offsetLeft + sw / 2 - pw / 2;
    const scy = ph / 2 - (sticker.offsetTop + sh / 2);
    const stickerModel = mul(posterModel, translation(scx, scy, 56), rotationZ(0.21));

    // 4 · Draw back to front.
    const pal = palette();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const shape = (kind: number, model: Mat4, w: number, h: number, color: [number, number, number], alpha = 1) => {
      gl.useProgram(P.shape);
      gl.uniformMatrix4fv(P.u(P.shape, 'u_mvp'), false, mul(vp, model));
      gl.uniform2f(P.u(P.shape, 'u_size'), w, h);
      gl.uniform1i(P.u(P.shape, 'u_kind'), kind);
      gl.uniform3fv(P.u(P.shape, 'u_color'), color);
      gl.uniform1f(P.u(P.shape, 'u_alpha'), alpha);
      P.drawQuad();
    };
    const R = Math.min(W, H);
    shape(2, mul(translation(-W * 0.2, H * 0.05, -520), rotationZ(-0.32)), R * 0.14, H * 1.6, pal.yellow);
    shape(0, translation(W * 0.3, H * 0.22, -340), R * 0.62, R * 0.62, pal.red);
    shape(1, translation(-W * 0.34, -H * 0.36, -200), R * 0.6, R * 0.3, pal.blue);
    // The poster's hard shadow: a plane behind it, so it parallaxes as the poster tilts.
    shape(2, mul(posterModel, translation(16, -16, -6)), pw, ph, pal.ink);

    const textured = (t: Tex, model: Mat4, w: number, h: number, fx: boolean) => {
      gl.useProgram(P.tex);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, t.gl);
      gl.uniform1i(P.u(P.tex, 'u_tex'), 0);
      gl.uniformMatrix4fv(P.u(P.tex, 'u_mvp'), false, mul(vp, model));
      gl.uniform2f(P.u(P.tex, 'u_size'), w, h);
      gl.uniform1f(P.u(P.tex, 'u_fx'), fx ? 1 : 0);
      gl.uniform1f(P.u(P.tex, 'u_intro'), intro);
      gl.uniform2f(P.u(P.tex, 'u_shift'), clamp(tilt.vx * 0.006, 0.012), clamp(-tilt.vy * 0.006, 0.012));
      gl.uniform2f(P.u(P.tex, 'u_light'), light.x, light.y);
      gl.uniform2f(P.u(P.tex, 'u_px'), t.width, t.height);
      gl.uniform3fv(P.u(P.tex, 'u_paper'), pal.paper);
      gl.uniform3fv(P.u(P.tex, 'u_plate'), pal.blue);
      P.drawQuad();
    };
    textured(texPoster, posterModel, pw, ph, true);
    textured(texSticker, stickerModel, sw + 2 * STICKER_OUTSET, sh + 2 * STICKER_OUTSET, false);

    // 5 · Tell the DOM where everything went (CSS px, projective).
    const viewport = { width: W, height: H };
    const posterM = elementToCanvas(mul(vp, posterModel), { width: pw, height: ph }, viewport);
    const stickerM = elementToCanvas(mul(vp, stickerModel), { width: sw, height: sh }, viewport);
    if (inFront(posterM, { width: pw, height: ph })) {
      if (firstGeometry) {
        // First time: poster, then sticker, so the sticker ends on top of the hit-test stack.
        canvas.updateElementGeometry(poster, { canvasTransform: posterM });
        canvas.updateElementGeometry(sticker, { canvasTransform: stickerM });
        firstGeometry = false;
      } else {
        // Afterwards the sticker is updated first; the poster keeps its place below it.
        canvas.updateElementGeometry(sticker, { canvasTransform: stickerM });
        canvas.updateElementGeometry(poster, { canvasTransform: posterM, preserveHitTestOrder: true });
      }
    }

    const moving = Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y) + Math.abs(tilt.vx) + Math.abs(tilt.vy) > 0.0004 ||
      Math.abs(cam.tx - cam.x) + Math.abs(cam.ty - cam.y) > 0.05;
    return moving || intro < 1;
  });
}

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

/** Signup: client-side demo unless site.config sets an action. The note change repaints the poster. */
function wireForm(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('.poster-form');
  if (!form || form.getAttribute('action')) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const note = form.querySelector<HTMLElement>('.poster-note');
    if (!input || !note) return;
    if (!input.checkValidity()) {
      note.textContent = 'That email doesn’t look right yet.';
      note.classList.remove('is-ok');
      input.focus();
      return;
    }
    note.textContent = form.dataset.thanks ?? 'Thanks!';
    note.classList.add('is-ok');
    input.value = '';
  });
}

/** Fallback: the same poster, tilted with CSS 3D. */
function cssTilt(root: HTMLElement, poster: HTMLElement): void {
  root.addEventListener('pointermove', (e) => {
    if (prefs.reducedMotion) return;
    const r = root.getBoundingClientRect();
    poster.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width) * 2 - 1) * 7}deg`);
    poster.style.setProperty('--rx', `${-(((e.clientY - r.top) / r.height) * 2 - 1) * 5}deg`);
  });
  root.addEventListener('pointerleave', () => {
    poster.style.setProperty('--ry', '0deg');
    poster.style.setProperty('--rx', '0deg');
  });
}
