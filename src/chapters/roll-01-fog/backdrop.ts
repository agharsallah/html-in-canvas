/**
 * The Fallback fog: soft platinum-grey banks drifting across the chapter,
 * drawn as large radial gradients on a 2D canvas.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

interface Bank {
  x: number;
  y: number;
  r: number;
  speed: number;
  alpha: number;
}

export function fogBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'fog-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const banks: Bank[] = Array.from({ length: 14 }, (_, i) => ({
    x: Math.random(),
    y: 0.15 + (i / 14) * 0.85,
    r: 0.25 + Math.random() * 0.35,
    speed: 0.004 + Math.random() * 0.01,
    alpha: 0.18 + Math.random() * 0.2,
  }));
  let last = performance.now();
  let stop = () => {};

  const draw = () => {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    for (const bank of banks) {
      const cx = bank.x * width;
      const cy = bank.y * height;
      const r = bank.r * Math.max(width, height);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(214, 220, 224, ${bank.alpha})`);
      g.addColorStop(1, 'rgba(214, 220, 224, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  };

  const stopSize = observeCanvasSize(canvas, draw, { maxScale: 1 });
  const step = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.2);
    last = now;
    for (const bank of banks) bank.x = ((bank.x + bank.speed * dt + 1.4) % 1.8) - 0.4;
    draw();
  };
  // Fog drifts a few pixels a second: 20 fps is plenty.
  if (!prefersReducedMotion()) stop = throttledLoop(20, step);

  return () => {
    stop();
    stopSize();
    canvas.remove();
  };
}
