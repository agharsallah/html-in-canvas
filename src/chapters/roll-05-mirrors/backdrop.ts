/**
 * Tintype plate: a dark lacquered sheet with a warm, uneven highlight, fine
 * scratches in the varnish, and a slow glint that crosses it like light
 * passing over a mirror. Static under reduced motion.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

interface Scratch { x: number; y: number; len: number; angle: number; alpha: number }

export function mirrorBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'mirror-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const scratches: Scratch[] = Array.from({ length: 70 }, () => ({
    x: Math.random(), y: Math.random(), len: 0.02 + Math.random() * 0.12,
    angle: -0.4 + Math.random() * 0.8 + (Math.random() < 0.3 ? Math.PI / 2 : 0), alpha: 0.03 + Math.random() * 0.07,
  }));
  let glint = -0.4;
  let stop = () => {};

  const draw = () => {
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    // Warm, off-centre pool of light, like a plate lit from one window.
    const pool = ctx.createRadialGradient(w * 0.32, h * 0.28, 0, w * 0.32, h * 0.28, Math.max(w, h) * 0.75);
    pool.addColorStop(0, 'rgba(240, 217, 168, 0.16)');
    pool.addColorStop(0.5, 'rgba(216, 166, 87, 0.05)');
    pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, w, h);
    // Lacquer darkening at the edges.
    const edge = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
    edge.addColorStop(1, 'rgba(8, 6, 4, 0.55)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
    // Scratches in the varnish.
    ctx.lineWidth = 1;
    for (const s of scratches) {
      ctx.strokeStyle = `rgba(241, 233, 219, ${s.alpha})`;
      ctx.beginPath();
      ctx.moveTo(s.x * w, s.y * h);
      ctx.lineTo(s.x * w + Math.cos(s.angle) * s.len * w, s.y * h + Math.sin(s.angle) * s.len * w);
      ctx.stroke();
    }
    // The glint: a soft diagonal band.
    const gx = glint * (w + h);
    const band = ctx.createLinearGradient(gx - h * 0.3, 0, gx + h * 0.3, h * 0.6);
    band.addColorStop(0, 'rgba(240, 217, 168, 0)');
    band.addColorStop(0.5, 'rgba(240, 217, 168, 0.07)');
    band.addColorStop(1, 'rgba(240, 217, 168, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, h);
  };

  const stopSize = observeCanvasSize(canvas, draw, { maxScale: 1 });
  let last = performance.now();
  if (!prefersReducedMotion()) {
    stop = throttledLoop(20, (now) => {
      const dt = Math.min((now - last) / 1000, 0.2);
      last = now;
      glint += dt * 0.08;
      if (glint > 1.6) glint = -0.6;
      draw();
    });
  }

  return () => {
    stop();
    stopSize();
    canvas.remove();
  };
}
