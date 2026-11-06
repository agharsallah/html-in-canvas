/**
 * Paint scenes: the bell that rings on every `paint`, and the lens that
 * shows a grid in CSS pixels next to a grid in device pixels.
 */
import { h } from '../../../ui/dom';
import type { Scene } from './kit';

/**
 * The bell. A card with a live clock sits in the canvas; every `paint`
 * draws it and rings a ring, and the readout lists `changedElements`.
 * With `loop`, the handler asks for the next paint itself, so it rings
 * every frame with an empty list.
 */
export const bell: Scene<{ loop?: boolean }> = (kit, { loop }) => {
  const time = h('strong', {}, '');
  const card = kit.add(h('div', { class: 'proof-card proof-bell' },
    h('p', { class: 'proof-card-title' }, 'The tower card'), h('p', {}, 'It is ', time),
    h('input', { class: 'ui-field', value: 'ding', 'aria-label': 'Type to change the card' })));
  const tick = () => {
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    kit.lab.simulateChange(card);
  };
  tick();
  const clock = window.setInterval(tick, 1000);
  card.querySelector('input')!.addEventListener('input', () => kit.lab.simulateChange(card));

  const rings: number[] = [];
  let paints = 0;
  let rings30 = 0;
  const started = performance.now();
  const stop = kit.lab.onPaint((changed) => {
    const now = (performance.now() - started) / 1000;
    const real = changed.includes(card);
    if (real || loop) {
      paints += 1;
      if (real || paints % 6 === 0) rings.push(now);
      kit.readout(`paint #${paints} · changedElements: [${real ? 'div.proof-card' : ''}]${loop ? ' · requestPaint() again' : ''}`);
    }
    while (rings.length && now - rings[0]! > 1.2) rings.shift();
    kit.lab.beginFrame();
    const { width, height } = kit.size();
    const s = kit.lab.scale();
    const ctx = kit.lab.ctx;
    const bx = 70;
    const by = height / 2;
    // The bell swings a little each time it rings.
    const swing = rings.length ? Math.sin((now - rings[rings.length - 1]!) * 18) * 0.25 * Math.max(0, 1 - (now - rings[rings.length - 1]!) * 1.5) : 0;
    ctx.save();
    ctx.scale(s, s);
    for (const born of rings) {
      const k = (now - born) / 1.2;
      ctx.strokeStyle = kit.color('accent');
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.lineWidth = 3 - k * 2;
      ctx.beginPath();
      ctx.arc(bx, by, 26 + k * 70, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.translate(bx, by - 30);
    ctx.rotate(swing);
    ctx.fillStyle = kit.color('ink');
    ctx.beginPath();
    ctx.moveTo(-26, 50);
    ctx.quadraticCurveTo(-24, 2, 0, 0);
    ctx.quadraticCurveTo(24, 2, 26, 50);
    ctx.lineTo(30, 56);
    ctx.lineTo(-30, 56);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = kit.color('accent');
    ctx.beginPath();
    ctx.arc(0, 60, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3, -8, 6, 9);
    ctx.restore();
    kit.lab.drawElement(card, Math.max(140, (width - card.offsetWidth) / 2 + 40), (height - card.offsetHeight) / 2);
    // Keep drawing while rings fade; with `loop`, ask for every frame.
    if (loop || rings.length) {
      rings30 = window.setTimeout(() => kit.lab.requestPaint(), loop ? 0 : 33);
    }
  });
  kit.lab.requestPaint();
  kit.onDestroy(() => {
    stop();
    clearInterval(clock);
    clearTimeout(rings30);
  });
};

/**
 * The lens. Left: the same card drawn on a grid with fewer pixels than the
 * screen has (what sizing from the CSS box gives you), scaled up. Right:
 * one grid pixel per device pixel. A magnifier shows both up close.
 */
export const lens: Scene<{ center?: boolean }> = (kit, { center }) => {
  const make = () => kit.add(h('div', { class: 'proof-lens-card' }, h('p', {}, 'Razor sharp'), h('p', { class: 'proof-lens-small' }, 'g · 12px · ✓')));
  const left = make();
  const right = make();
  if (!kit.native) left.classList.add('proof-blur');
  kit.animate((t) => {
    const { width, height } = kit.size();
    const s = kit.lab.scale();
    const coarse = s > 1 ? s : 2; // grid px per CSS px the left side is missing
    const ctx = kit.lab.ctx;
    const half = width / 2;
    const y = center ? (height - left.offsetHeight) / 2 - 30 : 24;
    const xl = (half - left.offsetWidth) / 2;
    const xr = half + (half - right.offsetWidth) / 2;
    if (kit.native) {
      // Draw small, then blow it up: exactly what a too-small grid does.
      kit.lab.drawElement(left, xl, y, { scale: 1 / coarse });
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(ctx.canvas, xl * s, y * s, (left.offsetWidth * s) / coarse, (left.offsetHeight * s) / coarse,
        xl * s, y * s, left.offsetWidth * s, left.offsetHeight * s);
    } else {
      kit.lab.drawElement(left, xl, y);
    }
    kit.lab.drawElement(right, xr, y);

    // The magnifier: the same spot of both cards, enlarged without smoothing.
    const mag = 2.6;
    const spot = { w: 40, h: 24 };
    const sx = 12 + (Math.sin(t * 0.6) + 1) * 30;
    const my = height - spot.h * mag - 12;
    ctx.imageSmoothingEnabled = false;
    for (const [x0, cx] of [[xl, half * 0.5], [xr, half * 1.5]] as const) {
      const bx = cx - (spot.w * mag) / 2;
      ctx.drawImage(ctx.canvas, (x0 + sx) * s, (y + 8) * s, spot.w * s, spot.h * s, bx * s, my * s, spot.w * mag * s, spot.h * mag * s);
      ctx.strokeStyle = kit.color('ink');
      ctx.lineWidth = 1.5 * s;
      ctx.strokeRect(bx * s, my * s, spot.w * mag * s, spot.h * mag * s);
    }
    ctx.imageSmoothingEnabled = true;
    if (center) {
      // A cross through the middle of each card's half: the card sits on it.
      ctx.strokeStyle = kit.color('accent');
      ctx.lineWidth = 1 * s;
      ctx.setLineDash([4 * s, 4 * s]);
      const cy = y + left.offsetHeight / 2;
      ctx.beginPath();
      for (const cx of [half * 0.5, half * 1.5]) {
        ctx.moveTo(cx * s, (cy - 50) * s);
        ctx.lineTo(cx * s, (cy + 50) * s);
        ctx.moveTo((cx - 110) * s, cy * s);
        ctx.lineTo((cx + 110) * s, cy * s);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    kit.readout(s > 1
      ? `Left: canvas sized from the CSS box (1 grid px per CSS px). Right: device pixels (${s} per CSS px). Same HTML, same code path.`
      : 'Left: a grid with half the pixels it needs, scaled up. Right: one grid pixel per device pixel, which your code now does.');
  }, 12);
};
