/**
 * The dispatch puzzle: pure rules for the railway trial.
 *
 * A timetable is one ordered list of steps (time flows down). Fixed signs
 * mark the paint events and the moments the worker is free; the learner
 * places the operations between them. `checkTimetable` replays the list and
 * reports every rule it breaks.
 *
 * Rules backed by the explainer (README.md):
 *  - The worker needs the canvas first: `transferControlToOffscreen()` and
 *    a transfer in `postMessage` (OffscreenCanvas Example).
 *  - The main thread captures in its `paint` handler and posts the image
 *    with a transfer list (OffscreenCanvas Example).
 *  - `CanvasPaintEvent` is `[Exposed=Window]`: a worker never gets `paint` (IDL).
 *  - From a worker, only `ElementImage` may be passed to geometry calls
 *    (IDL comment on OffscreenCanvas.updateElementGeometry).
 *  - Geometry from a worker is batched, posted to the main thread, applied,
 *    and announced with `elementgeometryupdate`; reading the DOM before that
 *    gives the old geometry (5. Synchronizing the DOM and drawing).
 *
 * Railway rules of this game (our timetable discipline, not spec text):
 *  - No late trains: when a newer image has already arrived, draw the newest.
 *  - No leaks: every image you capture ends up closed. The explainer gives
 *    `close()` but does not say what it frees; we treat an unclosed image
 *    as cargo left in the yard.
 *  - Don't use an image after closing it.
 */

export type TokenOp =
  | 'transfer' | 'paint' | 'worker-free' | 'capture' | 'send' | 'draw' | 'close'
  | 'geometry' | 'read' | 'trap-worker-paint' | 'trap-worker-element';

export interface Token {
  id: string;
  op: TokenOp;
  /** Image (or frame) number for capture, send, draw, close and paint. */
  n?: number;
  /** Fixed signs cannot be moved or removed. */
  fixed?: boolean;
}

export type ViolationCode =
  | 'no-canvas' | 'capture-outside-paint' | 'send-outside-paint' | 'send-before-capture'
  | 'worker-busy' | 'draw-before-send' | 'draw-after-close' | 'close-before-send'
  | 'late-train' | 'geometry-before-draw' | 'stale-read' | 'worker-paint' | 'worker-element'
  | 'fixed-order' | 'unshipped' | 'leak' | 'undelivered' | 'no-read';

export interface Violation {
  code: ViolationCode;
  /** Position in the timetable, or -1 for an end-of-run problem. */
  index: number;
  message: string;
}

export interface RunResult {
  ok: boolean;
  violations: Violation[];
  drawn: number[];
  closed: number[];
  leaked: number[];
}

type Window = { kind: 'none' } | { kind: 'paint'; frame: number } | { kind: 'worker' };

