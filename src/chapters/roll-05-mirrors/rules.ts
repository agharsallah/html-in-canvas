/**
 * The rules of the mirror maze, as pure functions: a model of how a
 * `content="drawable"` canvas keeps element geometry and hit-tests clicks.
 * The simulated lab, the trial and the unit tests all run on it.
 *
 * README.md, "5. Synchronizing the DOM and drawing" and the IDL:
 *  - Drawn children start with no geometry and are not hit testable (R:26).
 *  - `updateElementGeometry(el, { canvasTransform, canvasClip, preserveHitTestOrder })`
 *    sets a transform that maps the border box (CSS px) to the canvas (CSS px).
 *    Omitted fields keep their previous value (IDL comments).
 *  - preserveHitTestOrder: "If this is true and the element is already in the
 *    canvas's hit testing stack, do nothing. In all other cases, place the
 *    element at the top" (IDL comment).
 *  - 2D `drawElementImage` runs `updateElementGeometry` with the drawn
 *    transform, unless `{ preserveElementGeometry: true }` (R:49, R:162-168).
 *  - `clearElementGeometry` clears that state; the element leaves hit testing
 *    and is marked offscreen (R:47; Chrome docs, concepts.md "Reset geometry").
 *  - `getElementTransform` returns the transform, or identity when none (R:126-130).
 *  - Hit testing walks the stack from the top, straight from the canvas to
 *    each descendant (R:43).
 *
 * Assumption, labelled in the UI: `canvasClip` is read in element-local CSS px
 * (the space `canvasTransform` maps from). The README leaves the direction open.
 *
 * Matrices are 16 numbers, column-major, exactly what `new DOMMatrix(array)`
 * and CSS `matrix3d()` take. 2D affine matrices are the special case.
 */
import { projectElementPoint, type Matrix16 } from '../../hic/projective-geometry';

export type { Matrix16 };
export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }
export interface Size { width: number; height: number }

export const IDENTITY: Matrix16 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** A 2D affine matrix (DOMMatrix a..f) as 16 numbers. */
export function affine(a: number, b: number, c: number, d: number, e: number, f: number): Matrix16 {
  return [a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, e, f, 0, 1];
}

/** translate(x, y) · rotate(deg) · scale(s): what a 2D context transform does. */
export function pose(x: number, y: number, deg = 0, scale = 1): Matrix16 {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r) * scale;
  const sin = Math.sin(r) * scale;
  return affine(cos, sin, -sin, cos, x, y);
}

/** Read the 2D part back as DOMMatrix-style a..f. */
export function toAffine(m: Matrix16): { a: number; b: number; c: number; d: number; e: number; f: number } {
  return { a: m[0]!, b: m[1]!, c: m[4]!, d: m[5]!, e: m[12]!, f: m[13]! };
}

/** Is the matrix purely 2D (no perspective, no z)? */
export function is2D(m: Matrix16): boolean {
  return m[2] === 0 && m[3] === 0 && m[6] === 0 && m[7] === 0 && m[8] === 0 && m[9] === 0
    && m[10] === 1 && m[11] === 0 && m[14] === 0 && m[15] === 1;
}

/** Corners of an element-local rect mapped to the canvas (CSS px), clockwise. Null if any corner is behind the camera. */
export function quadOf(m: Matrix16, rect: Rect): Point[] | null {
  const corners: Array<[number, number]> = [
    [rect.x, rect.y], [rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y + rect.height], [rect.x, rect.y + rect.height],
  ];
  const out: Point[] = [];
  for (const [u, v] of corners) {
    const p = projectElementPoint(m, u, v);
    if (p.w <= 0) return null;
    out.push({ x: p.x, y: p.y });
  }
  return out;
}

