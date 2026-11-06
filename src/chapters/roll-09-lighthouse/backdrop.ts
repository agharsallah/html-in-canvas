/**
 * Salt print: warm brown paper, a sea-blue horizon, and a slow lighthouse
 * beam sweeping across the sheet. One 2D canvas at CSS-pixel resolution,
 * 15 frames a second; a still beam under reduced motion.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

export function lighthouseBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'lh-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const style = getComputedStyle(host);
  const sea = style.getPropertyValue('--accent').trim() || '#1f7a9c';
  const glow = style.getPropertyValue('--glow').trim() || '#ffe9a6';
  let angle = 2.6;

  const draw = () => {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    // The sea: a few soft horizontal swells near the bottom.
    ctx.strokeStyle = sea;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const y = height * (0.8 + i * 0.035);
      ctx.globalAlpha = 0.07 + i * 0.015;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 24) ctx.lineTo(x, y + Math.sin(x / 90 + i + angle * 2) * 3);
      ctx.stroke();
    }
    // The beam: a soft wedge from a lamp near the top-right corner.
    const ox = width * 0.94;
    const oy = height * 0.12;
    const reach = Math.hypot(width, height);
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, reach);
    g.addColorStop(0, glow);
    g.addColorStop(1, 'rgba(255, 233, 166, 0)');
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, reach, angle - 0.09, angle + 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const stopSize = observeCanvasSize(canvas, draw, { maxScale: 1 });
  let stop = () => {};
  if (!prefersReducedMotion()) {
    stop = throttledLoop(15, (now) => {
      // Swing slowly between pointing down-left and straight down.
      angle = 2.3 + Math.sin(now / 6000) * 0.55;
      draw();
    });
  }

  return () => {
    stop();
    stopSize();
    canvas.remove();
  };
}
