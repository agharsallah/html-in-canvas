/**
 * Three-strip colour: velvet dark at the edges, and three projector beams
 * (red, green, blue records) sweeping from one booth window. The strips
 * are slightly out of register, like a misaligned Technicolor print, and
 * add up to warm white where they overlap.
 *
 * One 2D canvas at CSS resolution, 20 fps; static under reduced motion.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

const STRIPS = [
  { color: '255, 60, 80', phase: 0, offset: -6 },
  { color: '60, 220, 120', phase: 2.1, offset: 0 },
  { color: '70, 120, 255', phase: 4.2, offset: 6 },
];

export function projectorBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'proj-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const reduced = prefersReducedMotion();

  const draw = (now: number) => {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const t = now / 1000;
    const ox = width * 0.12;
    const oy = -height * 0.05;
    ctx.globalCompositeOperation = 'lighter';
    for (const strip of STRIPS) {
      const sway = reduced ? 0 : Math.sin(t * 0.15 + strip.phase) * 0.12;
      const angle = 0.55 + sway;
      const spread = 0.16;
      const reach = Math.hypot(width, height) * 1.2;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, reach);
      g.addColorStop(0, `rgba(${strip.color}, 0.22)`);
      g.addColorStop(1, `rgba(${strip.color}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox + strip.offset, oy);
      ctx.lineTo(ox + strip.offset + Math.cos(angle - spread) * reach, oy + Math.sin(angle - spread) * reach);
      ctx.lineTo(ox + strip.offset + Math.cos(angle + spread) * reach, oy + Math.sin(angle + spread) * reach);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Velvet vignette.
    const v = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.max(width, height) * 0.75);
    v.addColorStop(0, 'rgba(60, 10, 25, 0)');
    v.addColorStop(1, 'rgba(60, 10, 25, 0.28)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, width, height);
  };

  const stopSize = observeCanvasSize(canvas, () => draw(performance.now()), { maxScale: 1 });
  if (reduced) return () => (stopSize(), canvas.remove());
  const stopLoop = throttledLoop(20, draw);
  return () => {
    stopLoop();
    stopSize();
    canvas.remove();
  };
}
