/**
 * The worker yard (native mode only). Mirrors the explainer's worker:
 * take the OffscreenCanvas, size it from posted values, and draw each
 * ElementImage that arrives with `drawElementImage`. Lab extras: a modelled
 * draw cost (`delay`), optional `close()`, and optional skip-to-newest.
 *
 * The drawing call updates the form's geometry; the browser batches that
 * and fires `elementgeometryupdate` on the main thread's canvas.
 */
import type { DrawableOffscreen2D, ElementImage } from '../../hic/types';

interface Job { id: number; form: ElementImage }
interface Scope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
}

const scope = self as unknown as Scope;
const absNow = () => performance.timeOrigin + performance.now();
let ctx: DrawableOffscreen2D | null = null;
let at = { x: 0, y: 0 };
let settings = { delay: 0, close: true, skip: false };
const queue: Job[] = [];
/** Images the worker finished with but never closed: it still holds them. */
const kept: Job[] = [];
let scheduled = false;

const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  // Yield first, so messages that arrived while we were busy join the queue.
  setTimeout(work, 0);
};

function work(): void {
  scheduled = false;
  if (!ctx || !queue.length) return;
  let job: Job;
  if (settings.skip && queue.length > 1) {
    job = queue.pop()!;
    for (const skipped of queue.splice(0)) {
      if (settings.close) {
        skipped.form.close();
        scope.postMessage({ type: 'close', id: skipped.id, skipped: true });
      } else {
        kept.push(skipped);
        scope.postMessage({ type: 'drop', id: skipped.id });
      }
    }
  } else {
    job = queue.shift()!;
  }
  // The modelled draw cost: really keep this worker busy.
  const until = performance.now() + settings.delay;
  while (performance.now() < until) { /* busy */ }
  try {
    ctx.reset();
    ctx.fillStyle = '#fbfbf7';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawElementImage(job.form, at.x, at.y);
    scope.postMessage({ type: 'draw', id: job.id, at: absNow() });
  } catch (error) {
    scope.postMessage({ type: 'error', message: String(error) });
  }
  if (settings.close) {
    job.form.close();
    scope.postMessage({ type: 'close', id: job.id, skipped: false });
  } else {
    kept.push(job);
  }
  if (queue.length) schedule();
}

scope.onmessage = (event) => {
  const data = event.data as Record<string, unknown>;
  if (data.canvas) ctx = (data.canvas as OffscreenCanvas).getContext('2d') as DrawableOffscreen2D | null;
  if (typeof data.width === 'number' && typeof data.height === 'number' && ctx) {
    ctx.canvas.width = data.width;
    ctx.canvas.height = data.height;
    at = { x: Number(data.x) || 0, y: Number(data.y) || 0 };
  }
  if (data.settings) settings = data.settings as typeof settings;
  if (data.sweep) {
    for (const job of kept.splice(0)) {
      job.form.close();
      scope.postMessage({ type: 'close', id: job.id, skipped: false });
    }
  }
  if (data.form) {
    queue.push({ id: Number(data.id), form: data.form as ElementImage });
    scope.postMessage({ type: 'arrive', id: Number(data.id), at: absNow() });
    schedule();
  }
};
