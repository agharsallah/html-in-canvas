/**
 * The lab's satellite: a live form on the face of a 3D satellite.
 *
 * native:    the MiniStage canvas becomes the drawable host and the form its
 *            drawable child. Uploads happen in `paint` (gated on
 *            changedElements), then geometry is synced with
 *            `updateElementGeometry` so the browser itself hit-tests the
 *            tilted face. The face turned away gets `inert`, like the
 *            official flip card.
 * simulated: the form sits in the side panel; a stand-in texture is painted
 *            from its live layout, and canvas clicks are mapped back through
 *            the same matrix with `hitThrough` and forwarded to the control.
 */
import type { Capabilities } from '../../core/capabilities';
import { onPaint } from '../../hic/paint';
import { elementToCanvasMatrix, projectElementPoint, type Matrix16 } from '../../hic/projective-geometry';
import { isDrawableCanvas, makeDrawableHost } from '../../hic/types';
import { s } from '../../ui/charts/svg';
import { createOrbitScene, type OrbitColors, type OrbitMotion } from '../../scenes/orbit-scene';
import { createNativeTexture, createSimTexture, type Knobs, type UploadReport } from './lab-texture';
import { flatMatrix, hitThrough, shouldUpload, type ControlBox, type HitMode } from './rules';

export type UploadReason = 'first' | 'changed' | 'unchanged';

export interface Probe {
  /** What the click reached: a control id, 'card', or 'canvas'. */
  target: string;
  /** Human-readable description of the element that was hit. */
  text: string;
  backFacing: boolean;
  mode: HitMode;
}

export interface SatelliteOptions {
  caps: Capabilities;
  colors: OrbitColors;
  form: HTMLElement;
  /** Control boxes in element CSS px (measured live). */
  controls(): ControlBox[];
  onUpload(report: UploadReport, reason: UploadReason): void;
  onProbe(probe: Probe): void;
}

export interface Satellite {
  readonly native: boolean;
  readonly api: string;
  knobs: Knobs;
  onlyChanged: boolean;
  hitMode: HitMode;
  setMotion(motion: OrbitMotion): void;
  /** Simulated mode: the form changed (input, focus). */
  markChanged(): void;
  destroy(): void;
}

