/**
 * Boot timing marks, visible in DevTools > Performance > Timings and via
 * performance.getEntriesByType('mark'). Cheap enough to keep in production.
 */
export function mark(name: string): void {
  performance.mark(`drawable:${name}`);
}

/** Run `fn` once, on the first frame that actually presents. */
export function markFirstFrame(): (() => void) {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    mark('first-frame');
  };
}
