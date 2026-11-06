/**
 * The clockwork model: a step-by-step simulation of "update the rendering"
 * as the explainer lists it (README, "Alternatives considered: paint event
 * timing"), with the `paint` event placed per Option A, B or C.
 *
 * This is a teaching model of the explainer's step list, not the HTML spec:
 *  - Step numbers are as numbered in the explainer.
 *  - A and B "loop back to 16.2.1 if needed"; the explainer gives no cap,
 *    so the model stops after MAX_LAPS laps and marks the frame unsettled.
 *  - Under Option A with placeholders, a WebGL call that needs a flush
 *    (`getError()`) jams the clockwork: "a deadlock or inconsistent rendering".
 *
 * The lab and the trial both call these functions; tests pin them to the README.
 */

export type StepId = 'raf' | 'style' | 'resize' | 'intersection' | 'paint' | 'paint-event' | 'commit';
export type OptionId = 'A' | 'B' | 'C';
/** Option A's two sub-options: a synchronous Paint, or placeholders filled at the next Paint. */
export type AMode = 'sync-paint' | 'placeholders';
export type InjectId = 'raf-edit' | 'resize' | 'draw-in-paint' | 'dom-edit-in-paint' | 'request-in-paint' | 'gl-flush' | 'echo';

export interface StepInfo {
  id: StepId;
  /** As numbered in the explainer; empty for steps it does not name. */
  number: string;
  label: string;
  short: string;
}

export const STEPS: readonly StepInfo[] = [
  { id: 'raf', number: '14', label: 'Run animation frame callbacks', short: 'rAF' },
  { id: 'style', number: '16.2.1', label: 'Recalculate styles and update layout', short: 'Style + layout' },
  { id: 'resize', number: '16.2.6', label: 'Deliver resize observers', short: 'Resize observers' },
  { id: 'intersection', number: '19', label: 'Run the update intersection observations steps', short: 'Intersection' },
  { id: 'paint', number: '', label: 'Paint: record the painted output', short: 'Paint' },
  { id: 'paint-event', number: '', label: 'Fire the canvas `paint` event', short: 'paint event' },
  { id: 'commit', number: '', label: 'Commit / thread handoff', short: 'Commit' },
];

/** The selected design (Option C): the order every rendering update runs in. */
export const OPTION_C_ORDER: readonly StepId[] = ['raf', 'style', 'resize', 'intersection', 'paint', 'paint-event', 'commit'];

export const MAX_LAPS = 4;
export const FRAMES = 4;

export function stepInfo(id: StepId): StepInfo {
  return STEPS.find((s) => s.id === id)!;
}

export type TickKind = 'step' | 'handler' | 'loop' | 'jam' | 'quiet' | 'partial';

export interface Tick {
  frame: number;
  step: StepId;
  lap: number;
  kind: TickKind;
  note: string;
}

export interface FrameSummary {
  frame: number;
  handlerRuns: number;
  laps: number;
  paintFired: boolean;
  unsettled: boolean;
  jammed: boolean;
}

/** Frame where an injection's effect shows up; 'jam' if it deadlocks; null if never in the window. */
export type Landing = number | 'jam' | null;

export interface Simulation {
  ticks: Tick[];
  frames: FrameSummary[];
  landings: Partial<Record<InjectId, Landing>>;
  deadlock: boolean;
}

export interface SimOptions {
  option: OptionId;
  aMode?: AMode;
  inject: readonly InjectId[];
  frames?: number;
  /** A drawable canvas nested inside the lab canvas: both get `paint`. */
  nested?: boolean;
}

