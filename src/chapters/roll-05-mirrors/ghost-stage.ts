/**
 * The ghost stage: one drawable button on a 2D canvas, drawn at a pose you
 * pick, with every geometry call the lab offers.
 *
 * native:    real `drawElementImage` (with `preserveElementGeometry`), real
 *            `updateElementGeometry` / `clearElementGeometry`, the real
 *            `getElementTransform`, and the browser's own hit test decides
 *            whether a click reaches the button.
 * simulated: the button is shown at the drawn pose but ignores the pointer;
 *            the pure rules in rules.ts decide where clicks land.
 *
 * Either way a geometry model (rules.ts) runs alongside, to draw the ghost.
 */
import type { Capabilities } from '../../core/capabilities';
import type { DrawableCanvas, Drawable2DContext } from '../../hic/types';
import { h } from '../../ui/dom';
import { createLabCanvas } from '../shared/lab-canvas';
import {
  classifyClick, clearElementGeometry, drawElementImage, EMPTY, getElementTransform, hitArea, hitTest, insideQuad,
  pose, quadOf, updateElementGeometry, type ClickKind, type Geometry, type Matrix16, type Point, type Rect, type Size,
} from './rules';

export interface Pose { fx: number; fy: number; deg: number; scale: number }

export interface StageSnapshot {
  drawn: Matrix16;
  size: Size;
  half: boolean;
  model: Geometry;
  /** What `getElementTransform` reports (the real one in native mode). */
  reported: Matrix16;
  /** Drawn area and hit area, canvas CSS px. */
  drawnQuad: Point[] | null;
  hitQuad: Point[] | null;
  css: Size;
}

export interface StageClick { point: Point; kind: ClickKind }

export interface GhostStage {
  readonly root: HTMLElement;
  readonly native: boolean;
  set(patch: Partial<{ pose: Pose; preserve: boolean; half: boolean; drift: boolean }>): void;
  /** `updateElementGeometry(button, { canvasTransform: drawn })` */
  syncNow(): void;
  /** `updateElementGeometry(button, { canvasClip })`: top half, or the whole box. */
  clip(on: boolean): void;
  clearNow(): void;
  snapshot(): StageSnapshot;
  onUpdate(cb: () => void): void;
  onClick(cb: (click: StageClick) => void): void;
  destroy(): void;
}

const ID = 'button';

/** A 2D DOMMatrix (a..f) in CSS px, like the docs build by hand. */
export function toDOMMatrix(m: Matrix16): DOMMatrix {
  return new DOMMatrix([m[0]!, m[1]!, m[4]!, m[5]!, m[12]!, m[13]!]);
}