export function mountSatellite(host: HTMLElement, opts: SatelliteOptions): Satellite {
  const { form } = opts;
  const scene = createOrbitScene(host, opts.colors, 'lab');
  const { stage } = scene;
  const canvas = stage.canvas;
  const native = opts.caps.webgl && isDrawableCanvas(canvas);
  const cleanups: Array<() => void> = [];

  if (native) {
    canvas.removeAttribute('role'); // role=img would hide the form from assistive tech
    canvas.setAttribute('aria-label', 'Satellite canvas with a live form');
    makeDrawableHost(canvas);
    form.setAttribute('drawable', '');
    canvas.append(form);
  }
  const tex = native ? createNativeTexture(stage.renderer, form) : createSimTexture(form);
  let mapped = false;
  let pending = true;
  let matrix: Matrix16 | null = null;
  let sent: Matrix16 | null = null;
  let facing = true;
  let motion: OrbitMotion = 'sway';

  const state: Satellite = {
    native,
    api: tex.api,
    knobs: { flipY: true, preallocate: true, mipmaps: false },
    onlyChanged: true,
    hitMode: 'projective',
    setMotion(next) {
      motion = next;
      scene.setMotion(next);
    },
    markChanged() {
      pending = true;
      stage.invalidate();
    },
    destroy() {
      cleanups.forEach((fn) => fn());
      if (native) canvas.clearElementGeometry?.(form);
      tex.dispose();
      scene.destroy();
    },
  };

  const size = () => ({ width: Math.max(1, form.offsetWidth), height: Math.max(1, form.offsetHeight) });

  const upload = (changed: boolean) => {
    if (!shouldUpload({ onlyChanged: state.onlyChanged, changed, neverUploaded: !mapped, sizeChanged: false })) return;
    const reason: UploadReason = !mapped ? 'first' : changed ? 'changed' : 'unchanged';
    const report = tex.upload(state.knobs);
    if (report.ok && !mapped) {
      scene.setMap(tex.texture);
      mapped = true;
    }
    if (report.ok && reason !== 'unchanged') scene.pulse();
    opts.onUpload(report, reason);
  };

  /** The matrix the DOM is told, per hit mode. 'off' leaves the last one. */
  const syncGeometry = () => {
    if (state.hitMode !== 'off' && matrix) sent = state.hitMode === 'flat' ? flatMatrix(matrix, size()) : matrix;
    if (!native) return;
    form.inert = !facing;
    if (state.hitMode !== 'off' && sent && isDrawableCanvas(canvas) && canvas.updateElementGeometry) {
      canvas.updateElementGeometry(form, { canvasTransform: new DOMMatrix(sent) });
    }
  };

  // ---- hit region overlay: what the DOM believes the element covers
  const outline = s('polygon', { class: 'sat-hit' });
  const overlay = s('svg', { class: 'sat-overlay', 'aria-hidden': 'true' }, outline);
  stage.el.append(overlay);

  stage.onFrame(() => {
    const viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
    overlay.setAttribute('viewBox', `0 0 ${viewport.width} ${viewport.height}`);
    matrix = elementToCanvasMatrix({ objectMatrixWorld: scene.face.matrixWorld, camera: stage.camera, plane: scene.plane, element: size(), viewport });
    facing = scene.facingCamera();
    if (native) {
      // Moving faces need fresh geometry every frame; paint is where we sync it.
      if (isDrawableCanvas(canvas) && (motion !== 'still' || !state.onlyChanged || pending)) canvas.requestPaint();
    } else {
      if (pending || !state.onlyChanged || !mapped) upload(pending);
      pending = false;
      syncGeometry();
    }
    const { width, height } = size();
    const shown = sent ?? null;
    outline.setAttribute('points', shown
      ? [[0, 0], [width, 0], [width, height], [0, height]].map(([u, v]) => {
        const p = projectElementPoint(shown, u!, v!);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      }).join(' ')
      : '');
    outline.dataset.mode = state.hitMode;
    outline.dataset.facing = String(facing);
    return true;
  });

  if (native && isDrawableCanvas(canvas)) {
    cleanups.push(onPaint(canvas, (changed) => {
      upload(changed.includes(form) || pending);
      pending = false;
      syncGeometry();
      stage.invalidate();
    }));
    canvas.requestPaint();
    // The browser hit-tests for us; we only report what it found.
    const probe = (event: PointerEvent) => {
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const control = hit?.closest<HTMLElement>('[data-control]');
      const target = control?.dataset.control ?? (hit && form.contains(hit) ? 'card' : 'canvas');
      opts.onProbe({ target, text: describe(hit), backFacing: !facing, mode: state.hitMode });
    };
    stage.el.addEventListener('pointerdown', probe, true);
    cleanups.push(() => stage.el.removeEventListener('pointerdown', probe, true));
  } else {
    const click = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const result = hitThrough(facing ? sent : null, size(), opts.controls(), event.clientX - rect.left, event.clientY - rect.top);
      const target = result.target === 'space' ? 'canvas' : result.target;
      const control = form.querySelector<HTMLElement>(`[data-control="${target}"]`);
      if (control) {
        event.preventDefault();
        control.focus({ preventScroll: true });
        if (control instanceof HTMLInputElement) control.setSelectionRange(control.value.length, control.value.length);
        if (control instanceof HTMLButtonElement) control.click();
      }
      opts.onProbe({ target, text: control ? describe(control) : target === 'card' ? describe(form) : '<canvas>', backFacing: !facing, mode: state.hitMode });
      state.markChanged();
    };
    canvas.addEventListener('pointerdown', click);
    cleanups.push(() => canvas.removeEventListener('pointerdown', click));
  }
  return state;
}

function describe(el: Element | null): string {
  if (!el) return 'nothing';
  const id = el.id ? `#${el.id}` : '';
  return `<${el.tagName.toLowerCase()}${id}>`;
}
