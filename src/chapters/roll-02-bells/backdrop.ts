/**
 * The bell tower: concentric sound rings expanding from the top of the
 * chapter. Sepia ink on toned paper.
 *
 * Performance: rings are stroked onto one canvas at CSS-pixel resolution,
 * 20 times a second. That is a handful of arcs per frame, with no layout or
 * style work. (The first version animated SVG `r`, which re-rendered the
 * whole layer every frame; a composited div per ring would instead cost
 * hundreds of MB of GPU memory at ring size.)
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

const RING_EVERY_MS = 2400;
const RING_LIFE_MS = 6000;

export function bellBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'bell-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const accent = getComputedStyle(host).getPropertyValue('--accent').trim() || '#c4501d';
  const reduced = prefersReducedMotion();
  const births: number[] = [];

  const draw = (now: number) => {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    const maxR = Math.hypot(width / 2, height) * 1.05;
    const rings = reduced ? [0.25, 0.5, 0.75, 1].map((t) => ({ t, alpha: 0.15 })) : births.map((born) => {
      const t = Math.min(1, (now - born) / RING_LIFE_MS);
      const eased = 1 - (1 - t) ** 3;
      return { t: eased, alpha: 0.55 * (1 - t) };
    });
    for (const { t, alpha } of rings) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(width / 2, -40, 40 + t * maxR, 0, Math.PI);
      ctx.stroke();
    }
    while (births.length && now - births[0]! > RING_LIFE_MS) births.shift();
  };

  const stopSize = observeCanvasSize(canvas, () => draw(performance.now()), { maxScale: 1 });
  if (reduced) return () => (stopSize(), canvas.remove());

  births.push(performance.now());
  const timer = setInterval(() => births.push(performance.now()), RING_EVERY_MS);
  const stopLoop = throttledLoop(20, draw);
  return () => {
    clearInterval(timer);
    stopLoop();
    stopSize();
    canvas.remove();
  };
}
