/**
 * The railway model: a pure, deterministic simulation of the explainer's
 * OffscreenCanvas flow, used by the simulated lab and by tests.
 *
 *   main thread, every Nth paint:  captureElementImage(form) -> postMessage(img, [img])
 *   worker, one message at a time: drawElementImage(img, …)   (busy for `workerDelayMs`)
 *                                  -> geometry update, batched and posted home
 *   main thread:                   geometry applied, `elementgeometryupdate` fires
 *
 * What is modelled, not specified: message hop time, the worker's draw cost,
 * and "open" images. The explainer gives `ElementImage.close()` without
 * saying what it frees, so `open` simply counts images nobody has closed.
 */

export interface RailSettings {
  /** Capture on every Nth paint (1 = every frame). */
  captureEvery: number;
  /** How long the worker is busy per draw, in ms. */
  workerDelayMs: number;
  /** Worker calls `close()` on each image once it is done with it. */
  closeImages: boolean;
  /** When several images wait, draw only the newest and drop the rest. */
  skipToNewest: boolean;
}

export const FRAME_MS = 1000 / 60;
/** Modelled postMessage hop between threads. */
export const HOP_MS = 4;
/** A snapshot drawn more than this long after its capture is a late train. */
export const LATE_MS = 100;

export type RailEvent =
  | { kind: 'capture'; id: number; at: number }
  | { kind: 'arrive'; id: number; at: number }
  | { kind: 'draw'; id: number; at: number; latency: number; late: boolean }
  | { kind: 'close'; id: number; at: number; skipped: boolean }
  | { kind: 'drop'; id: number; at: number }
  | { kind: 'geometry'; ids: number[]; at: number; staleness: number; elements?: string[] };

export interface RailState {
  now: number;
  frame: number;
  nextId: number;
  capturedAt: Map<number, number>;
  outbound: Array<{ id: number; arriveAt: number }>;
  queue: number[];
  working: { id: number; doneAt: number } | null;
  inbound: Array<{ id: number; arriveAt: number }>;
  open: Set<number>;
  lastLatency: number;
  draws: number;
  late: number;
  geometryEvents: number;
}

export function createRailState(): RailState {
  return {
    now: 0, frame: 0, nextId: 1, capturedAt: new Map(), outbound: [], queue: [], working: null,
    inbound: [], open: new Set(), lastLatency: 0, draws: 0, late: 0, geometryEvents: 0,
  };
}

/** Advance the model to `until` ms, returning everything that happened, in time order. */
export function advanceRail(state: RailState, settings: RailSettings, until: number): RailEvent[] {
  const events: RailEvent[] = [];
  for (;;) {
    const nextFrame = (state.frame + 1) * FRAME_MS;
    const candidates = [
      nextFrame,
      ...state.outbound.map((m) => m.arriveAt),
      state.working ? state.working.doneAt : Infinity,
      ...state.inbound.map((m) => m.arriveAt),
    ];
    const t = Math.min(...candidates);
    if (t > until) break;
    state.now = t;

    // Geometry batches arriving home apply first, as one event per arrival time.
    const home = state.inbound.filter((m) => m.arriveAt <= t);
    if (home.length) {
      state.inbound = state.inbound.filter((m) => m.arriveAt > t);
      const ids = home.map((m) => m.id);
      const newest = Math.max(...ids);
      state.geometryEvents += 1;
      events.push({ kind: 'geometry', ids, at: t, staleness: t - (state.capturedAt.get(newest) ?? t) });
      ids.forEach((id) => state.capturedAt.delete(id));
    }

    for (const m of state.outbound.filter((m) => m.arriveAt <= t)) {
      state.queue.push(m.id);
      events.push({ kind: 'arrive', id: m.id, at: t });
    }
    state.outbound = state.outbound.filter((m) => m.arriveAt > t);

    if (state.working && state.working.doneAt <= t) finishDraw(state, settings, events);

    if (t === nextFrame) {
      state.frame += 1;
      if (state.frame % Math.max(1, settings.captureEvery) === 0) {
        const id = state.nextId++;
        state.capturedAt.set(id, t);
        state.open.add(id);
        state.outbound.push({ id, arriveAt: t + HOP_MS });
        events.push({ kind: 'capture', id, at: t });
      }
    }

    if (!state.working && state.queue.length) startDraw(state, settings, events);
  }
  state.now = until;
  return events;
}

function startDraw(state: RailState, settings: RailSettings, events: RailEvent[]): void {
  let id: number;
  if (settings.skipToNewest && state.queue.length > 1) {
    id = state.queue.pop()!;
    for (const skipped of state.queue) {
      state.capturedAt.delete(skipped);
      if (settings.closeImages) {
        state.open.delete(skipped);
        events.push({ kind: 'close', id: skipped, at: state.now, skipped: true });
      } else {
        events.push({ kind: 'drop', id: skipped, at: state.now });
      }
    }
    state.queue = [];
  } else {
    id = state.queue.shift()!;
  }
  state.working = { id, doneAt: state.now + Math.max(0, settings.workerDelayMs) };
  if (settings.workerDelayMs <= 0) finishDraw(state, settings, events);
}

function finishDraw(state: RailState, settings: RailSettings, events: RailEvent[]): void {
  const { id } = state.working!;
  state.working = null;
  const latency = state.now - (state.capturedAt.get(id) ?? state.now);
  const late = latency > LATE_MS;
  state.lastLatency = latency;
  state.draws += 1;
  if (late) state.late += 1;
  events.push({ kind: 'draw', id, at: state.now, latency, late });
  if (settings.closeImages) {
    state.open.delete(id);
    events.push({ kind: 'close', id, at: state.now, skipped: false });
  }
  // A 2D drawElementImage updates geometry; the worker's batch is posted home.
  state.inbound.push({ id, arriveAt: state.now + HOP_MS });
}

/**
 * Close every open image that is no longer on the railway: the worker kept
 * them (it never closed them), so it can still close them now.
 */
export function sweepRail(state: RailState): RailEvent[] {
  const busy = new Set([...state.outbound.map((m) => m.id), ...state.queue, ...(state.working ? [state.working.id] : [])]);
  const events: RailEvent[] = [];
  for (const id of [...state.open]) {
    if (busy.has(id)) continue;
    state.open.delete(id);
    state.capturedAt.delete(id);
    events.push({ kind: 'close', id, at: state.now, skipped: false });
  }
  return events;
}

/** Images on their way or waiting for the worker. */
export function inFlight(state: RailState): number {
  return state.outbound.length + state.queue.length + (state.working ? 1 : 0);
}
