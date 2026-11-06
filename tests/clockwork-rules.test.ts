/**
 * The clockwork model, pinned to the explainer (README, "3. The paint event"
 * and "Alternatives considered: paint event timing").
 */
import { describe, expect, it } from 'vitest';
import { MAX_LAPS, OPTION_C_ORDER, relativeLanding, simulate, type StepId } from '../src/chapters/roll-11-clockwork/rules';
import { isCorrect, moveStep, predictions, scoreOrder, shuffledSteps } from '../src/chapters/roll-11-clockwork/trial-rules';

const stepsOfFrame = (ticks: ReturnType<typeof simulate>['ticks'], frame: number) =>
  ticks.filter((t) => t.frame === frame && t.kind !== 'loop').map((t) => t.step)
    .filter((s, i, all) => s !== all[i - 1]);

describe('Option C (selected design)', () => {
  it('runs the steps in the explainer’s order, with paint right after Paint', () => {
    const sim = simulate({ option: 'C', inject: [] });
    expect(stepsOfFrame(sim.ticks, 1)).toEqual(OPTION_C_ORDER);
    const order = OPTION_C_ORDER as StepId[];
    expect(order.indexOf('paint-event')).toBe(order.indexOf('paint') + 1);
    expect(order.indexOf('resize')).toBeLessThan(order.indexOf('paint'));
    expect(order.indexOf('intersection')).toBeLessThan(order.indexOf('paint-event'));
  });

  it('runs paint once per update, even when the handler edits the DOM', () => {
    const sim = simulate({ option: 'C', inject: ['echo'] });
    sim.frames.forEach((f) => {
      expect(f.handlerRuns).toBe(1);
      expect(f.laps).toBe(1);
    });
  });

  it('lands canvas drawing this frame and DOM edits next frame', () => {
    const sim = simulate({ option: 'C', inject: ['draw-in-paint', 'dom-edit-in-paint'] });
    expect(sim.landings['draw-in-paint']).toBe(1);
    expect(sim.landings['dom-edit-in-paint']).toBe(2);
  });

  it('fires paint again next frame because the edited snapshot changed, then goes quiet', () => {
    const sim = simulate({ option: 'C', inject: ['dom-edit-in-paint'] });
    expect(sim.frames.map((f) => f.paintFired)).toEqual([true, true, false, false]);
  });

  it('lands rAF edits and resize-observer work in the same frame', () => {
    const sim = simulate({ option: 'C', inject: ['raf-edit', 'resize'] });
    expect(sim.landings['raf-edit']).toBe(1);
    expect(sim.landings.resize).toBe(1);
  });

  it('serves requestPaint() from inside paint at the next rendering opportunity', () => {
    expect(simulate({ option: 'C', inject: ['request-in-paint'] }).landings['request-in-paint']).toBe(2);
    expect(simulate({ option: 'B', inject: ['request-in-paint', 'dom-edit-in-paint'] }).landings['request-in-paint']).toBe(2);
  });

  it('is quiet when nothing changed and nothing was requested', () => {
    const sim = simulate({ option: 'C', inject: [] });
    expect(sim.frames.map((f) => f.paintFired)).toEqual([true, false, false, false]);
  });

  it('never deadlocks on a WebGL flush: the display list is complete', () => {
    expect(simulate({ option: 'C', inject: ['gl-flush'] }).deadlock).toBe(false);
  });
});

