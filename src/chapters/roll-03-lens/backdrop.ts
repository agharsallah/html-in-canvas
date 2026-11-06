/**
 * Daguerreotype: a mirror-silver plate. A soft sheen drifts across it like a
 * reflection as you tilt the plate, tarnish blooms at the edges, and a set of
 * focus rings slowly breathes in and out of focus around the lens centre.
 *
 * Performance: one 2D canvas at CSS-pixel resolution, redrawn 12 times a
 * second (a few gradients and arcs). Reduced motion: one still frame.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

const RINGS = 7;

export function lensBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'lens-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const style = getComputedStyle(host);
  const accent = style.getPropertyValue('--accent').trim() || '#4f7cac';
  const gold = style.getPropertyValue('--second').trim() || '#c9a227';
  const reduced = prefersReducedMotion();

  const draw = (now: number) => {
    const { width, height } = canvas;
    const t = reduced ? 0 : now / 1000;
    ctx.clearRect(0, 0, width, height);

    // The drifting sheen of polished silver.
    const sx = width * (0.35 + Math.sin(t * 0.07) * 0.2);
    const sheen = ctx.createLinearGradient(sx - width * 0.4, 0, sx + width * 0.4, height);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.32)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, width, height);

    // Tarnish halo: the blue-gold bloom at a daguerreotype's edges.
    const r = Math.hypot(width, height) / 2;
    const tarnish = ctx.createRadialGradient(width / 2, height / 2, r * 0.55, width / 2, height / 2, r);
    tarnish.addColorStop(0, 'rgba(0,0,0,0)');
    tarnish.addColorStop(0.7, `${accent}22`);
    tarnish.addColorStop(1, `${gold}44`);
    ctx.fillStyle = tarnish;
    ctx.fillRect(0, 0, width, height);

    // Focus rings: sharp when in focus, doubled and faint when not.
    const cx = width * 0.82;
    const cy = height * 0.2;
    const focus = reduced ? 1 : (Math.sin(t * 0.5) + 1) / 2; // 0 blurry … 1 sharp
    for (let i = 1; i <= RINGS; i++) {
      const radius = i * Math.min(width, height) * 0.085;
      const spread = (1 - focus) * 6;
      for (const offset of spread > 0.5 ? [-spread, 0, spread] : [0]) {
        ctx.globalAlpha = (0.08 + 0.22 * focus) / (spread > 0.5 ? 2 : 1);
        ctx.strokeStyle = i % 2 ? accent : gold;
        ctx.lineWidth = 1 + (1 - focus) * 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + offset, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  const stopSize = observeCanvasSize(canvas, () => draw(performance.now()), { maxScale: 1 });
  const stopLoop = reduced ? () => {} : throttledLoop(12, draw);
  return () => {
    stopLoop();
    stopSize();
    canvas.remove();
  };
}
