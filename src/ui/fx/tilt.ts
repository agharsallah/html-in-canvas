/**
 * Tilt: cards lean toward the pointer in 3D, with a moving sheen, like a
 * print held up to the light. CSS reads --rx, --ry, --gx, --gy.
 * No-op under reduced motion or on touch-only devices.
 */
import { prefersReducedMotion } from '../dom';

export function attachTilt(el: HTMLElement, maxDeg = 7): () => void {
  if (prefersReducedMotion() || !matchMedia('(hover: hover)').matches) return () => {};
  el.classList.add('tilt');
  let frame = 0;

  const onMove = (event: PointerEvent) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      el.style.setProperty('--ry', `${(x - 0.5) * 2 * maxDeg}deg`);
      el.style.setProperty('--rx', `${(0.5 - y) * 2 * maxDeg}deg`);
      el.style.setProperty('--gx', `${x * 100}%`);
      el.style.setProperty('--gy', `${y * 100}%`);
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(frame);
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  return () => {
    cancelAnimationFrame(frame);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
  };
}