describe('Options A and B (rejected)', () => {
  it('loop back to 16.2.1 so a DOM edit in paint lands this frame, at the cost of a second handler run', () => {
    for (const option of ['A', 'B'] as const) {
      const sim = simulate({ option, aMode: 'sync-paint', inject: ['dom-edit-in-paint'] });
      expect(sim.landings['dom-edit-in-paint']).toBe(1);
      expect(sim.frames[0]!.handlerRuns).toBe(2);
      expect(sim.frames[0]!.laps).toBe(2);
    }
  });

  it('B re-runs more steps per lap than A', () => {
    // Steps re-run inside lap 2: from the loop-back up to the paint event.
    const lapSteps = (option: 'A' | 'B') => {
      const lap = simulate({ option, aMode: 'sync-paint', inject: ['dom-edit-in-paint'] })
        .ticks.filter((t) => t.frame === 1 && t.lap === 2 && t.kind !== 'loop');
      return lap.slice(0, lap.findIndex((t) => t.step === 'paint-event')).length;
    };
    expect(lapSteps('B')).toBeGreaterThan(lapSteps('A'));
  });

  it('never settle against a handler that edits every time (model cap)', () => {
    const sim = simulate({ option: 'B', inject: ['echo'] });
    expect(sim.frames[0]!.unsettled).toBe(true);
    expect(sim.frames[0]!.handlerRuns).toBe(MAX_LAPS);
  });

  it('A with placeholders deadlocks on a flushing WebGL call; sync Paint does not', () => {
    const jam = simulate({ option: 'A', aMode: 'placeholders', inject: ['gl-flush'] });
    expect(jam.deadlock).toBe(true);
    expect(jam.landings['gl-flush']).toBe('jam');
    expect(jam.frames.slice(1).every((f) => f.jammed)).toBe(true);
    expect(simulate({ option: 'A', aMode: 'sync-paint', inject: ['gl-flush'] }).deadlock).toBe(false);
    expect(simulate({ option: 'B', inject: ['gl-flush'] }).deadlock).toBe(false);
  });

  it('A fires paint before Paint, at resize observer timing', () => {
    const steps = stepsOfFrame(simulate({ option: 'A', inject: [] }).ticks, 1);
    expect(steps.indexOf('paint-event')).toBeGreaterThan(steps.indexOf('resize'));
    expect(steps.indexOf('paint-event')).toBeLessThan(steps.indexOf('intersection'));
  });
});

describe('relativeLanding', () => {
  it('maps frames to this/next/jam/never', () => {
    expect(relativeLanding(1)).toBe('this');
    expect(relativeLanding(2)).toBe('next');
    expect(relativeLanding('jam')).toBe('jam');
    expect(relativeLanding(null)).toBe('never');
  });
});

describe('trial: ordering', () => {
  it('accepts only the Option C order', () => {
    expect(scoreOrder(OPTION_C_ORDER).solved).toBe(true);
    const swapped = moveStep(OPTION_C_ORDER, 4, 1); // paint event before Paint
    expect(scoreOrder(swapped).solved).toBe(false);
    expect(scoreOrder(swapped).correctCount).toBe(OPTION_C_ORDER.length - 2);
  });

  it('never deals a solved hand and keeps every step', () => {
    for (let seed = 0; seed < 50; seed++) {
      const hand = shuffledSteps(seed);
      expect(scoreOrder(hand).solved).toBe(false);
      expect([...hand].sort()).toEqual([...OPTION_C_ORDER].sort());
    }
  });

  it('ignores moves off either end', () => {
    expect(moveStep(OPTION_C_ORDER, 0, -1)).toEqual([...OPTION_C_ORDER]);
  });
});

describe('trial: predictions', () => {
  const byId = (id: string) => predictions().find((p) => p.id === id)!;
  it('match the README', () => {
    expect(byId('raf-edit').answer).toBe('this');
    expect(byId('resize').answer).toBe('this');
    expect(byId('draw').answer).toBe('this');
    expect(byId('dom-edit').answer).toBe('next');
    expect(byId('request').answer).toBe('next');
    expect(byId('option-b-loop').answer).toBe('two-runs');
    expect(byId('option-a-flush').answer).toBe('jam');
    expect(byId('nested').answer).toBe('inner');
    expect(byId('frames').answer).toBe('child-frame');
  });

  it('every answer is one of its options, and exactly one option is right', () => {
    for (const p of predictions()) {
      expect(p.options.filter((o) => isCorrect(p, o.value))).toHaveLength(1);
    }
  });
});
