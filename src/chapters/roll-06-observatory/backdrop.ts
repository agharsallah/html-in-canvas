/**
 * The observatory dome: a cyanotype star chart. White linework on Prussian
 * blue: declination circles, a slowly turning field of stars joined into
 * constellations, and two orbits with satellites riding them.
 *
 * Drawn on one canvas at CSS-pixel resolution, 15 times a second; under
 * reduced motion it is drawn once and left still.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

interface Star { a: number; r: number; size: number }

export function observatoryBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'obs-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const style = getComputedStyle(host);
  const ink = style.getPropertyValue('--ink').trim() || '#f1f6fd';
  const second = style.getPropertyValue('--second').trim() || '#ffd166';
  const reduced = prefersReducedMotion();

  // Deterministic sky: a small LCG so the chart is the same on every visit.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars: Star[] = Array.from({ length: 90 }, () => ({ a: rand() * Math.PI * 2, r: 0.12 + rand() * 0.95, size: rand() < 0.15 ? 2.2 : 1.1 }));
  const constellations = [[3, 11, 19, 27, 34], [40, 47, 52, 61], [66, 70, 75, 81, 88]];

  const draw = (now: number) => {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const cx = width * 0.78;
    const cy = height * 0.12;
    const R = Math.hypot(width, height) * 0.75;
    const turn = reduced ? 0 : now / 1000 * 0.004;

    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * i) / 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + turn;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }

    const at = (s: Star) => [cx + Math.cos(s.a + turn) * s.r * R, cy + Math.sin(s.a + turn) * s.r * R] as const;
    ctx.globalAlpha = 0.35;
    for (const group of constellations) {
      ctx.beginPath();
      group.forEach((i, j) => {
        const [x, y] = at(stars[i]!);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.7;
    for (const star of stars) {
      const [x, y] = at(star);
      ctx.fillRect(x - star.size / 2, y - star.size / 2, star.size, star.size);
    }

    // Two orbits around a small world in the lower left.
    const ox = width * 0.14;
    const oy = height * 0.82;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(ox, oy, 26, 0, Math.PI * 2);
    ctx.stroke();
    [[120, 38, 0.3], [190, 64, -0.18]].forEach(([rx, ry, speed], i) => {
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.ellipse(ox, oy, rx!, ry!, -0.35, 0, Math.PI * 2);
      ctx.stroke();
      const t = (reduced ? i : now / 1000 * speed!) + i * 2;
      const px = ox + Math.cos(t) * rx! * Math.cos(-0.35) - Math.sin(t) * ry! * Math.sin(-0.35);
      const py = oy + Math.cos(t) * rx! * Math.sin(-0.35) + Math.sin(t) * ry! * Math.cos(-0.35);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = second;
      ctx.fillRect(px - 3, py - 2, 6, 4);
      ctx.fillStyle = ink;
    });
    ctx.globalAlpha = 1;
  };

  const stopSize = observeCanvasSize(canvas, () => draw(performance.now()), { maxScale: 1 });
  if (reduced) return () => (stopSize(), canvas.remove());
  const stopLoop = throttledLoop(15, draw);
  return () => {
    stopLoop();
    stopSize();
    canvas.remove();
  };
}
