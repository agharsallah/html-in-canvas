/**
 * The rules of the projector, as pure functions. They drive the lab's code
 * readout, the trial's scoring and the unit tests.
 *
 * Chrome docs, 2d.md (overload table):
 *  - (el, dx, dy)                      whole element at its default size
 *  - (el, dx, dy, dw, dh)              whole element scaled into dw × dh
 *  - (el, sx, sy, sw, sh, dx, dy)      the sw × sh area, at that area's default size
 *  - (el, sx, sy, sw, sh, dx, dy, dw, dh)  the area, mapped to the destination rect
 * Chrome docs, concepts.md (units table):
 *  - sx, sy, sw, sh are CSS px; dx, dy, dw, dh are canvas grid px.
 * The default size is the CSS size converted to grid px: CSS px × scale,
 * where scale = canvas grid px per CSS px (concepts.md centering recipe).
 * The context's current transform (ctx.rotate) applies to the draw.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

/** Overloads named by their argument count, element included (2d.md). */
export type ArgCount = 3 | 5 | 7 | 9;
export const ARG_COUNTS: readonly ArgCount[] = [3, 5, 7, 9];

export interface DrawCall {
  args: ArgCount;
  /** Source rect, CSS px. Used by the 7- and 9-argument forms. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Destination, canvas grid px. dw/dh only in the 5- and 9-argument forms. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  /** Degrees passed to ctx.rotate() before drawing (0 = none). */
  rotate: number;
}

export const usesSource = (args: ArgCount): boolean => args >= 7;
export const usesSize = (args: ArgCount): boolean => args === 5 || args === 9;

export function overloadFor(crop: boolean, resize: boolean): ArgCount {
  if (crop) return resize ? 9 : 7;
  return resize ? 5 : 3;
}

export interface Projection {
  /** The part of the element that is drawn, CSS px (border-box origin). */
  source: Rect;
  /** Where it lands, canvas grid px, in the context's rotated frame. */
  dest: Rect;
  rotate: number;
}

/** What a call actually draws, for an element of `el` CSS px and a grid of `scale` grid px per CSS px. */
export function project(call: DrawCall, el: Size, scale: number): Projection {
  const source = usesSource(call.args) ? { x: call.sx, y: call.sy, w: call.sw, h: call.sh } : { x: 0, y: 0, w: el.w, h: el.h };
  const size = usesSize(call.args) ? { w: call.dw, h: call.dh } : { w: source.w * scale, h: source.h * scale };
  return { source, dest: { x: call.dx, y: call.dy, ...size }, rotate: call.rotate };
}