/** Point inside a convex quad (either winding). Edges count as inside. */
export function insideQuad(quad: readonly Point[], p: Point): boolean {
  let sign = 0;
  for (let i = 0; i < quad.length; i++) {
    const a = quad[i]!;
    const b = quad[(i + 1) % quad.length]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < 1e-9) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

// ------------------------------------------------------------ geometry state

export interface Geometry {
  /** Canvas transform per element id; absent = no geometry. */
  transforms: Record<string, Matrix16>;
  /** Hit-test clip per element id, element-local CSS px. */
  clips: Record<string, Rect>;
  /** Hit-test stack, bottom first: the last id is the topmost click target. */
  stack: string[];
}

export const EMPTY: Geometry = { transforms: {}, clips: {}, stack: [] };

export interface UpdateOptions {
  canvasTransform?: Matrix16;
  canvasClip?: Rect;
  preserveHitTestOrder?: boolean;
}

export function updateElementGeometry(g: Geometry, id: string, options: UpdateOptions = {}): Geometry {
  const transforms = options.canvasTransform ? { ...g.transforms, [id]: options.canvasTransform } : g.transforms;
  const clips = options.canvasClip ? { ...g.clips, [id]: options.canvasClip } : g.clips;
  const inStack = g.stack.includes(id);
  const stack = options.preserveHitTestOrder && inStack ? g.stack : [...g.stack.filter((s) => s !== id), id];
  return { transforms, clips, stack };
}

export function clearElementGeometry(g: Geometry, id: string): Geometry {
  const { [id]: _t, ...transforms } = g.transforms;
  const { [id]: _c, ...clips } = g.clips;
  return { transforms, clips, stack: g.stack.filter((s) => s !== id) };
}

/** 2D drawElementImage: draws, and syncs geometry unless told not to. */
export function drawElementImage(g: Geometry, id: string, drawn: Matrix16, { preserveElementGeometry = false } = {}): Geometry {
  return preserveElementGeometry ? g : updateElementGeometry(g, id, { canvasTransform: drawn });
}

export function getElementTransform(g: Geometry, id: string): Matrix16 {
  return g.transforms[id] ?? IDENTITY;
}

/** The area that answers clicks for `id`, or null when it has no geometry. */
export function hitArea(g: Geometry, id: string, size: Size): Point[] | null {
  const m = g.transforms[id];
  if (!m) return null;
  return quadOf(m, g.clips[id] ?? { x: 0, y: 0, ...size });
}

/** Which element gets a click at `p` (CSS px on the canvas), or null for the canvas itself. */
export function hitTest(g: Geometry, sizes: Record<string, Size>, p: Point): string | null {
  for (let i = g.stack.length - 1; i >= 0; i--) {
    const id = g.stack[i]!;
    const size = sizes[id];
    const area = size ? hitArea(g, id, size) : null;
    if (area && insideQuad(area, p)) return id;
  }
  return null;
}

/** Hit-test stack position counted from the top (1 = topmost), or 0 when absent. */
export function stackRank(g: Geometry, id: string): number {
  const i = g.stack.indexOf(id);
  return i < 0 ? 0 : g.stack.length - i;
}

// -------------------------------------------------------------- paint calls

export type Call =
  | { kind: 'draw'; id: string; matrix: Matrix16; preserveElementGeometry?: boolean }
  | { kind: 'update'; id: string; options: UpdateOptions }
  | { kind: 'clear'; id: string };

export function applyCall(g: Geometry, call: Call): Geometry {
  switch (call.kind) {
    case 'draw': return drawElementImage(g, call.id, call.matrix, { preserveElementGeometry: call.preserveElementGeometry });
    case 'update': return updateElementGeometry(g, call.id, call.options);
    case 'clear': return clearElementGeometry(g, call.id);
  }
}

/** Run the same paint handler `frames` times, as a canvas does over several updates. */
export function runPaints(start: Geometry, calls: readonly Call[], frames = 3): Geometry {
  let g = start;
  for (let f = 0; f < frames; f++) for (const call of calls) g = applyCall(g, call);
  return g;
}

// ------------------------------------------------------------ click verdicts

export type ClickKind = 'hit' | 'missed' | 'ghost' | 'empty';

/**
 * Classify a click by where it landed visually (`drawnId`: the element the
 * learner saw under the pointer, or null) and who the DOM says got it.
 */
export function classifyClick(drawnId: string | null, registeredId: string | null): ClickKind {
  if (drawnId && registeredId === drawnId) return 'hit';
  if (drawnId) return 'missed';
  return registeredId ? 'ghost' : 'empty';
}

/** grid px to CSS px: what `updateElementGeometry` expects for a translation drawn in grid px. */
export function gridToCss(value: number, scale: number): number {
  return value / scale;
}
