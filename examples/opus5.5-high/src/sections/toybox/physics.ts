/**
 * A small impulse-based rigid-body solver for oriented boxes (the cards).
 * Units are CSS px and seconds. No DOM in here.
 */
export interface Body {
  x: number; y: number; a: number;
  vx: number; vy: number; va: number;
  w: number; h: number;
  /** Treated as a disc for collisions (round cards). */
  round: boolean;
  invM: number; invI: number;
  /** Set once the body is fully inside the box; from then on the box has a lid. */
  entered: boolean;
  /** Kinematic target (tidy mode) or null. */
  target: { x: number; y: number; a: number } | null;
}

export function makeBody(x: number, y: number, w: number, h: number, round: boolean): Body {
  const m = (w * h) / 1000;
  const I = round ? (m * (w * w)) / 8 : (m * (w * w + h * h)) / 12;
  return { x, y, a: 0, vx: 0, vy: 0, va: 0, w, h, round, invM: 1 / m, invI: 1 / I, entered: true, target: null };
}

type V = { x: number; y: number };
const corners = (b: Body): V[] => {
  const c = Math.cos(b.a), s = Math.sin(b.a), hw = b.w / 2, hh = b.h / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => ({ x: b.x + u! * c - v! * s, y: b.y + u! * s + v! * c }));
};
const axes = (b: Body): V[] => [{ x: Math.cos(b.a), y: Math.sin(b.a) }, { x: -Math.sin(b.a), y: Math.cos(b.a) }];
const project = (pts: V[], n: V) => {
  let min = Infinity, max = -Infinity;
  for (const p of pts) { const d = p.x * n.x + p.y * n.y; if (d < min) min = d; if (d > max) max = d; }
  return { min, max };
};

interface Contact { n: V; depth: number; p: V }

function collide(a: Body, b: Body): Contact | null {
  if (a.round && b.round) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), r = (a.w + b.w) / 2;
    if (d >= r || d === 0) return null;
    const n = { x: dx / d, y: dy / d };
    return { n, depth: r - d, p: { x: a.x + n.x * (a.w / 2), y: a.y + n.y * (a.w / 2) } };
  }
  // Boxes (a round card collides as its square: close enough for paper discs).
  const ca = corners(a), cb = corners(b);
  let best: Contact | null = null;
  for (const [owner, n0] of [...axes(a).map((n) => ['a', n] as const), ...axes(b).map((n) => ['b', n] as const)]) {
    const pa = project(ca, n0), pb = project(cb, n0);
    const overlap = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min);
    if (overlap <= 0) return null;
    if (!best || overlap < best.depth) {
      let n = n0;
      if ((b.x - a.x) * n.x + (b.y - a.y) * n.y < 0) n = { x: -n.x, y: -n.y };
      // Incident vertex: the deepest corner of the other box.
      const pts = owner === 'a' ? cb : ca;
      const sign = owner === 'a' ? 1 : -1;
      let p = pts[0]!, dmin = Infinity;
      for (const q of pts) { const d = sign * (q.x * n.x + q.y * n.y); if (d < dmin) { dmin = d; p = q; } }
      best = { n, depth: overlap, p };
    }
  }
  return best;
}

