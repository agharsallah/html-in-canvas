/**
 * Hologram: iridescent foil bands drifting diagonally across the chapter,
 * with a few glints that catch the light. Static under reduced motion.
 *
 * Performance: one 2D canvas at CSS-pixel resolution, 12 fps, a single
 * gradient fill plus a handful of glints per frame.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

const STOPS = 7;

export function reelBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'reel-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const reduced = prefersReducedMotion();
  const glints = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), phase: Math.random() * Math.PI * 2 }));

  const draw = (now: number) => {
    const { width, height } = canvas;
    const t = reduced ? 0 : now / 1000;
    ctx.clearRect(0, 0, width, height);
    const shift = (t * 0.03) % 1;
    const band = ctx.createLinearGradient(0, 0, width, height);
    for (let i = 0; i <= STOPS; i++) {
      const hue = (((i / STOPS + shift) % 1) * 360 + 200) % 360;
      band.addColorStop(i / STOPS, `hsla(${hue.toFixed(0)}, 90%, 70%, 0.16)`);
    }
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, width, height);
    for (const g of glints) {
      const alpha = reduced ? 0.25 : Math.max(0, Math.sin(t * 1.3 + g.phase)) ** 6 * 0.7;
      if (alpha < 0.02) continue;
      const x = g.x * width;
      const y = g.y * height;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  const stopSize = observeCanvasSize(canvas, () => draw(performance.now()), { maxScale: 1 });
  if (reduced) return () => (stopSize(), canvas.remove());
  const stopLoop = throttledLoop(12, draw);
  return () => {
    stopLoop();
    stopSize();
    canvas.remove();
  };
}