/** Frame 1 always has a pending requestPaint(), so the handler runs at least once. */
export function simulate({ option, aMode = 'placeholders', inject, frames = FRAMES, nested = false }: SimOptions): Simulation {
  const has = (id: InjectId) => inject.includes(id);
  const ticks: Tick[] = [];
  const summaries: FrameSummary[] = [];
  const landings: Partial<Record<InjectId, Landing>> = {};
  const land = (id: InjectId, at: Landing) => {
    if (has(id) && landings[id] === undefined) landings[id] = at;
  };
  let dirty = new Set<InjectId>(); // DOM edits waiting for style + layout
  let requested = true; // the lab's starting requestPaint()
  let requestSource: InjectId | null = null;
  let requestNext = false; // requestPaint() called inside paint: for the next frame
  let resizePending = has('resize');
  let deadlock = false;
  let editedOnce = false;

  for (let f = 1; f <= frames; f++) {
    const sum: FrameSummary = { frame: f, handlerRuns: 0, laps: 1, paintFired: false, unsettled: false, jammed: false };
    summaries.push(sum);
    if (deadlock) {
      sum.jammed = true;
      continue;
    }
    let lap = 1;
    let changed = false;
    if (requestNext) {
      requestNext = false;
      requested = true;
      requestSource = 'request-in-paint';
    }
    const tick = (step: StepId, kind: TickKind, note: string) => ticks.push({ frame: f, step, lap, kind, note });

    if (f === 1 && has('raf-edit')) {
      dirty.add('raf-edit');
      tick('raf', 'step', 'Your rAF callback edits #card.');
    } else tick('raf', 'step', 'No callbacks queued.');

    const styleAndResize = () => {
      if (dirty.size) {
        tick('style', 'step', `Restyle and relayout: ${[...dirty].join(', ')}.`);
        dirty.forEach((id) => land(id, f));
        dirty = new Set();
        changed = true;
      } else tick('style', 'step', 'Nothing dirty.');
      if (resizePending) {
        resizePending = false;
        requested = true;
        requestSource = 'resize';
        tick('resize', 'step', 'Your ResizeObserver resizes the canvas grid and calls requestPaint().');
      } else tick('resize', 'step', 'No size changes.');
    };

    /** Runs the paint event; returns true if the handler dirtied the DOM. */
    const paintEvent = (): boolean => {
      if (!changed && !requested) {
        tick('paint-event', 'quiet', 'Nothing changed and nothing requested: no paint event.');
        return false;
      }
      if (requestSource) land(requestSource, f);
      requested = false;
      requestSource = null;
      sum.paintFired = true;
      sum.handlerRuns += 1;
      const first = f === 1 && sum.handlerRuns === 1;
      const order = nested ? 'inner canvas first, then the outer canvas' : 'your canvas';
      tick('paint-event', 'handler', `paint fires (${order}). Handler run ${sum.handlerRuns}.`);
      let edited = false;
      if (first && has('draw-in-paint')) {
        land('draw-in-paint', f);
        tick('paint-event', 'handler', option === 'A' && aMode === 'placeholders'
          ? 'drawElementImage() is buffered as a placeholder until Paint.'
          : 'drawElementImage() draws the locked-in snapshot.');
      }
      if (first && has('gl-flush')) {
        if (option === 'A' && aMode === 'placeholders') {
          deadlock = true;
          sum.jammed = true;
          land('gl-flush', 'jam');
          tick('paint-event', 'jam', 'gl.getError() must flush, but the placeholders wait for Paint: deadlock.');
          return false;
        }
        land('gl-flush', f);
        tick('paint-event', 'handler', 'gl.getError() flushes fine: the display list is complete.');
      }
      if (first && has('request-in-paint')) {
        requestNext = true;
        tick('paint-event', 'handler', 'requestPaint(): one more paint at the next rendering opportunity.');
      }
      if (has('dom-edit-in-paint') && !editedOnce) {
        editedOnce = true;
        dirty.add('dom-edit-in-paint');
        edited = true;
      }
      if (has('echo')) {
        dirty.add('echo');
        edited = true;
      }
      if (edited) tick('paint-event', 'handler', 'The handler edits the DOM.');
      return edited;
    };

    const loopBack = (): boolean => {
      if (lap >= MAX_LAPS) {
        sum.unsettled = true;
        tick('style', 'loop', `Still dirty after ${MAX_LAPS} laps: the model gives up (the explainer sets no limit).`);
        return false;
      }
      lap += 1;
      sum.laps = lap;
      tick('style', 'loop', 'Loop back to 16.2.1.');
      return true;
    };

    if (option === 'A') {
      for (;;) {
        styleAndResize();
        tick('paint', 'partial', aMode === 'sync-paint'
          ? 'Synchronous Paint of the drawables (expensive, repeated each lap).'
          : 'No Paint yet: drawables are recorded as placeholders.');
        const edited = paintEvent();
        if (deadlock || !edited || !loopBack()) break;
      }
      if (!deadlock) {
        tick('intersection', 'step', 'Intersection observations.');
        tick('paint', 'step', aMode === 'placeholders' ? 'Paint: placeholders are replaced with real rendering.' : 'Paint.');
      }
    } else {
      for (;;) {
        styleAndResize();
        tick('intersection', 'step', 'Intersection observations.');
        tick('paint', 'step', 'Paint: the display list is complete.');
        const edited = paintEvent();
        if (option === 'C' || !edited || !loopBack()) break;
      }
    }
    if (deadlock) continue;
    tick('commit', 'step', dirty.size ? `Commit. Waiting for next frame: ${[...dirty].join(', ')}.` : 'Commit: the frame is handed off.');
  }

  for (const id of inject) if (landings[id] === undefined) landings[id] = null;
  return { ticks, frames: summaries, landings, deadlock };
}

/** "this" frame, "next" frame, or neither, relative to frame 1. */
export type Relative = 'this' | 'next' | 'jam' | 'never';

export function relativeLanding(landing: Landing | undefined): Relative {
  if (landing === 'jam') return 'jam';
  if (landing === 1) return 'this';
  if (landing === 2) return 'next';
  return 'never';
}