function impulse(a: Body | null, b: Body, n: V, p: V, e: number, mu: number): void {
  const rb = { x: p.x - b.x, y: p.y - b.y };
  const ra = a ? { x: p.x - a.x, y: p.y - a.y } : { x: 0, y: 0 };
  const vb = { x: b.vx - b.va * rb.y, y: b.vy + b.va * rb.x };
  const va = a ? { x: a.vx - a.va * ra.y, y: a.vy + a.va * ra.x } : { x: 0, y: 0 };
  const rv = { x: vb.x - va.x, y: vb.y - va.y };
  const vn = rv.x * n.x + rv.y * n.y;
  if (vn > 0) return;
  const raXn = ra.x * n.y - ra.y * n.x, rbXn = rb.x * n.y - rb.y * n.x;
  const invA = a ? a.invM + raXn * raXn * a.invI : 0;
  const k = invA + b.invM + rbXn * rbXn * b.invI;
  const j = (-(1 + e) * vn) / k;
  const apply = (body: Body, r: V, ix: number, iy: number) => {
    body.vx += ix * body.invM; body.vy += iy * body.invM; body.va += (r.x * iy - r.y * ix) * body.invI;
  };
  apply(b, rb, n.x * j, n.y * j);
  if (a) apply(a, ra, -n.x * j, -n.y * j);
  // Friction along the tangent.
  const t = { x: rv.x - vn * n.x, y: rv.y - vn * n.y };
  const tl = Math.hypot(t.x, t.y);
  if (tl < 1e-6) return;
  t.x /= tl; t.y /= tl;
  const raXt = ra.x * t.y - ra.y * t.x, rbXt = rb.x * t.y - rb.y * t.x;
  const kt = (a ? a.invM + raXt * raXt * a.invI : 0) + b.invM + rbXt * rbXt * b.invI;
  const jt = Math.max(-mu * j, Math.min(mu * j, -(rv.x * t.x + rv.y * t.y) / kt));
  apply(b, rb, t.x * jt, t.y * jt);
  if (a) apply(a, ra, -t.x * jt, -t.y * jt);
}

export interface World {
  bodies: Body[];
  width: number;
  height: number;
  gravity: number;
}

export function step(world: World, dt: number, dragged: Body | null): void {
  const { bodies, width: W, height: H } = world;
  for (const b of bodies) {
    if (b.target) {
      // Tidy mode: glide to a slot.
      const k = Math.min(1, dt * 7);
      b.x += (b.target.x - b.x) * k; b.y += (b.target.y - b.y) * k; b.a += (b.target.a - b.a) * k;
      b.vx = b.vy = b.va = 0;
      continue;
    }
    if (b !== dragged) b.vy += world.gravity * dt;
    if (!b.entered && b.y - Math.max(b.w, b.h) / 2 > 0) b.entered = true;
    b.vx *= 0.995; b.vy *= 0.995; b.va *= 0.985;
    b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
  }
  for (let iter = 0; iter < 6; iter++) {
    for (const b of bodies) {
      if (b.target) continue;
      // Walls and floor as half-planes, using each corner (or the disc's extent).
      const pts = b.round ? [{ x: b.x, y: b.y + b.w / 2 }, { x: b.x - b.w / 2, y: b.y }, { x: b.x + b.w / 2, y: b.y }] : corners(b);
      for (const p of pts) {
        if (p.y > H) { b.y -= (p.y - H) * 0.8; impulse(null, b, { x: 0, y: -1 }, p, 0.25, 0.6); }
        if (b.entered && p.y < 0) { b.y += -p.y * 0.8; impulse(null, b, { x: 0, y: 1 }, p, 0.3, 0.4); }
        if (p.x < 0) { b.x += -p.x * 0.8; impulse(null, b, { x: 1, y: 0 }, p, 0.3, 0.4); }
        if (p.x > W) { b.x -= (p.x - W) * 0.8; impulse(null, b, { x: -1, y: 0 }, p, 0.3, 0.4); }
      }
    }
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i]!, b = bodies[j]!;
        if (a.target || b.target) continue;
        const c = collide(a, b);
        if (!c) continue;
        const total = a.invM + b.invM;
        const corr = (Math.max(0, c.depth - 0.5) / total) * 0.6;
        a.x -= c.n.x * corr * a.invM; a.y -= c.n.y * corr * a.invM;
        b.x += c.n.x * corr * b.invM; b.y += c.n.y * corr * b.invM;
        impulse(a, b, c.n, c.p, 0.2, 0.5);
      }
    }
  }
}

/** Kinetic energy proxy: is anything still moving? */
export const restless = (bodies: Body[]): boolean =>
  bodies.some((b) => (b.target ? Math.abs(b.target.x - b.x) + Math.abs(b.target.y - b.y) > 0.3 : Math.hypot(b.vx, b.vy) > 4 || Math.abs(b.va) > 0.05));