export function checkTimetable(order: readonly Token[], skeleton: readonly Token[] = order.filter((t) => t.fixed)): RunResult {
  const violations: Violation[] = [];
  const flag = (code: ViolationCode, index: number, message: string) => violations.push({ code, index, message });
  let window: Window = { kind: 'none' };
  let transferred = false;
  const paints: number[] = [];
  const captured = new Set<number>();
  const sent: number[] = [];
  const drawn: number[] = [];
  const closed = new Set<number>();
  let lastDraw = -1;
  let lastGeometry = -1;
  let read = false;

  const fixedSeen = order.filter((t) => t.fixed).map((t) => t.id);
  if (fixedSeen.join() !== skeleton.map((t) => t.id).join()) {
    flag('fixed-order', -1, 'The station signs (paints and worker-free) must stay in their printed order.');
  }

  order.forEach((token, i) => {
    const n = token.n ?? 0;
    switch (token.op) {
      case 'transfer':
        transferred = true;
        break;
      case 'paint':
        window = { kind: 'paint', frame: n };
        paints.push(n);
        break;
      case 'worker-free':
        window = { kind: 'worker' };
        break;
      case 'capture':
        if (window.kind !== 'paint' || window.frame !== n) {
          flag('capture-outside-paint', i, `Capture #${n} inside paint ${n}'s handler, so it records frame ${n}'s snapshot. Only the main thread hears paint.`);
        }
        captured.add(n);
        break;
      case 'send':
        if (!captured.has(n)) flag('send-before-capture', i, `Image #${n} has not been captured yet: there is nothing to put on the train.`);
        if (!transferred) flag('no-canvas', i, 'The worker has no canvas yet. Transfer it with transferControlToOffscreen() first.');
        if (window.kind !== 'paint' || window.frame !== n) flag('send-outside-paint', i, `Post image #${n} from the same paint handler that captured it, as the explainer does.`);
        sent.push(n);
        break;
      case 'draw':
        if (window.kind !== 'worker') flag('worker-busy', i, 'The worker is busy here. Worker steps go after a "worker free" sign.');
        if (!sent.includes(n)) flag('draw-before-send', i, `Image #${n} has not arrived at the worker.`);
        if (closed.has(n)) flag('draw-after-close', i, `Image #${n} was already closed. Never use an image after close().`);
        if (sent.some((m) => m > n)) flag('late-train', i, `A newer image is already waiting, so #${n} is a late train. Draw the newest and close the rest.`);
        drawn.push(n);
        lastDraw = i;
        break;
      case 'close':
        if (window.kind !== 'worker') flag('worker-busy', i, 'The worker is busy here. Worker steps go after a "worker free" sign.');
        if (!sent.includes(n)) flag('close-before-send', i, `Image #${n} never reached the worker, so the worker cannot close it.`);
        closed.add(n);
        break;
      case 'geometry':
        if (lastDraw < 0) flag('geometry-before-draw', i, 'elementgeometryupdate comes after the worker draws: drawing updates geometry, which is batched and posted home.');
        lastGeometry = i;
        break;
      case 'read':
        read = true;
        if (lastDraw < 0 || lastGeometry < lastDraw) flag('stale-read', i, 'Read too early: the newest geometry only applies when elementgeometryupdate fires.');
        break;
      case 'trap-worker-paint':
        flag('worker-paint', i, 'Workers never get paint: CanvasPaintEvent is exposed on Window only.');
        break;
      case 'trap-worker-element':
        flag('worker-element', i, 'From a worker, only an ElementImage may be passed, never the element itself.');
        break;
    }
  });

  for (const frame of paints) {
    if (!captured.has(frame) || !sent.includes(frame)) flag('unshipped', -1, `Paint ${frame} must capture its image and put it on the train.`);
  }
  const leaked = [...captured].filter((n) => !closed.has(n)).sort((a, b) => a - b);
  for (const n of leaked) flag('leak', -1, `Image #${n} was never closed: cargo left in the yard.`);
  const newest = sent.length ? Math.max(...sent) : 0;
  if (newest && !drawn.includes(newest)) flag('undelivered', -1, `The newest image, #${newest}, never reached the canvas.`);
  if (!read) flag('no-read', -1, "Finish by reading the form's position once its geometry is home.");

  return { ok: violations.length === 0, violations, drawn, closed: [...closed].sort((a, b) => a - b), leaked };
}

/** The code each token stands for, as shown on the board. */
export function tokenCode(token: Token): string {
  const n = token.n ?? 0;
  switch (token.op) {
    case 'transfer': return 'worker.postMessage({ canvas: offscreen }, [offscreen])';
    case 'paint': return `paint ${n} fires`;
    case 'worker-free': return 'worker is free';
    case 'capture': return `img${n} = canvas.captureElementImage(form)`;
    case 'send': return `worker.postMessage({ form: img${n} }, [img${n}])`;
    case 'draw': return `ctx.drawElementImage(img${n}, 100, 0)`;
    case 'close': return `img${n}.close()`;
    case 'geometry': return "'elementgeometryupdate' fires";
    case 'read': return 'form.getBoundingClientRect()';
    case 'trap-worker-paint': return "self.addEventListener('paint', …)";
    case 'trap-worker-element': return 'offscreen.updateElementGeometry(form, …)';
  }
}

export type Lane = 'main' | 'worker' | 'sign';

export function tokenLane(token: Token): Lane {
  if (token.fixed) return 'sign';
  return ['draw', 'close', 'trap-worker-paint', 'trap-worker-element'].includes(token.op) ? 'worker' : 'main';
}
