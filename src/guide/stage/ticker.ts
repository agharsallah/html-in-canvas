/**
 * One requestAnimationFrame loop for the whole page. Figures subscribe while
 * they are visible; the loop sleeps when nobody is subscribed or the tab is
 * hidden. Capped at 60 fps (30 under reduced motion).
 */
import { prefersReducedMotion } from '../../ui/dom';

export type TickFn = (dt: number, time: number) => void;

const subscribers = new Set<TickFn>();
let raf = 0;
let last = 0;
let elapsed = 0;

function loop(now: number): void {
  raf = 0;
  if (!subscribers.size || document.hidden) return;
  const minInterval = 1000 / (prefersReducedMotion() ? 30 : 60) - 2;
  if (last && now - last < minInterval) {
    raf = requestAnimationFrame(loop);
    return;
  }
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  elapsed += dt;
  subscribers.forEach((fn) => fn(dt, elapsed));
  raf = requestAnimationFrame(loop);
}

function wake(): void {
  if (raf || !subscribers.size) return;
  last = 0;
  raf = requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) wake();
});

export function onTick(fn: TickFn): () => void {
  subscribers.add(fn);
  wake();
  return () => subscribers.delete(fn);
}