export function createGhostStage(host: HTMLElement, caps: Capabilities): GhostStage {
  const lab = createLabCanvas(host, caps, 'The mirror canvas: click the drawn button');
  const button = h('button', { type: 'button', class: 'mirror-target', drawable: true }, 'Polish me');
  lab.adopt(button);
  const canvas = lab.canvas as DrawableCanvas;
  const state = { pose: { fx: 0.06, fy: 0.12, deg: 0, scale: 1 } as Pose, preserve: false, half: false, drift: false };
  let model: Geometry = EMPTY;
  let drawn: Matrix16 = pose(0, 0);
  let css: Size = { width: 1, height: 1 };
  let t = 0;
  let lastTime = performance.now();
  const updates: Array<() => void> = [];
  const clicks: Array<(c: StageClick) => void> = [];
  const size = (): Size => ({ width: button.offsetWidth || 130, height: button.offsetHeight || 44 });
  const halfRect = (): Rect => ({ x: 0, y: 0, width: size().width, height: size().height / 2 });

  const computeDrawn = (): Matrix16 => {
    const rect = lab.canvas.getBoundingClientRect();
    css = { width: rect.width || 1, height: rect.height || 1 };
    const sway = state.drift ? Math.sin(t * 1.4) * Math.min(60, css.width * 0.12) : 0;
    const x = state.pose.fx * css.width + sway;
    const y = state.pose.fy * css.height;
    return pose(x, y, state.pose.deg + (state.drift ? Math.sin(t * 0.9) * 6 : 0), state.pose.scale);
  };

  lab.onPaint(() => {
    const now = performance.now();
    if (state.drift) t += Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    lab.beginFrame();
    drawn = computeDrawn();
    const { width, height } = size();
    if (lab.native) {
      const ctx = lab.ctx as Drawable2DContext;
      const s = lab.scale();
      ctx.save();
      // Translate in grid px; rotation and scale as posed. drawElementImage
      // already draws at the element's default size in grid px.
      ctx.setTransform(drawn[0]!, drawn[1]!, drawn[4]!, drawn[5]!, drawn[12]! * s, drawn[13]! * s);
      const options = { preserveElementGeometry: state.preserve };
      if (state.half) ctx.drawElementImage(button, 0, 0, width, height / 2, 0, 0, options);
      else ctx.drawElementImage(button, 0, 0, options);
      ctx.restore();
    } else {
      button.dataset.drawn = 'true';
      button.style.transform = `matrix(${drawn[0]}, ${drawn[1]}, ${drawn[4]}, ${drawn[5]}, ${drawn[12]}, ${drawn[13]})`;
      button.style.clipPath = state.half ? 'inset(0 0 50% 0)' : '';
    }
    model = drawElementImage(model, ID, drawn, { preserveElementGeometry: state.preserve });
    if (state.drift) lab.requestPaint();
    updates.forEach((cb) => cb());
  });

  lab.root.addEventListener('click', (event) => {
    if (event.detail === 0) return; // keyboard activation: no position to judge
    const rect = lab.canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const snap = api.snapshot();
    const onDrawn = !!snap.drawnQuad && insideQuad(snap.drawnQuad, point);
    const registered = lab.native
      ? event.target instanceof Node && button.contains(event.target)
      : hitTest(model, { [ID]: size() }, point) === ID;
    clicks.forEach((cb) => cb({ point, kind: classifyClick(onDrawn ? ID : null, registered ? ID : null) }));
  });

  const repaint = () => lab.requestPaint();
  const api: GhostStage = {
    root: lab.root,
    native: lab.native,
    set(patch) {
      Object.assign(state, patch);
      lab.simulateChange(button);
      repaint();
    },
    syncNow() {
      canvas.updateElementGeometry?.(button, { canvasTransform: toDOMMatrix(drawn) });
      model = updateElementGeometry(model, ID, { canvasTransform: drawn });
      updates.forEach((cb) => cb());
    },
    clip(on) {
      const rect = on ? halfRect() : { x: 0, y: 0, ...size() };
      canvas.updateElementGeometry?.(button, { canvasClip: rect });
      model = updateElementGeometry(model, ID, { canvasClip: rect });
      updates.forEach((cb) => cb());
    },
    clearNow() {
      canvas.clearElementGeometry?.(button);
      model = clearElementGeometry(model, ID);
      updates.forEach((cb) => cb());
    },
    snapshot() {
      const s = size();
      const has = !!model.transforms[ID];
      const real = lab.native && canvas.getElementTransform ? Array.from(canvas.getElementTransform(button).toFloat64Array()) : null;
      const reported = real ?? getElementTransform(model, ID);
      const area = hitArea(model, ID, s);
      return {
        drawn, size: s, half: state.half, model, reported, css,
        drawnQuad: quadOf(drawn, state.half ? halfRect() : { x: 0, y: 0, ...s }),
        hitQuad: has && real ? quadOf(real, model.clips[ID] ?? { x: 0, y: 0, ...s }) : area,
      };
    },
    onUpdate: (cb) => void updates.push(cb),
    onClick: (cb) => void clicks.push(cb),
    destroy() {
      lab.destroy();
    },
  };
  lab.requestPaint();
  return api;
}
