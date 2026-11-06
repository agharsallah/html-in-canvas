/**
 * Texture and worker scenes: a card on a turning plane that uploads only
 * when it changes, molten HTML, a colour read from CSS, and a train of
 * captured snapshots.
 */
import type { DrawableCanvas, Drawable2DContext, ElementImage } from '../../../hic/types';
import { h } from '../../../ui/dom';
import type { Scene, SceneKit } from './kit';

const HEATS = ['#ff5a1f', '#7a1fff', '#11907a', '#e0263f'];

/**
 * The foundry card. `spin`: it turns like a texture on a 3D plane and counts
 * uploads (only when changedElements lists it). `melt`: sliced and rippled
 * like a fragment shader. `theme`: its glow colour is read from CSS.
 */
export const texture: Scene<{ variant: 'spin' | 'melt' | 'theme' }> = (kit, { variant }) => {
  const out = h('output', {}, '1080°');
  const card = kit.add(h('div', { class: 'proof-card proof-foundry' },
    h('p', { class: 'proof-card-title' }, 'The crucible'), h('p', {}, 'Temperature ', out),
    h('button', { type: 'button', class: 'proof-button' }, 'Pour')));
  let temp = 1080;
  card.querySelector('button')!.addEventListener('click', () => {
    temp += 40;
    out.textContent = `${temp}°`;
    kit.lab.simulateChange(card);
  });
  let uploads = 0;
  let heat = 0;
  if (variant === 'theme') {
    const timer = window.setInterval(() => {
      heat = (heat + 1) % HEATS.length;
      card.style.setProperty('--heat', HEATS[heat]!);
      kit.lab.simulateChange(card);
    }, 1800);
    kit.onDestroy(() => clearInterval(timer));
  }

  kit.animate((t, changed) => {
    if (changed.includes(card)) uploads += 1;
    const { width, height } = kit.size();
    const x = (width - card.offsetWidth) / 2;
    const y = (height - card.offsetHeight) / 2;
    if (variant === 'melt') {
      melt(kit, card, x, y, t);
      kit.readout('The same card, drawn in 24 slices that drift and drip: what a fragment shader does to the texture.');
      return;
    }
    if (variant === 'theme') {
      const read = getComputedStyle(card).getPropertyValue('--heat').trim() || HEATS[0]!;
      glow(kit, width / 2, height / 2, read);
      kit.lab.drawElement(card, x, y);
      kit.readout(`getComputedStyle(card).getPropertyValue("--heat") → ${read}. The glow behind is painted from it.`);
      return;
    }
    const c = Math.cos(t * 0.8);
    glow(kit, width / 2, height / 2, kit.color('glow'));
    kit.lab.drawElement(card, x, y, { center: true, scaleX: Math.max(0.05, Math.abs(c)) });
    kit.readout(`Uploads: ${uploads}. The plane turns every frame, but the texture is only re-uploaded when the card itself changes. Press Pour.`);
  }, 30);
};

function glow(kit: SceneKit, x: number, y: number, color: string): void {
  const s = kit.lab.scale();
  const ctx = kit.lab.ctx;
  const g = ctx.createRadialGradient(x * s, y * s, 0, x * s, y * s, 150 * s);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalAlpha = 1;
}

function melt(kit: SceneKit, card: HTMLElement, x: number, y: number, t: number): void {
  const w = card.offsetWidth;
  const hh = card.offsetHeight;
  if (!kit.native) {
    kit.lab.drawElement(card, x, y, { rotate: Math.sin(t) * 3 });
    return;
  }
  const s = kit.lab.scale();
  const slices = 24;
  const ctx = kit.lab.ctx as Drawable2DContext;
  // Each slice is pushed down by `drip` and stretched to meet the next one,
  // so the card sags like hot metal instead of breaking into strips.
  const sag = (Math.sin(t * 0.9) + 1) / 2;
  const drip = (i: number) => sag * 26 * (i / slices) ** 2.2;
  for (let i = 0; i < slices; i++) {
    const sy = (i * hh) / slices;
    const sh = hh / slices;
    const depth = i / slices;
    const dx = Math.sin(t * 2.4 + i * 0.45) * 7 * depth;
    const top = y + sy + drip(i);
    const height = sh + drip(i + 1) - drip(i) + 0.6;
    ctx.drawElementImage(card, 0, sy, w, Math.min(sh + 0.6, hh - sy), (x + dx) * s, top * s, w * s, height * s);
  }
}

/**
 * The railway. Every 0.7 s the paint handler captures the live card into an
 * ElementImage; each capture rides the line as a frozen carriage and is
 * closed when it leaves. The live card keeps ticking at the station.
 */
export const train: Scene = (kit) => {
  const time = h('strong', {}, '');
  const card = kit.add(h('div', { class: 'proof-card proof-train' }, h('p', { class: 'proof-card-title' }, 'Station clock'), time));
  const tick = () => {
    time.textContent = new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }) + `.${Math.floor((performance.now() % 1000) / 100)}`;
    kit.lab.simulateChange(card);
  };
  const clock = window.setInterval(tick, 100);
  tick();
  const cars: Array<{ img: ElementImage | HTMLElement; born: number }> = [];
  let lastCapture = -1;
  let closed = 0;
  const canvas = kit.lab.canvas as DrawableCanvas;

  kit.animate((t) => {
    const { width, height } = kit.size();
    const s = kit.lab.scale();
    const ctx = kit.lab.ctx;
    const trackY = height * 0.62;
    ctx.strokeStyle = kit.color('ink');
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2 * s;
    for (const dy of [0, 10]) {
      ctx.beginPath();
      ctx.moveTo(0, (trackY + dy) * s);
      ctx.lineTo(width * s, (trackY + dy) * s);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Carriages are spaced by the time between captures times the speed.
    const carW = card.offsetWidth * 0.85;
    const every = 1.1;
    const speed = (carW + 16) / every;
    if (t - lastCapture > every) {
      lastCapture = t;
      if (kit.native && canvas.captureElementImage) {
        cars.push({ img: canvas.captureElementImage(card), born: t });
      } else {
        const copy = kit.add(card.cloneNode(true) as HTMLElement);
        cars.push({ img: copy, born: t });
      }
    }
    const station = 16;
    for (const car of [...cars]) {
      const x = station + card.offsetWidth + 18 + (t - car.born) * speed;
      if (x > width) {
        cars.splice(cars.indexOf(car), 1);
        if (car.img instanceof HTMLElement) car.img.remove();
        else car.img.close();
        closed += 1;
        continue;
      }
      const y = trackY - card.offsetHeight * 0.85 - 4;
      if (car.img instanceof HTMLElement) kit.lab.drawElement(car.img, x, y, { scale: 0.85 });
      else {
        ctx.save();
        ctx.translate(x * s, y * s);
        ctx.scale(0.85, 0.85);
        (ctx as Drawable2DContext).drawElementImage(car.img, 0, 0);
        ctx.restore();
      }
    }
    kit.lab.drawElement(card, station, trackY - card.offsetHeight - 4);
    kit.readout(`${cars.length} snapshots on the line, each frozen at its capture · ${closed} closed after leaving.`);
  }, 30);
  kit.onDestroy(() => {
    clearInterval(clock);
    for (const car of cars) if (!(car.img instanceof HTMLElement)) car.img.close();
  });
};
