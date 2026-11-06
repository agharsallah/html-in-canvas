/**
 * The foundry floor, printed in lith: infectious-development blacks along the
 * bottom, a molten seam glowing through them, and embers drifting up the
 * peach paper. One canvas, 20 frames a second; still under reduced motion.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

interface Ember { x: number; y: number; speed: number; size: number; sway: number }

export function foundryBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'fdy-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const style = getComputedStyle(host);
  const accent = style.getPropertyValue('--accent').trim() || '#ff5a1f';
  const glow = style.getPropertyValue('--glow').trim() || '#ffb067';
  const reduced = prefersReducedMotion();
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const embers: Ember[] = Array.from({ length: 46 }, () => ({ x: rand(), y: rand(), speed: 0.02 + rand() * 0.05, size: 1 + rand() * 2.2, sway: rand() * 6 }));
  let last = performance.now();

  const draw = (now: number) => {
    const { width, height } = canvas;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, width, height);

    // The black floor with a molten seam: two gradients, no per-pixel work.
    const floor = height * 0.8;
    const dark = ctx.createLinearGradient(0, floor - height * 0.12, 0, height);
    dark.addColorStop(0, 'rgba(20, 6, 2, 0)');
    dark.addColorStop(0.45, 'rgba(20, 6, 2, 0.55)');
    dark.addColorStop(1, 'rgba(10, 2, 0, 0.85)');
    ctx.fillStyle = dark;
    ctx.fillRect(0, floor - height * 0.12, width, height);
    const pulse = reduced ? 0.6 : 0.5 + 0.15 * Math.sin(now / 900);
    const seam = ctx.createRadialGradient(width * 0.3, height * 1.02, 0, width * 0.3, height * 1.02, width * 0.55);
    seam.addColorStop(0, `${glow}`);
    seam.addColorStop(0.25, accent);
    seam.addColorStop(1, 'rgba(255, 90, 31, 0)');
    ctx.globalAlpha = pulse;
    ctx.fillStyle = seam;
    ctx.fillRect(0, floor - height * 0.2, width, height);

    ctx.fillStyle = accent;
    for (const e of embers) {
      if (!reduced) {
        e.y -= e.speed * dt;
        if (e.y < -0.02) {
          e.y = 1.02;
          e.x = rand();
        }
      }
      const x = (e.x + Math.sin(now / 1400 + e.sway) * (reduced ? 0 : 0.01)) * width;
      ctx.globalAlpha = 0.25 + 0.55 * e.y;
      ctx.fillRect(x, e.y * height, e.size, e.size * 1.6);
    }
    ctx.globalAlpha = 1;
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
