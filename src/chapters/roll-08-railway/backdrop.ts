/**
 * Instant film: white-bordered prints scattered across the chapter, each
 * slowly developing from murky chemical green to a pale picture, then
 * fading and returning somewhere else, like snapshots arriving by train.
 *
 * Performance: a dozen rects and gradients on one canvas at 12 fps, CSS
 * pixel resolution. Reduced motion draws one still, fully developed frame.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

interface Print {
  x: number;
  y: number;
  size: number;
  tilt: number;
  born: number;
  life: number;
  hue: number;
}

const COUNT = 11;

export function railwayBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'rail-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const style = getComputedStyle(host);
  const accent = style.getPropertyValue('--accent').trim() || '#2f8f6b';
  const second = style.getPropertyValue('--second').trim() || '#ef476f';
  const glow = style.getPropertyValue('--glow').trim() || '#f7d046';
  const reduced = prefersReducedMotion();
  const spawn = (now: number, i: number): Print => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.min(70 + Math.random() * 70, innerWidth / 5),
    tilt: (Math.random() - 0.5) * 0.5,
    born: now - (reduced ? 1e9 : (i / COUNT) * 14000),
    life: 12000 + Math.random() * 6000,
    hue: i % 3,
  });
  const prints = Array.from({ length: COUNT }, (_, i) => spawn(performance.now(), i));

  const draw = (now: number) => {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    prints.forEach((p, i) => {
      let t = (now - p.born) / p.life;
      if (t >= 1 && !reduced) {
        prints[i] = spawn(now, i);
        prints[i]!.born = now;
        t = 0;
      }
      t = Math.min(1, Math.max(0, t));
      const develop = Math.min(1, t / 0.6);
      const alpha = reduced ? 0.12 : 0.17 * Math.min(1, t * 6) * Math.min(1, (1 - t) * 5);
      const w = p.size;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x * width, p.y * height);
      ctx.rotate(p.tilt);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 8;
      ctx.fillRect(-w / 2, -w / 2, w, w * 1.2);
      ctx.shadowBlur = 0;
      const pad = w * 0.07;
      const inner = w - pad * 2;
      // Murky chemistry first, the picture underneath it.
      const picture = ctx.createLinearGradient(0, -w / 2, 0, -w / 2 + inner);
      picture.addColorStop(0, [glow, accent, second][p.hue]!);
      picture.addColorStop(1, '#fbfbf7');
      ctx.fillStyle = picture;
      ctx.fillRect(-w / 2 + pad, -w / 2 + pad, inner, inner);
      ctx.globalAlpha = alpha * (1 - develop) * 1.6;
      ctx.fillStyle = '#1f3d33';
      ctx.fillRect(-w / 2 + pad, -w / 2 + pad, inner, inner);
      ctx.restore();
    });
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
