/**
 * The clockwork heart: a watch movement seen through albumen paper. Large
 * brass gear outlines turn slowly behind the chapter, over a perlage of
 * overlapping circles (the polished pattern on watch plates).
 *
 * Performance: one 2D canvas at CSS-pixel resolution, 15 frames a second,
 * a few dozen strokes per frame. Static under reduced motion.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

interface Wheel {
  x: number; // fraction of width
  y: number; // fraction of height
  r: number; // px
  teeth: number;
  dir: 1 | -1;
}

const WHEELS: Wheel[] = [
  { x: 0.08, y: 0.18, r: 170, teeth: 36, dir: 1 },
  { x: 0.25, y: 0.42, r: 90, teeth: 18, dir: -1 },
  { x: 0.92, y: 0.3, r: 210, teeth: 42, dir: -1 },
  { x: 0.78, y: 0.82, r: 120, teeth: 24, dir: 1 },
  { x: 0.4, y: 0.95, r: 140, teeth: 28, dir: -1 },
];

function drawWheel(ctx: CanvasRenderingContext2D, w: Wheel, width: number, height: number, angle: number): void {
  const cx = w.x * width;
  const cy = w.y * height;
  const outer = w.r;
  const inner = w.r * 0.9;
  ctx.beginPath();
  for (let i = 0; i <= w.teeth; i++) {
    const a = angle * w.dir * (60 / w.teeth) + (i / w.teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / w.teeth;
    ctx.lineTo(cx + inner * Math.cos(a), cy + inner * Math.sin(a));
    ctx.lineTo(cx + outer * Math.cos(a + step * 0.15), cy + outer * Math.sin(a + step * 0.15));
    ctx.lineTo(cx + outer * Math.cos(a + step * 0.45), cy + outer * Math.sin(a + step * 0.45));
    ctx.lineTo(cx + inner * Math.cos(a + step * 0.6), cy + inner * Math.sin(a + step * 0.6));
  }
  ctx.stroke();
  // Spokes and hub.
  for (let k = 0; k < 5; k++) {
    const a = angle * w.dir * (60 / w.teeth) + (k / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + w.r * 0.18 * Math.cos(a), cy + w.r * 0.18 * Math.sin(a));
    ctx.lineTo(cx + w.r * 0.78 * Math.cos(a), cy + w.r * 0.78 * Math.sin(a));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, w.r * 0.18, 0, Math.PI * 2);
  ctx.arc(cx, cy, w.r * 0.8, 0, Math.PI * 2);
  ctx.stroke();
}

export function clockworkBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'clock-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const style = getComputedStyle(host);
  const accent = style.getPropertyValue('--accent').trim() || '#b0602c';
  const second = style.getPropertyValue('--second').trim() || '#2a9d8f';
  const reduced = prefersReducedMotion();
  const start = performance.now();
  // The perlage never moves: draw it once per size into a cached layer.
  const perlage = document.createElement('canvas');
  const paintPerlage = () => {
    perlage.width = canvas.width;
    perlage.height = canvas.height;
    const p = perlage.getContext('2d')!;
    p.lineWidth = 1;
    p.strokeStyle = second;
    p.globalAlpha = 0.07;
    for (let y = 0; y < perlage.height + 40; y += 46) {
      for (let x = (y / 46) % 2 ? 23 : 0; x < perlage.width + 40; x += 46) {
        p.beginPath();
        p.arc(x, y, 30, 0, Math.PI * 2);
        p.stroke();
      }
    }
  };

  const draw = (now: number) => {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    if (perlage.width !== width || perlage.height !== height) paintPerlage();
    ctx.drawImage(perlage, 0, 0);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1.5;
    const angle = reduced ? 0 : ((now - start) / 1000) * 0.05;
    WHEELS.forEach((w) => drawWheel(ctx, w, width, height, angle));
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
