/**
 * HTML-in-Canvas confetti.
 *
 * The pieces are real HTML: code chips (`paint`, `drawable`), a star, a
 * check, little paper squares in the chapter's colours. They are drawable
 * children of one full-screen overlay canvas, and each burst draws every
 * piece's snapshot dozens of times with `drawElementImage`, each copy with
 * its own transform. One element, many confetti: snapshots are reusable.
 *
 * The overlay is `inert` and ignores the pointer, so a celebration never
 * steals a click. Without the API it falls back to plain 2D shapes. With
 * reduced motion it does nothing.
 */
import { onPaint } from '../../hic/paint';
import { isDrawable2D, isDrawableCanvas, makeDrawableHost, type Drawable2DContext } from '../../hic/types';
import { h, prefersReducedMotion } from '../dom';

interface Particle {
  piece: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  flip: number;
  vflip: number;
  size: number;
  age: number;
  life: number;
}

const PIECES: Array<[cls: string, text: string]> = [
  ['cf-chip', 'paint'], ['cf-chip', 'drawable'], ['cf-chip', '<canvas>'], ['cf-star', '★'], ['cf-check', '✓'],
  ['cf-sq cf-a', ''], ['cf-sq cf-b', ''], ['cf-sq cf-c', ''], ['cf-strip cf-a', ''], ['cf-strip cf-b', ''], ['cf-dot cf-c', ''],
];
/** How often each piece is picked: paper outnumbers words. */
const WEIGHTS = [1, 1, 0.6, 1.2, 1, 3, 3, 3, 2.5, 2.5, 2];
const GRAVITY = 1500;
const MAX_PARTICLES = 180;

export interface Confetti {
  /** Burst from a viewport point; `power` 1 is a normal cheer. */
  burst(x: number, y: number, power?: number, palette?: Palette): void;
}

export interface Palette {
  a: string;
  b: string;
  c: string;
}

export function mountConfetti(parent: HTMLElement = document.body): Confetti {
  const canvas = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
  canvas.inert = true;
  const pieces = PIECES.map(([cls, text]) => h('span', { class: `cf ${cls}` }, text));
  parent.append(canvas);
  makeDrawableHost(canvas);
  const ctx = canvas.getContext('2d')!;
  const native = isDrawableCanvas(canvas) && isDrawable2D(ctx);
  if (native) {
    for (const piece of pieces) {
      piece.setAttribute('drawable', '');
      canvas.append(piece);
    }
    canvas.requestPaint();
  }

  let particles: Particle[] = [];
  let last = 0;
  let scale = 1;
  let frame = 0;
  const sizes = () => pieces.map((p) => ({ w: p.offsetWidth, h: p.offsetHeight }));
  let pieceSize = sizes();
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  const pick = () => {
    let r = Math.random() * total;
    for (let i = 0; i < WEIGHTS.length; i++) if ((r -= WEIGHTS[i]!) <= 0) return i;
    return 0;
  };

  const fit = () => {
    scale = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(innerWidth * scale);
    const hgt = Math.round(innerHeight * scale);
    if (canvas.width !== w || canvas.height !== hgt) {
      canvas.width = w;
      canvas.height = hgt;
    }
  };

  const step = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    for (const p of particles) {
      p.age += dt;
      p.vy += GRAVITY * dt * 0.55;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx * dt + Math.sin(p.age * 7 + p.flip) * 18 * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.vflip * dt;
    }
    particles = particles.filter((p) => p.age < p.life && p.y < innerHeight + 60);
  };

  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      const fade = Math.min(1, (p.life - p.age) / 0.5);
      ctx.globalAlpha = Math.max(0, fade);
      ctx.setTransform(1, 0, 0, 1, p.x * scale, p.y * scale);
      ctx.rotate(p.rot);
      // Paper turning in the air: squash one axis by the cosine of its flip.
      ctx.scale(Math.cos(p.flip) * p.size, p.size);
      const { w, h: hh } = pieceSize[p.piece]!;
      if (native) {
        (ctx as Drawable2DContext).drawElementImage(pieces[p.piece]!, (-w / 2) * scale, (-hh / 2) * scale);
      } else {
        ctx.fillStyle = fallbackColour(p.piece);
        ctx.fillRect((-w / 2) * scale, (-hh / 2) * scale, w * scale, hh * scale);
      }
    }
    ctx.globalAlpha = 1;
  };

  const tick = (now: number) => {
    step(now);
    if (!native) {
      draw();
      frame = particles.length ? requestAnimationFrame(tick) : 0;
      if (!particles.length) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    (canvas as unknown as { requestPaint(): void }).requestPaint();
    frame = 0;
  };

  if (native) {
    onPaint(canvas, () => {
      draw();
      // Keep going while anything is in the air; one last paint clears it.
      if (particles.length && !frame) frame = requestAnimationFrame(tick);
    });
  }

  const fallbackColour = (i: number) => {
    const cs = getComputedStyle(canvas);
    const key = PIECES[i]![0].includes('cf-a') ? '--cf-a' : PIECES[i]![0].includes('cf-b') ? '--cf-b' : '--cf-c';
    return cs.getPropertyValue(key) || '#ffb547';
  };

  return {
    burst(x, y, power = 1, palette) {
      if (prefersReducedMotion()) return;
      if (palette) {
        canvas.style.setProperty('--cf-a', palette.a);
        canvas.style.setProperty('--cf-b', palette.b);
        canvas.style.setProperty('--cf-c', palette.c);
      }
      fit();
      pieceSize = sizes();
      const count = Math.round(34 * power);
      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = (-90 + (Math.random() - 0.5) * 120) * (Math.PI / 180);
        const speed = (420 + Math.random() * 520) * Math.sqrt(power);
        particles.push({
          piece: pick(), x, y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 12,
          flip: Math.random() * Math.PI, vflip: 4 + Math.random() * 9,
          size: 0.75 + Math.random() * 0.5, age: 0, life: 1.8 + Math.random() * 1.1,
        });
      }
      last = performance.now();
      if (!frame) frame = requestAnimationFrame(tick);
    },
  };
}
