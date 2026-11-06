/**
 * Paint-event plumbing.
 *
 * `canvas.onpaint` is a single slot, and libraries (three.js' HTMLTexture)
 * like to overwrite it. We always use addEventListener('paint') so several
 * listeners can coexist.
 *
 * The frame driver abstracts "when do I draw?":
 *  - native:    driven by the `paint` event, re-armed with `requestPaint()`
 *               (the HTML-in-Canvas analogue of requestAnimationFrame).
 *  - simulated: plain requestAnimationFrame.
 *
 * It also caps the frame rate (default 60 fps). On a 120 Hz display that
 * halves the work without visible loss for gently swaying paper. Skipped
 * frames never lose information: `changedElements` from skipped paints are
 * accumulated and delivered with the next frame that runs. A WebGL canvas
 * that isn't drawn to simply keeps presenting its last frame.
 *
 * In native mode the cap must throttle `requestPaint()` itself, not just our
 * drawing: every request forces a full rendering update and a `paint` event.
 * So the next request is timed to the next allowed frame. Real DOM changes
 * still fire `paint` on their own, so nothing waits on the timer.
 */
import { isDrawableCanvas, type CanvasPaintEvent } from './types';

export type PaintHandler = (changed: readonly Element[], event: CanvasPaintEvent) => void;

export function onPaint(canvas: HTMLCanvasElement, handler: PaintHandler): () => void {
  const listener = (event: Event) => {
    const paintEvent = event as CanvasPaintEvent;
    handler(paintEvent.changedElements ?? [], paintEvent);
  };
  canvas.addEventListener('paint', listener);
  return () => canvas.removeEventListener('paint', listener);
}

export interface FrameInfo {
  /** Seconds since the previous frame that ran (clamped to avoid big jumps). */
  dt: number;
  /** Seconds since the driver started. */
  time: number;
  /** Drawables whose snapshot changed since the last frame that ran. */
  changed: ReadonlySet<Element>;
}

export interface FrameDriver {
  start(): void;
  stop(): void;
  /** Change the frame-rate ceiling on the fly (e.g. calmer when idle). */
  setMaxFps(fps: number): void;
  readonly running: boolean;
}

export interface FrameDriverOptions {
  /** Upper bound on frames per second. Default 60. */
  maxFps?: number;
}

export function createFrameDriver(
  canvas: HTMLCanvasElement,
  native: boolean,
  onFrame: (frame: FrameInfo) => void,
  { maxFps = 60 }: FrameDriverOptions = {},
): FrameDriver {
  let running = false;
  let last = 0;
  let startedAt = 0;
  let rafId = 0;
  let unlisten: (() => void) | null = null;
  const pending = new Set<Element>();
  let timer = 0;
  // A little slack so a 60 Hz display never skips because of timer jitter.
  let minInterval = 1000 / maxFps - 2;

  const tick = (now: number) => {
    if (last && now - last < minInterval) return; // skip; keep `pending`
    const dt = last ? Math.min((now - last) / 1000, 1 / 15) : 1 / 60;
    last = now;
    const changed = new Set(pending);
    pending.clear();
    onFrame({ dt, time: now / 1000 - startedAt, changed });
  };

  const useNative = native && isDrawableCanvas(canvas);

  return {
    get running() {
      return running;
    },
    start() {
      if (running) return;
      running = true;
      startedAt = performance.now() / 1000;
      last = 0;
      if (useNative && isDrawableCanvas(canvas)) {
        const drawable = canvas;
        const scheduleNext = () => {
          if (timer) return; // a request is already on its way
          const wait = minInterval - (performance.now() - last);
          if (wait <= 4) {
            drawable.requestPaint();
            return;
          }
          timer = window.setTimeout(() => {
            timer = 0;
            if (running) drawable.requestPaint();
          }, wait - 3);
        };
        unlisten = onPaint(drawable, (changed) => {
          if (!running) return;
          changed.forEach((el) => pending.add(el));
          tick(performance.now());
          scheduleNext(); // keep the loop alive, like rAF, at the capped rate
        });
        drawable.requestPaint();
      } else {
        const loop = (now: number) => {
          if (!running) return;
          tick(now);
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      }
    },
    setMaxFps(fps) {
      minInterval = 1000 / fps - 2;
    },
    stop() {
      running = false;
      clearTimeout(timer);
      timer = 0;
      unlisten?.();
      unlisten = null;
      cancelAnimationFrame(rafId);
    },
  };
}
