import { describe, expect, it } from 'vitest';
import {
  FRAME_SILVER,
  hydrate,
  initialState,
  isComplete,
  isUnlocked,
  rankFor,
  reduce,
  type Action,
  type GameState,
} from '../src/game/state';
import { createGameStore } from '../src/game/store';
import { createMemoryStore } from '../src/core/storage';

const run = (actions: Action[], from: GameState = initialState()) =>
  actions.reduce<{ state: GameState; rewards: ReturnType<typeof reduce>['rewards'] }>(
    (acc, action) => {
      const t = reduce(acc.state, action);
      return { state: t.state, rewards: [...acc.rewards, ...t.rewards] };
    },
    { state: from, rewards: [] },
  );

describe('unlocking', () => {
  it('starts with only the prologue open', () => {
    const s = initialState();
    expect(isUnlocked(s, 'prologue')).toBe(true);
    expect(isUnlocked(s, 'fog')).toBe(false);
  });

  it('opens the next roll only when the trial is finished, not story or lab', () => {
    const afterStoryAndLab = run([
      { type: 'complete-frame', roll: 'prologue', frame: 'story' },
      { type: 'complete-frame', roll: 'prologue', frame: 'lab' },
    ]).state;
    expect(isUnlocked(afterStoryAndLab, 'fog')).toBe(false);

    const { state, rewards } = run([{ type: 'complete-frame', roll: 'prologue', frame: 'trial' }], afterStoryAndLab);
    expect(isUnlocked(state, 'fog')).toBe(true);
    expect(rewards).toContainEqual({ kind: 'unlock', roll: 'fog' });
    // Practice is not required to unlock, but it is required to complete.
    expect(isComplete(state, 'prologue')).toBe(false);
  });

  it('ignores frames of locked rolls', () => {
    const t = reduce(initialState(), { type: 'complete-frame', roll: 'bells', frame: 'story' });
    expect(t.rewards).toEqual([]);
    expect(t.state.frames.bells).toBeUndefined();
  });

  it('unlock-all opens everything without granting progress', () => {
    const { state } = run([{ type: 'unlock-all' }]);
    expect(isUnlocked(state, 'epilogue')).toBe(true);
    expect(state.silver).toBe(0);
  });
});

describe('rewards', () => {
  it('pays silver once per frame and awards that frame’s negatives', () => {
    const first = run([{ type: 'complete-frame', roll: 'prologue', frame: 'story' }]);
    expect(first.state.silver).toBe(FRAME_SILVER.story);
    expect(first.state.negatives).toContain('why');

    const again = run([{ type: 'complete-frame', roll: 'prologue', frame: 'story' }], first.state);
    expect(again.state.silver).toBe(FRAME_SILVER.story);
    expect(again.rewards).toEqual([]);
  });

  it('awards stamps once, with their silver', () => {
    const { state, rewards } = run([
      { type: 'earn-stamp', id: 'first-light' },
      { type: 'earn-stamp', id: 'first-light' },
    ]);
    expect(state.stamps).toEqual(['first-light']);
    expect(rewards.filter((r) => r.kind === 'stamp')).toHaveLength(1);
  });

  it('rejects unknown stamps and negatives', () => {
    const { state, rewards } = run([
      { type: 'earn-stamp', id: 'nope' },
      { type: 'collect-negative', id: 'nope' },
    ]);
    expect(state).toEqual(initialState());
    expect(rewards).toEqual([]);
  });

  it('announces a rank change when silver crosses a threshold', () => {
    const rich: GameState = { ...initialState(), silver: 140 };
    const t = reduce(rich, { type: 'complete-frame', roll: 'prologue', frame: 'story' });
    expect(t.rewards).toContainEqual({ kind: 'rank', rank: rankFor(160) });
    expect(rankFor(160).title).toBe('Printer');
  });
});

describe('hydrate', () => {
  it('falls back to a fresh save for junk', () => {
    expect(hydrate(null)).toEqual(initialState());
    expect(hydrate({ version: 99 })).toEqual(initialState());
    expect(hydrate('lol')).toEqual(initialState());
  });

  it('drops unknown rolls, frames, negatives and stamps', () => {
    const s = hydrate({
      version: 1,
      silver: 50,
      frames: { prologue: ['story', 'bogus'], atlantis: ['story'] },
      negatives: ['why', 'made-up'],
      stamps: ['first-light', 'made-up'],
    });
    expect(s.frames).toEqual({ prologue: ['story'] });
    expect(s.negatives).toEqual(['why']);
    expect(s.stamps).toEqual(['first-light']);
    expect(s.silver).toBe(50);
  });
});

describe('store', () => {
  it('persists across instances and emits rewards', () => {
    const kv = createMemoryStore();
    const store = createGameStore(kv);
    const seen: string[] = [];
    store.onReward((r) => seen.push(r.kind));
    store.dispatch({ type: 'complete-frame', roll: 'prologue', frame: 'story' });
    expect(seen).toContain('silver');
    expect(createGameStore(kv).getState().frames.prologue).toEqual(['story']);
  });

  it('survives corrupt saved JSON', () => {
    const kv = createMemoryStore({ 'drawable:save:v1': '{not json' });
    expect(createGameStore(kv).getState()).toEqual(initialState());
  });
});

describe('exercises', () => {
  it('pays silver for a hand-solved exercise, once', () => {
    const first = reduce(initialState(), { type: 'solve-exercise', id: 'fog-opt-in', revealed: false });
    expect(first.state.exercises).toEqual({ 'fog-opt-in': 'hand' });
    expect(first.state.silver).toBe(15);
    const again = reduce(first.state, { type: 'solve-exercise', id: 'fog-opt-in', revealed: true });
    expect(again.state.exercises['fog-opt-in']).toBe('hand');
    expect(again.rewards).toEqual([]);
  });

  it('records a revealed solution without paying silver', () => {
    const t = reduce(initialState(), { type: 'solve-exercise', id: 'x', revealed: true });
    expect(t.state.exercises).toEqual({ x: 'revealed' });
    expect(t.state.silver).toBe(0);
  });

  it('keeps only valid exercise results when hydrating', () => {
    const s = hydrate({ version: 1, exercises: { a: 'hand', b: 'revealed', c: 'cheated', d: 3 } });
    expect(s.exercises).toEqual({ a: 'hand', b: 'revealed' });
  });

  it('requires all four frames for a complete roll', () => {
    const { state } = run(['story', 'lab', 'trial'].map((frame) => ({ type: 'complete-frame', roll: 'prologue', frame }) as Action));
    expect(isComplete(state, 'prologue')).toBe(false);
    const done = reduce(state, { type: 'complete-frame', roll: 'prologue', frame: 'practice' }).state;
    expect(isComplete(done, 'prologue')).toBe(true);
  });
});

describe('set-name', () => {
  it('trims and caps the signed name, and persists it through hydrate', () => {
    const { state } = reduce(initialState(), { type: 'set-name', name: '  Ada Lovelace-Byron of the Analytical Engine  ' });
    expect(state.name).toBe('Ada Lovelace-Byron of the An'); // capped at 28
    expect(hydrate(JSON.parse(JSON.stringify(state))).name).toBe(state.name);
  });

  it('is a no-op when the name did not change', () => {
    const named = reduce(initialState(), { type: 'set-name', name: 'Ada' }).state;
    expect(reduce(named, { type: 'set-name', name: ' Ada ' }).state).toBe(named);
  });
});
