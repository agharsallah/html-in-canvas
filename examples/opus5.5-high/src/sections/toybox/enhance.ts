/**
 * What's on · 2D canvas with physics.
 *
 * Each card is an <article drawable>. It is drawn rotated and thrown around
 * with the context transform, and 2D drawElementImage updates its geometry
 * automatically, so the links inside stay clickable, hoverable and Tab-able
 * wherever a card lands. No hit-testing code.
 *
 *  - 9-argument drawElementImage with negative source outsets keeps each card's
 *    hard box-shadow, which lies outside the border box (ink overflow).
 *  - drawFocusIfNeeded draws the focus ring around the card's real shape,
 *    round cards included.
 *  - requestPaint() runs only while something moves. Resting cards cost nothing.
 */
import { PaintLoop } from '../../hic/loop';
import { observeGrid, type Grid } from '../../hic/sizing';
import { upgradeStage } from '../../hic/stage';
import type { Support } from '../../hic/support';
import { prefs } from '../../lib/prefs';
import { makeBody, restless, step, type Body, type World } from './physics';

/** CSS px around each card to include its 8px hard shadow and border. */
const OUTSET = 14;

interface Card {
  el: HTMLElement;
  link: HTMLAnchorElement | null;
  body: Body;
  shape: string;
}

export function enhanceToybox(root: HTMLElement, support: Support): void {
  const stage = root.querySelector<HTMLElement>('[data-stage="toybox"]');
  if (!stage || !support.ctx2d) return;

  const canvas = upgradeStage(stage);
  canvas.setAttribute('role', 'group');
  canvas.setAttribute('aria-label', 'What’s on: draggable cards');
  const ctx = canvas.getContext('2d')!;
  const cards: Card[] = Array.from(canvas.querySelectorAll<HTMLElement>('.toy')).map((el) => ({
    el,
    link: el.querySelector('a'),
    shape: el.dataset.shape ?? 'rect',
    body: makeBody(0, 0, el.offsetWidth || 260, el.offsetHeight || 200, el.dataset.shape === 'circle'),
  }));
  const order = [...cards];
  const world: World = { bodies: cards.map((c) => c.body), width: 800, height: 600, gravity: 2400 };
  let grid: Grid | null = null;
  let calm = 0;
  let dropped = false;

  const measure = () => {
    for (const c of cards) {
      c.body.w = c.el.offsetWidth;
      c.body.h = c.el.offsetHeight;
    }
  };

  /** Lay the cards out in rows from the floor up: also the reduced-motion layout. */
  const tidy = () => {
    const narrow = world.width < 560;
    const gap = narrow ? 12 : 26, margin = narrow ? 10 : 28;
    let x = margin, rowBase = world.height - margin, rowH = 0;
    for (const c of cards) {
      const b = c.body;
      if (x + b.w > world.width - margin && x > margin) {
        x = margin;
        rowBase -= rowH + gap;
        rowH = 0;
      }
      b.target = { x: x + b.w / 2, y: rowBase - b.h / 2, a: 0 };
      x += b.w + gap;
      rowH = Math.max(rowH, b.h);
    }
  };

  const shake = () => {
    for (const c of cards) {
      const b = c.body;
      b.target = null;
      b.entered = true;
      b.vx = (Math.random() - 0.5) * 900;
      b.vy = -700 - Math.random() * 700;
      b.va = (Math.random() - 0.5) * 9;
    }
    calm = 0;
    loop.kick();
  };

  /** The entrance: cards fall in from above, one after another. */
  const drop = () => {
    dropped = true;
    cards.forEach((c, i) => {
      const b = c.body;
      b.target = null;
      b.entered = false;
      b.x = world.width * (0.15 + 0.7 * ((i * 0.37) % 1));
      b.y = -b.h - i * 170;
      b.a = (Math.random() - 0.5) * 1.2;
      b.vx = (Math.random() - 0.5) * 120;
      b.vy = 200;
      b.va = (Math.random() - 0.5) * 3;
    });
    loop.kick();
  };

  observeGrid(canvas, (g) => {
    const first = !grid;
    grid = g;
    world.width = g.cssWidth;
    world.height = g.cssHeight;
    measure();
    if (first || prefs.reducedMotion) tidy();
    for (const b of world.bodies) b.x = Math.min(Math.max(b.x, b.w / 2), world.width - b.w / 2);
  });

  new IntersectionObserver(([e]) => {
    if (e?.isIntersecting && !dropped && !prefs.reducedMotion) drop();
  }, { threshold: 0.35 }).observe(canvas);

  root.querySelector('[data-act="shake"]')?.addEventListener('click', () => (prefs.reducedMotion ? tidy() : shake()));
  root.querySelector('[data-act="tidy"]')?.addEventListener('click', () => {
    tidy();
    loop.kick();
  });
  prefs.subscribe(() => {
    if (prefs.reducedMotion) tidy();
    loop.kick();
  });

  // ── Dragging. Pointer events reach the card under the pointer because the browser
  //    hit-tests drawables through the geometry drawElementImage set.
  let drag: { card: Card; id: number; lx: number; ly: number; px: number; py: number; sx: number; sy: number; moved: boolean } | null = null;
  const toCss = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element).closest?.('.toy');
    const card = cards.find((c) => c.el === el);
    if (!card || e.button !== 0) return;
    const p = toCss(e);
    const b = card.body;
    const c = Math.cos(-b.a), s = Math.sin(-b.a);
    const dx = p.x - b.x, dy = p.y - b.y;
    drag = { card, id: e.pointerId, lx: dx * c - dy * s, ly: dx * s + dy * c, px: p.x, py: p.y, sx: p.x, sy: p.y, moved: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = toCss(e);
    drag.px = p.x;
    drag.py = p.y;
    if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) {
      drag.moved = true;
      // Capture only once it's a real drag, so a plain click still reaches the link.
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('is-dragging');
      drag.card.el.dataset.grabbed = '';
      // Reduced motion: no physics, the card is placed exactly where you put it.
      if (!prefs.reducedMotion) for (const c of cards) c.body.target = null;
      raise(drag.card);
    }
    if (drag.moved) loop.kick();
  });
  const release = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) {
      // Swallow the click that ends a drag.
      const swallow = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
      canvas.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => canvas.removeEventListener('click', swallow, true), 0);
    }
    delete drag.card.el.dataset.grabbed;
    canvas.classList.remove('is-dragging');
    drag = null;
    calm = 0;
    loop.kick();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // Keyboard: the focused card comes to the front.
  canvas.addEventListener('focusin', (e) => {
    const card = cards.find((c) => c.el.contains(e.target as Node));
    if (card) raise(card);
    loop.kick();
  });

  function raise(card: Card) {
    order.splice(order.indexOf(card), 1);
    order.push(card);
  }

  const loop = new PaintLoop(canvas, ({ dt, changed }) => {
    if (!grid) return false;
    if (changed.length) measure(); // fonts landing or text edits change card sizes

    // Physics, in two substeps.
    const dragged = drag?.moved ? drag.card.body : null;
    for (let i = 0; i < 2; i++) {
      if (dragged && drag && prefs.reducedMotion) {
        const b = dragged;
        const c = Math.cos(b.a), s = Math.sin(b.a);
        b.target = { x: drag.px - (drag.lx * c - drag.ly * s), y: drag.py - (drag.lx * s + drag.ly * c), a: b.a };
        b.x = b.target.x;
        b.y = b.target.y;
      } else if (dragged && drag) {
        const b = dragged;
        const c = Math.cos(b.a), s = Math.sin(b.a);
        const gx = b.x + drag.lx * c - drag.ly * s, gy = b.y + drag.lx * s + drag.ly * c;
        const ex = drag.px - gx, ey = drag.py - gy;
        b.vx = ex * 16;
        b.vy = ey * 16;
        b.va = b.va * 0.85 + ((gx - b.x) * ey - (gy - b.y) * ex) * 0.00012;
      }
      step(world, dt / 2, dragged);
    }

    // Draw in CSS px: scale the context once, and pass explicit CSS sizes.
    ctx.reset();
    ctx.scale(grid.scaleX, grid.scaleY);
    const focused = document.activeElement;
    for (const card of order) {
      const { el, body: b, link } = card;
      const lift = focused && el.contains(focused) ? 1.04 : 1;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.scale(lift, lift);
      const w = b.w, h = b.h;
      // (element, sx, sy, sw, sh, dx, dy, dw, dh): the source rect reaches past the border box.
      ctx.drawElementImage(el, -OUTSET, -OUTSET, w + 2 * OUTSET, h + 2 * OUTSET, -w / 2 - OUTSET, -h / 2 - OUTSET, w + 2 * OUTSET, h + 2 * OUTSET);
      if (link) {
        const path = new Path2D();
        if (card.shape === 'circle') path.ellipse(0, 0, w / 2 + 6, h / 2 + 6, 0, 0, Math.PI * 2);
        else path.roundRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, card.shape === 'pill' ? h / 2 + 6 : 12);
        ctx.drawFocusIfNeeded(path, link);
      }
      ctx.restore();
    }

    calm = restless(world.bodies) || drag?.moved ? 0 : calm + dt;
    return calm < 0.4;
  });
}
