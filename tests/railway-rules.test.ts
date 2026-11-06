/**
 * Railway rules, pinned to the explainer (README.md, OffscreenCanvas
 * Example; IDL; 5. Synchronizing the DOM and drawing). Game-only rules
 * (late trains, leaks) are tested as the game defines them.
 */
import { describe, expect, it } from 'vitest';
import { LEVELS, type Level } from '../src/chapters/roll-08-railway/levels';
import { checkTimetable, type Token, type ViolationCode } from '../src/chapters/roll-08-railway/rules';
import { advanceRail, createRailState, inFlight, LATE_MS, sweepRail, type RailSettings } from '../src/chapters/roll-08-railway/sim';

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;

/** Build a timetable from token ids (fixed signs and tray tokens). */
function plan(l: Level, ids: string[]): Token[] {
  const all = [...l.skeleton, ...l.tray];
  return ids.map((id) => {
    const token = all.find((t) => t.id === id);
    if (!token) throw new Error(`no token ${id}`);
    return token;
  });
}
const codes = (l: Level, ids: string[]): ViolationCode[] =>
  checkTimetable(plan(l, ids), l.skeleton).violations.map((v) => v.code);

const FIRST = ['transfer', 'paint1', 'capture1', 'send1', 'worker-free', 'draw1', 'close1', 'geometry', 'read'];
const RUSH = ['transfer', 'paint1', 'capture1', 'send1', 'paint2', 'capture2', 'send2', 'worker-free', 'draw2', 'close1', 'close2', 'geometry', 'read'];
const LONG = ['transfer', 'paint1', 'capture1', 'send1', 'worker-free-1', 'draw1', 'close1', 'paint2', 'capture2', 'send2',
  'paint3', 'capture3', 'send3', 'worker-free-2', 'draw3', 'close2', 'close3', 'geometry', 'read'];

describe('dispatch timetables: the reference solutions pass', () => {
  it.each([['first-run', FIRST], ['rush-hour', RUSH], ['long-haul', LONG]] as const)('%s', (id, ids) => {
    expect(codes(level(id), [...ids])).toEqual([]);
  });

  it('every level has a solvable tray (the reference uses only its tokens)', () => {
    for (const [id, ids] of [['first-run', FIRST], ['rush-hour', RUSH], ['long-haul', LONG]] as const) {
      expect(() => plan(level(id), [...ids])).not.toThrow();
    }
  });
});

describe('rules from the explainer', () => {
  const l = level('first-run');

  it('the worker needs the transferred canvas before images are posted (OffscreenCanvas Example)', () => {
    expect(codes(l, FIRST.filter((x) => x !== 'transfer'))).toContain('no-canvas');
  });

  it('capture happens in the paint handler on the main thread', () => {
    const moved = ['transfer', 'capture1', 'paint1', 'send1', 'worker-free', 'draw1', 'close1', 'geometry', 'read'];
    expect(codes(l, moved)).toContain('capture-outside-paint');
  });

  it('workers never get paint: CanvasPaintEvent is [Exposed=Window] (IDL)', () => {
    expect(codes(l, [...FIRST, 'trap-worker-paint'])).toContain('worker-paint');
  });

  it('from a worker only an ElementImage may be passed (IDL comment)', () => {
    expect(codes(level('rush-hour'), [...RUSH, 'trap-worker-element'])).toContain('worker-element');
  });

  it('elementgeometryupdate comes after the worker draw; reading earlier is stale (R:51, R:385-388)', () => {
    expect(codes(l, ['transfer', 'paint1', 'capture1', 'send1', 'worker-free', 'geometry', 'draw1', 'close1', 'read']))
      .toEqual(expect.arrayContaining(['geometry-before-draw', 'stale-read']));
    expect(codes(l, ['transfer', 'paint1', 'capture1', 'send1', 'read', 'worker-free', 'draw1', 'close1', 'geometry']))
      .toContain('stale-read');
  });
});

