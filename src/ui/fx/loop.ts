/**
 * A requestAnimationFrame loop with a frame-rate ceiling. Ambient visuals
 * (slow fog, a pixel mosaic) look the same at 10–24 fps and cost a fraction
 * of a 60/120 fps loop. Pauses while the tab is hidden.
 */
export function throttledLoop(fps: number, draw: (time: number) => void): () => void {
  // 1 ms of slack so a 60 fps cap never drops to 40 on a 120 Hz display.
  const interval = 1000 / fps - 1;
  let last = -Infinity;
  let frame = 0;
  const loop = (now: number) => {
    if (now - last >= interval) {
      last = now;
      draw(now);
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
}
