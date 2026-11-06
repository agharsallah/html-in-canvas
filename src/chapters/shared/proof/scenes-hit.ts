/**
 * Hit-testing scenes: a moving button you can catch, a pie chart whose
 * labels are real focusable HTML, and a card whose hidden face goes inert.
 */
import { h } from '../../../ui/dom';
import type { Scene } from './kit';

/**
 * Catch the button. It swings, orbits and (with `spin`) turns over. Every
 * draw syncs its geometry, so the real <button> stays under the pointer.
 */
export const hit: Scene<{ wall?: boolean; spin?: boolean }> = (kit, { wall, spin }) => {
  const target = kit.add(h('button', { type: 'button', class: 'proof-target' }, 'Catch me'));
  let hits = 0;
  let misses = 0;
  let flash = -1;
  target.addEventListener('click', () => {
    hits += 1;
    flash = performance.now();
    target.textContent = hits === 1 ? 'Caught!' : `Caught ×${hits}`;
    kit.lab.simulateChange(target);
  });
  kit.lab.root.addEventListener('click', (event) => {
    if (event.detail && !target.contains(event.target as Node)) misses += 1;
  });

  kit.animate((t) => {
    const { width, height } = kit.size();
    const ctx = kit.lab.ctx;
    const s = kit.lab.scale();
    if (wall) {
      ctx.fillStyle = kit.color('ink');
      ctx.globalAlpha = 0.12;
      for (let row = 0; row * 18 < height; row++) {
        for (let col = -1; col * 44 < width; col++) {
          ctx.fillRect((col * 44 + (row % 2) * 22 + 2) * s, (row * 18 + 2) * s, 40 * s, 14 * s);
        }
      }
      ctx.globalAlpha = 1;
    }
    const cx = width / 2 + Math.cos(t * 0.7) * width * 0.28;
    const cy = height / 2 + Math.sin(t * 1.1) * height * 0.22;
    const glow = flash > 0 ? Math.max(0, 1 - (performance.now() - flash) / 500) : 0;
    if (glow > 0) {
      ctx.fillStyle = kit.color('second');
      ctx.globalAlpha = glow * 0.5;
      ctx.beginPath();
      ctx.arc(cx * s, cy * s, (40 + (1 - glow) * 40) * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    kit.lab.drawElement(target, cx - target.offsetWidth / 2, cy - target.offsetHeight / 2, {
      rotate: Math.sin(t * 1.4) * 24, center: true, scaleX: spin ? Math.max(0.25, Math.abs(Math.cos(t * 0.9))) : 1,
    });
    kit.readout(`Hits ${hits} · misses ${misses}. The button is redrawn every frame, and its geometry follows it.`);
  });
};

/**
 * Voices. `pie`: wedges painted in 2D, labels are real <button>s placed at
 * the wedges; focus one and drawFocusIfNeeded rings its wedge. `flip`: a
 * card turns over, and whichever face points away is `inert`.
 */
export const voice: Scene<{ variant: 'pie' | 'flip' }> = (kit, { variant }) => {
  if (variant === 'flip') return flip(kit);
  const data = [['Fixer', 0.45, 'accent'], ['Developer', 0.35, 'second'], ['Stop bath', 0.2, 'glow']] as const;
  const labels = data.map(([name, share]) => kit.add(h('button', { type: 'button', class: 'proof-wedge-label' }, `${name} ${Math.round(share * 100)}%`)));
  kit.lab.canvas.setAttribute('role', 'list');
  kit.lab.canvas.setAttribute('aria-label', 'Chemistry used this week');
  labels.forEach((l) => l.addEventListener('focus', () => kit.lab.requestPaint()));
  kit.animate((t) => {
    const { width, height } = kit.size();
    const ctx = kit.lab.ctx;
    const s = kit.lab.scale();
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.36;
    let a = -Math.PI / 2 + t * 0.15;
    data.forEach(([, share, tone], i) => {
      const path = new Path2D();
      path.moveTo(cx * s, cy * s);
      path.arc(cx * s, cy * s, r * s, a, a + share * Math.PI * 2);
      path.closePath();
      ctx.fillStyle = kit.color(tone);
      ctx.fill(path);
      ctx.strokeStyle = kit.color('paper');
      ctx.lineWidth = 3 * s;
      ctx.stroke(path);
      // The browser draws the system focus ring, only when focus should show.
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = kit.color('ink');
      if (document.activeElement === labels[i]) {
        if (kit.native) ctx.drawFocusIfNeeded(path, labels[i]!);
        else ctx.stroke(path);
      }
      const mid = a + share * Math.PI;
      const label = labels[i]!;
      kit.lab.drawElement(label, cx + Math.cos(mid) * r * 0.62 - label.offsetWidth / 2, cy + Math.sin(mid) * r * 0.62 - label.offsetHeight / 2);
      a += share * Math.PI * 2;
    });
    const focused = labels.findIndex((l) => l === document.activeElement);
    kit.readout(focused >= 0
      ? `Focused: “${labels[focused]!.textContent}”. A screen reader reads it as a list item; drawFocusIfNeeded ringed its wedge.`
      : 'Press Tab to reach a label inside the canvas.');
  }, 20);
};

function flip(kit: Parameters<Scene>[0]): void {
  const face = (title: string, text: string, cls: string) => kit.add(h('div', { class: `proof-face ${cls}` },
    h('p', { class: 'proof-card-title' }, title), h('p', {}, text), h('button', { type: 'button', class: 'proof-button' }, 'Press')));
  const front = face('Front', 'Facing you: in the tab order.', 'proof-face-front');
  const back = face('Back', 'Turned away: inert, silent, unclickable.', 'proof-face-back');
  kit.animate((t) => {
    const { width, height } = kit.size();
    const angle = t * 0.9;
    const c = Math.cos(angle);
    const shown = c >= 0 ? front : back;
    const hidden = shown === front ? back : front;
    if (!shown.inert && !hidden.inert) hidden.inert = true;
    if (shown.inert) {
      shown.inert = false;
      hidden.inert = true;
    }
    kit.lab.drawElement(shown, (width - shown.offsetWidth) / 2, (height - shown.offsetHeight) / 2, { center: true, scaleX: Math.max(0.02, Math.abs(c)) });
    kit.readout(`${shown === front ? 'Front' : 'Back'} faces you. The other face has inert, so Tab and screen readers skip it.`);
  }, 30);
}