/** The numbers after the element, in order. */
export function argList(call: DrawCall): number[] {
  const src = [call.sx, call.sy, call.sw, call.sh];
  const pos = [call.dx, call.dy];
  const size = [call.dw, call.dh];
  switch (call.args) {
    case 3: return pos;
    case 5: return [...pos, ...size];
    case 7: return [...src, ...pos];
    case 9: return [...src, ...pos, ...size];
  }
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

/** The exact JavaScript a call corresponds to. */
export function formatCall(call: DrawCall, element = 'ticket'): string {
  const draw = `ctx.drawElementImage(${[element, ...argList(call).map(fmt)].join(', ')});`;
  return call.rotate ? `ctx.rotate(${fmt(call.rotate)} * Math.PI / 180);\n${draw}` : draw;
}

// ---------------------------------------------------------------- judging

export interface Tolerance {
  /** Allowed error on the source rect, CSS px. */
  css: number;
  /** Allowed error on the destination rect, canvas grid px. */
  grid: number;
}

export const TOLERANCE: Tolerance = { css: 1, grid: 2 };

export interface Verdict {
  matches: boolean;
  sourceOk: boolean;
  destOk: boolean;
  rotateOk: boolean;
  hint: string;
}

const near = (a: Rect, b: Rect, tol: number) =>
  Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol && Math.abs(a.w - b.w) <= tol && Math.abs(a.h - b.h) <= tol;
const times = (r: Rect, k: number): Rect => ({ x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k });

export function judge(attempt: DrawCall, target: DrawCall, el: Size, scale: number, tol: Tolerance = TOLERANCE): Verdict {
  const got = project(attempt, el, scale);
  const want = project(target, el, scale);
  const full: Rect = { x: 0, y: 0, w: el.w, h: el.h };
  const sourceOk = near(got.source, want.source, tol.css);
  const rotateOk = Math.abs(got.rotate - want.rotate) < 0.5;
  const destOk = near(got.dest, want.dest, tol.grid);
  const verdict = (hint: string): Verdict => ({ matches: sourceOk && destOk && rotateOk, sourceOk, destOk, rotateOk, hint });

  if (!sourceOk) {
    if (usesSource(attempt.args) && near(got.source, times(want.source, scale), tol.css)) {
      return verdict('Your source rect is in canvas grid px. Source rects are CSS px: divide by the scale.');
    }
    const reachesOut = want.source.x < 0 || want.source.y < 0 || want.source.x + want.source.w > el.w || want.source.y + want.source.h > el.h;
    if (!usesSource(attempt.args) && reachesOut) {
      return verdict('The target shows ink beyond the border box. Without a source rect you only get the border box: outset it with a source rect (negative sx, sy).');
    }
    if (!usesSource(attempt.args)) return verdict('The target shows only part of the ticket. Crop it with a source rect (the 7- or 9-argument form).');
    if (near(want.source, full, tol.css) && !near(got.source, full, tol.css)) return verdict('The target shows the whole ticket. Drop the crop, or make it cover the whole border box.');
    return verdict('The wrong part of the ticket is showing. Adjust sx, sy, sw and sh (CSS px).');
  }
  if (!rotateOk) return verdict('The reel is still crooked. Match the rotation the target was drawn with.');
  if (!destOk) {
    const halfway = times(want.dest, 1 / scale);
    const posInCss = Math.abs(got.dest.x - halfway.x) <= tol.grid && Math.abs(got.dest.y - halfway.y) <= tol.grid && (want.dest.x !== 0 || want.dest.y !== 0);
    const sizeInCss = usesSize(attempt.args) && Math.abs(got.dest.w - halfway.w) <= tol.grid && Math.abs(got.dest.h - halfway.h) <= tol.grid;
    if (posInCss || sizeInCss) {
      return verdict('Your destination is in CSS px. dx, dy, dw and dh are canvas grid px: multiply by the scale.');
    }
    const sizeOk = Math.abs(got.dest.w - want.dest.w) <= tol.grid && Math.abs(got.dest.h - want.dest.h) <= tol.grid;
    if (!sizeOk && !usesSize(attempt.args)) {
      return verdict(`At its default size this draws ${fmt(got.dest.w)} × ${fmt(got.dest.h)} grid px, but the target is ${fmt(want.dest.w)} × ${fmt(want.dest.h)}. Give a destination width and height.`);
    }
    if (!sizeOk) return verdict(`Right part, wrong size: the target is ${fmt(want.dest.w)} × ${fmt(want.dest.h)} grid px.`);
    return verdict(`Right size, wrong place: off by ${fmt(got.dest.x - want.dest.x)}, ${fmt(got.dest.y - want.dest.y)} grid px.`);
  }
  return verdict('Dead on. The reel runs true.');
}

// ---------------------------------------------------------------- the trial

/** The trial's ticket: 200 × 100 CSS px with a 10 px glow (ink overflow) around it. */
export const TICKET: Size = { w: 200, h: 100 };
export const TICKET_GLOW = 10;
/** The trial's canvas: 300 × 150 CSS px, sized to a 600 × 300 grid (2 grid px per CSS px). */
export const SCREEN: Size = { w: 600, h: 300 };
export const SCALE = 2;

export interface Round {
  id: string;
  title: string;
  brief: string;
  /** The framing to reproduce, given as one call that produces it. */
  target: DrawCall;
  /** The Crooked Reel's broken call the round starts from. */
  crooked: DrawCall;
  /** Whether the rotate control is offered. */
  rotates?: boolean;
}

export const call = (args: ArgCount, n: Partial<Omit<DrawCall, 'args'>>): DrawCall =>
  ({ args, sx: 0, sy: 0, sw: TICKET.w, sh: TICKET.h, dx: 0, dy: 0, dw: TICKET.w * SCALE, dh: TICKET.h * SCALE, rotate: 0, ...n });

export const ROUNDS: readonly Round[] = [
  { id: 'thread', title: 'Thread the reel', brief: 'The whole ticket, at its default size, with its top-left corner at grid (100, 50).',
    target: call(3, { dx: 100, dy: 50 }), crooked: call(3, { dx: 50, dy: 25 }) },
  { id: 'letterbox', title: 'Letterbox', brief: 'The whole ticket squeezed into a 560 × 100 grid-px strip at (20, 100).',
    target: call(5, { dx: 20, dy: 100, dw: 560, dh: 100 }), crooked: call(3, { dx: 20, dy: 100 }) },
  { id: 'stub', title: 'Tear the stub', brief: 'Only the stub (the right 60 CSS px of the ticket), at its default size, at (240, 50).',
    target: call(7, { sx: 140, sy: 0, sw: 60, sh: 100, dx: 240, dy: 50 }), crooked: call(7, { sx: 280, sy: 0, sw: 120, sh: 200, dx: 240, dy: 50 }) },
  { id: 'marquee', title: 'Marquee', brief: 'The title (the top-left 140 × 40 CSS px) blown up to fill 560 × 160 grid px at (20, 70).',
    target: call(9, { sx: 0, sy: 0, sw: 140, sh: 40, dx: 20, dy: 70, dw: 560, dh: 160 }), crooked: call(9, { sx: 0, sy: 0, sw: 140, sh: 40, dx: 10, dy: 35, dw: 280, dh: 80 }) },
  { id: 'glow', title: 'Catch the glow', brief: 'The ticket and its 10 px glow, which overflows the border box, at default size, at (80, 30).',
    target: call(7, { sx: -10, sy: -10, sw: 220, sh: 120, dx: 80, dy: 30 }), crooked: call(3, { dx: 100, dy: 50 }) },
  { id: 'tilt', title: 'The crooked reel', brief: 'Like complex-text.html: rotate the context 15°, then draw the whole ticket at (180, -50) in the rotated frame.',
    target: call(3, { dx: 180, dy: -50, rotate: 15 }), crooked: call(3, { dx: 180, dy: -50, rotate: -15 }), rotates: true },
];
