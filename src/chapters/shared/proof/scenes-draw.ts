/**
 * Drawing scenes: an element rising out of the fog, a nested drawable
 * filling its hole, and the projector's crop, fill and tilt.
 */
import { h } from '../../../ui/dom';
import type { Drawable2DContext } from '../../../hic/types';
import { ease, type Scene, type SceneKit } from './kit';

/** Soft drifting fog, painted in plain 2D under the HTML. */
function fog(kit: SceneKit, t: number, amount: number): void {
  if (amount <= 0.01) return;
  const { ctx, canvas } = kit.lab;
  const s = canvas.width / Math.max(1, kit.size().width);
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const x = ((i * 97 + t * (14 + i * 3)) % (kit.size().width + 160)) - 80;
    const y = 30 + ((i * 53) % Math.max(60, kit.size().height - 40));
    const g = ctx.createRadialGradient(x * s, y * s, 0, x * s, y * s, 90 * s);
    g.addColorStop(0, `rgba(235, 238, 248, ${0.55 * amount})`);
    g.addColorStop(1, 'rgba(235, 238, 248, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();
}

/** The fog lifts: an opted-in canvas draws its card, and the card is live. */
export const rise: Scene<{ detect?: boolean }> = (kit, { detect }) => {
  const supported = typeof CanvasRenderingContext2D !== 'undefined' && 'drawElementImage' in CanvasRenderingContext2D.prototype;
  const chip = kit.add(h('p', { class: 'proof-chip' }, detect
    ? (supported ? 'content = "drawable" ✓  drawElementImage ✓' : 'Not supported here: fallback path')
    : 'content = "drawable"'));
  const card = kit.add(h('div', { class: 'proof-card' },
    h('p', { class: 'proof-card-title' }, 'Roses are red'),
    h('input', { class: 'ui-field', value: 'violets are blue', 'aria-label': 'A live field inside the canvas' }),
    h('button', { type: 'button', class: 'proof-button' }, 'Send')));
  let sent = 0;
  card.querySelector('button')!.addEventListener('click', () => {
    sent += 1;
    card.querySelector('button')!.textContent = `Sent ${sent}`;
    kit.lab.simulateChange(card);
  });
  card.querySelector('input')!.addEventListener('input', () => kit.lab.simulateChange(card));

  kit.animate((t) => {
    const { width } = kit.size();
    const rise = ease(t / 1.4);
    fog(kit, t, 1 - rise * 0.75);
    kit.lab.drawElement(chip, 16, 14, { alpha: ease(t / 0.6) });
    kit.lab.drawElement(card, Math.max(16, (width - card.offsetWidth) / 2), 56 + (1 - rise) * 40 + Math.sin(t * 1.6) * 3, { alpha: rise });
    kit.readout(detect
      ? `This browser: ${supported ? 'the real API, so the card is drawn by drawElementImage' : 'no API, so the fallback path runs'}. Type in the card.`
      : 'The fog lifts: the canvas draws its child, and the field inside is real. Type in it.');
  });
};

/** A drawable inside a drawable: the parent's snapshot has a hole; a second draw fills it. */
export const nested: Scene = (kit) => {
  const you = h('span', { class: 'proof-you' }, 'you');
  const poem = kit.add(h('div', { class: 'proof-poem' },
    h('p', {}, 'Roses are red,'), h('p', {}, 'violets are blue,'), h('p', {}, 'this line was written for ', you)));
  you.setAttribute('drawable', '');
  kit.animate((t) => {
    const { width } = kit.size();
    const x = Math.max(12, (width - poem.offsetWidth) / 2);
    const y = 24;
    kit.lab.drawElement(poem, x, y);
    const phase = t % 4;
    const pop = phase < 1.2 ? 0 : ease((phase - 1.2) / 0.35);
    if (kit.native && pop > 0) {
      const bounce = 1 + Math.sin(Math.min(1, (phase - 1.2) / 0.5) * Math.PI) * 0.25;
      kit.lab.drawElement(you, x + you.offsetLeft, y + you.offsetTop, { scale: bounce, center: true, alpha: pop });
    }
    kit.readout(phase < 1.2 && kit.native
      ? 'drawElementImage(poem): a hole where the nested drawable sits…'
      : '…then drawElementImage(you) fills it. Two draws, one print.');
  }, 30);
};

type ProjectVariant = 'crop' | 'fill' | 'tilt';

/** The projector: crop with a source rect, stretch to a destination, tilt with rotate. */
export const project: Scene<{ variant: ProjectVariant }> = (kit, { variant }) => {
  const ticket = kit.add(h('div', { class: 'proof-ticket' },
    h('div', { class: 'proof-ticket-stub' }, h('span', {}, 'ADMIT'), h('strong', {}, 'ONE')),
    h('div', { class: 'proof-ticket-body' }, h('p', {}, 'The projector hall'), h('p', { class: 'proof-ticket-seat' }, 'Row 4 · Seat 12'))));
  kit.animate((t) => {
    const { width, height } = kit.size();
    const w = ticket.offsetWidth;
    const hh = ticket.offsetHeight;
    const k = (Math.sin(t * 1.3) + 1) / 2;
    if (variant === 'tilt') {
      const angle = Math.sin(t * 1.2) * 14;
      kit.lab.drawElement(ticket, (width - w) / 2, (height - hh) / 2, { rotate: angle, center: true });
      kit.readout(`ctx.translate(centre); ctx.rotate(${angle.toFixed(1)}°); drawElementImage(ticket, -w/2, -h/2)`);
      return;
    }
    const src = variant === 'crop'
      ? { x: 0, y: 0, w: 70 + (w - 70) * k, h: hh }
      : { x: 0, y: 0, w, h: hh };
    const dst = variant === 'fill'
      ? { x: 12 + (1 - k) * ((width - w) / 2 - 12), y: 12 + (1 - k) * ((height - hh) / 2 - 12), w: w + (width - 24 - w) * k, h: hh + (height - 24 - hh) * k }
      : { x: (width - src.w) / 2, y: (height - hh) / 2, w: src.w, h: hh };
    draw9(kit, ticket, src, dst);
    kit.readout(`drawElementImage(ticket, ${Math.round(src.x)}, ${Math.round(src.y)}, ${Math.round(src.w)}, ${Math.round(src.h)}, ` +
      `${Math.round(dst.x)}, ${Math.round(dst.y)}, ${Math.round(dst.w)}, ${Math.round(dst.h)})`);
  });
};

interface Rect { x: number; y: number; w: number; h: number }

/** The nine-argument draw: source rect in CSS px, destination in grid px. */
function draw9(kit: SceneKit, el: HTMLElement, src: Rect, dst: Rect): void {
  const s = kit.lab.scale();
  if (kit.native) {
    (kit.lab.ctx as Drawable2DContext).drawElementImage(el, src.x, src.y, src.w, src.h, dst.x * s, dst.y * s, dst.w * s, dst.h * s);
    return;
  }
  el.dataset.drawn = 'true';
  el.style.transformOrigin = '0 0';
  el.style.clipPath = `inset(${src.y}px ${el.offsetWidth - src.x - src.w}px ${el.offsetHeight - src.y - src.h}px ${src.x}px)`;
  el.style.transform = `translate(${dst.x}px, ${dst.y}px) scale(${dst.w / src.w}, ${dst.h / src.h}) translate(${-src.x}px, ${-src.y}px)`;
}