describe('railway rules of the game', () => {
  it('drawing an older image when a newer one waits is a late train', () => {
    const l = level('rush-hour');
    const late = RUSH.map((x) => (x === 'draw2' ? 'draw1' : x));
    expect(codes(l, late)).toEqual(expect.arrayContaining(['late-train', 'undelivered']));
  });

  it('an image that is never closed leaks', () => {
    const l = level('rush-hour');
    const result = checkTimetable(plan(l, RUSH.filter((x) => x !== 'close1')), l.skeleton);
    expect(result.leaked).toEqual([1]);
    expect(result.violations.map((v) => v.code)).toEqual(['leak']);
  });

  it('never uses an image after closing it', () => {
    const l = level('first-run');
    expect(codes(l, ['transfer', 'paint1', 'capture1', 'send1', 'worker-free', 'close1', 'draw1', 'geometry', 'read'])).toContain('draw-after-close');
  });

  it('worker steps only run when the worker is free', () => {
    const l = level('rush-hour');
    const early = ['transfer', 'paint1', 'capture1', 'send1', 'draw1', 'close1', 'paint2', 'capture2', 'send2', 'worker-free', 'draw2', 'close2', 'geometry', 'read'];
    expect(codes(l, early)).toEqual(['worker-busy', 'worker-busy']);
  });

  it('every paint ships its image, and moving signs is caught', () => {
    const l = level('rush-hour');
    expect(codes(l, RUSH.filter((x) => x !== 'send1'))).toContain('unshipped');
    const swapped = RUSH.map((x) => (x === 'paint1' ? 'paint2' : x === 'paint2' ? 'paint1' : x));
    expect(codes(l, swapped)).toContain('fixed-order');
  });

  it('an empty timetable cannot pass', () => {
    expect(checkTimetable(level('first-run').skeleton).ok).toBe(false);
  });
});

describe('railway simulation', () => {
  const base: RailSettings = { captureEvery: 1, workerDelayMs: 0, closeImages: true, skipToNewest: false };
  const run = (settings: RailSettings, ms: number) => {
    const state = createRailState();
    const events = advanceRail(state, settings, ms + 1);
    return { state, events };
  };

  it('a fast worker draws every frame on time and closes everything', () => {
    const { state, events } = run(base, 1000);
    expect(events.filter((e) => e.kind === 'capture').length).toBe(60);
    expect(state.late).toBe(0);
    expect(state.open.size).toBeLessThanOrEqual(1);
    expect(state.geometryEvents).toBeGreaterThan(55);
  });

  it('geometry comes home after the draw, never before', () => {
    const { events } = run(base, 200);
    const drawAt = events.find((e) => e.kind === 'draw')!.at;
    const geomAt = events.find((e) => e.kind === 'geometry')!.at;
    expect(geomAt).toBeGreaterThan(drawAt);
  });

  it('a slow worker makes late trains and a growing queue', () => {
    const { state } = run({ ...base, workerDelayMs: 40 }, 2000);
    expect(state.late).toBeGreaterThan(0);
    expect(inFlight(state)).toBeGreaterThan(10);
  });

  it('skipping to the newest keeps trains on time', () => {
    const { state } = run({ ...base, workerDelayMs: 40, skipToNewest: true }, 2000);
    expect(state.late).toBe(0);
    expect(state.lastLatency).toBeLessThanOrEqual(LATE_MS);
    expect(state.open.size).toBeLessThanOrEqual(4);
  });

  it('without close(), open images pile up; skipping without closing drops them still open', () => {
    expect(run({ ...base, closeImages: false }, 1000).state.open.size).toBe(60);
    const { state, events } = run({ ...base, workerDelayMs: 40, skipToNewest: true, closeImages: false }, 1000);
    expect(events.some((e) => e.kind === 'drop')).toBe(true);
    expect(state.open.size).toBe(events.filter((e) => e.kind === 'capture').length);
  });

  it('capturing less often lowers the load', () => {
    const { events } = run({ ...base, captureEvery: 4 }, 1000);
    expect(events.filter((e) => e.kind === 'capture').length).toBe(15);
  });

  it('sweeping closes every kept image but leaves the ones still on the railway', () => {
    const { state } = run({ ...base, workerDelayMs: 40, closeImages: false }, 1000);
    const travelling = inFlight(state);
    const closed = sweepRail(state);
    expect(closed.length).toBeGreaterThan(0);
    expect(state.open.size).toBe(travelling);
  });
});
