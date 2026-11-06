/**
 * Game state and its pure reducer. No DOM, no storage: easy to test.
 *
 * Progression rules:
 *  - Each roll has three frames: story, lab, trial.
 *  - Finishing a frame pays silver once, and awards that frame's negatives.
 *  - Finishing a roll's trial unlocks the next roll.
 */
import { ROLLS, nextRoll, rollIndex, type RollId } from '../story/rolls';
import { negativesFor, getNegative } from '../story/negatives';
import { getStamp } from './stamps';

export type FrameId = 'story' | 'lab' | 'practice' | 'trial';
export const FRAMES: readonly FrameId[] = ['story', 'lab', 'practice', 'trial'];

export const FRAME_SILVER: Record<FrameId, number> = { story: 20, lab: 40, practice: 60, trial: 80 };
/** Paid per exercise solved by hand. Revealed solutions pay nothing. */
export const EXERCISE_SILVER = 15;

/** How an exercise was solved: typed by the learner, or after revealing the solution. */
export type ExerciseResult = 'hand' | 'revealed';

export interface GameState {
  version: 1;
  silver: number;
  frames: Partial<Record<RollId, FrameId[]>>;
  negatives: string[];
  stamps: string[];
  /** Solved exercises by id. The first result sticks. */
  exercises: Record<string, ExerciseResult>;
  /** Debug/preview: every roll unlocked regardless of progress. */
  unlockAll: boolean;
  /** The name signed in the darkroom register (hero card). */
  name: string;
}

export const initialState = (): GameState => ({
  version: 1,
  silver: 0,
  frames: {},
  negatives: [],
  stamps: [],
  exercises: {},
  unlockAll: false,
  name: '',
});

export type Action =
  | { type: 'complete-frame'; roll: RollId; frame: FrameId }
  | { type: 'collect-negative'; id: string }
  | { type: 'earn-stamp'; id: string }
  | { type: 'solve-exercise'; id: string; revealed: boolean }
  | { type: 'unlock-all' }
  | { type: 'set-name'; name: string }
  | { type: 'reset' };

export type Reward =
  | { kind: 'silver'; amount: number; reason: string }
  | { kind: 'negative'; id: string }
  | { kind: 'stamp'; id: string }
  | { kind: 'unlock'; roll: RollId }
  | { kind: 'rank'; rank: Rank };

export interface Rank {
  title: string;
  minSilver: number;
}

export const RANKS: readonly Rank[] = [
  { title: 'Apprentice', minSilver: 0 },
  { title: 'Printer', minSilver: 150 },
  { title: 'Developer', minSilver: 450 },
  { title: 'Darkroom master', minSilver: 1000 },
];

export function rankFor(silver: number): Rank {
  return [...RANKS].reverse().find((rank) => silver >= rank.minSilver) ?? RANKS[0]!;
}

export function framesDone(state: GameState, roll: RollId): FrameId[] {
  return state.frames[roll] ?? [];
}

export function isUnlocked(state: GameState, roll: RollId): boolean {
  const index = rollIndex(roll);
  if (index <= 0 || state.unlockAll) return index >= 0;
  const previous = ROLLS[index - 1]!;
  return framesDone(state, previous.id).includes('trial');
}

export function isComplete(state: GameState, roll: RollId): boolean {
  return FRAMES.every((frame) => framesDone(state, roll).includes(frame));
}

export interface Transition {
  state: GameState;
  rewards: Reward[];
}

export function reduce(state: GameState, action: Action): Transition {
  switch (action.type) {
    case 'complete-frame':
      return completeFrame(state, action.roll, action.frame);
    case 'collect-negative':
      return collect(state, action.id);
    case 'earn-stamp':
      return earnStamp(state, action.id);
    case 'solve-exercise':
      return solveExercise(state, action.id, action.revealed);
    case 'set-name': {
      const name = action.name.trim().slice(0, 28);
      return name === state.name ? { state, rewards: [] } : { state: { ...state, name }, rewards: [] };
    }
    case 'unlock-all':
      return { state: { ...state, unlockAll: true }, rewards: [] };
    case 'reset':
      return { state: initialState(), rewards: [] };
  }
}

function paySilver(t: Transition, amount: number, reason: string): Transition {
  const before = rankFor(t.state.silver);
  const silver = t.state.silver + amount;
  const after = rankFor(silver);
  const rewards: Reward[] = [...t.rewards, { kind: 'silver', amount, reason }];
  if (after !== before) rewards.push({ kind: 'rank', rank: after });
  return { state: { ...t.state, silver }, rewards };
}

function completeFrame(state: GameState, roll: RollId, frame: FrameId): Transition {
  const done = framesDone(state, roll);
  if (done.includes(frame) || !isUnlocked(state, roll)) return { state, rewards: [] };

  let t: Transition = {
    state: { ...state, frames: { ...state.frames, [roll]: [...done, frame] } },
    rewards: [],
  };
  t = paySilver(t, FRAME_SILVER[frame], `${frame} frame`);
  for (const negative of negativesFor(roll, frame)) t = chain(t, collect(t.state, negative.id));

  const next = nextRoll(roll);
  if (frame === 'trial' && next && !state.unlockAll && !isUnlocked(state, next.id)) {
    t = { ...t, rewards: [...t.rewards, { kind: 'unlock', roll: next.id }] };
  }
  return t;
}

function solveExercise(state: GameState, id: string, revealed: boolean): Transition {
  if (state.exercises[id]) return { state, rewards: [] };
  const t: Transition = {
    state: { ...state, exercises: { ...state.exercises, [id]: revealed ? 'revealed' : 'hand' } },
    rewards: [],
  };
  return revealed ? t : paySilver(t, EXERCISE_SILVER, 'exercise');
}

function collect(state: GameState, id: string): Transition {
  if (!getNegative(id) || state.negatives.includes(id)) return { state, rewards: [] };
  return { state: { ...state, negatives: [...state.negatives, id] }, rewards: [{ kind: 'negative', id }] };
}

function earnStamp(state: GameState, id: string): Transition {
  const stamp = getStamp(id);
  if (!stamp || state.stamps.includes(id)) return { state, rewards: [] };
  const t: Transition = {
    state: { ...state, stamps: [...state.stamps, id] },
    rewards: [{ kind: 'stamp', id }],
  };
  return paySilver(t, stamp.silver, `stamp: ${stamp.name}`);
}

/** Merge a follow-up transition, keeping all rewards in order. */
function chain(first: Transition, second: Transition): Transition {
  return { state: second.state, rewards: [...first.rewards, ...second.rewards] };
}

/** Validate untrusted persisted JSON; fall back to a fresh state. */
export function hydrate(raw: unknown): GameState {
  const fresh = initialState();
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<GameState>;
  if (r.version !== 1) return fresh;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const frames: GameState['frames'] = {};
  for (const roll of ROLLS) {
    const list = strings(r.frames?.[roll.id]).filter((f): f is FrameId => (FRAMES as string[]).includes(f));
    if (list.length) frames[roll.id] = list;
  }
  return {
    version: 1,
    silver: typeof r.silver === 'number' && r.silver >= 0 ? r.silver : 0,
    frames,
    negatives: strings(r.negatives).filter((id) => !!getNegative(id)),
    stamps: strings(r.stamps).filter((id) => !!getStamp(id)),
    exercises: Object.fromEntries(Object.entries(r.exercises ?? {})
      .filter((entry): entry is [string, ExerciseResult] => entry[1] === 'hand' || entry[1] === 'revealed')),
    unlockAll: r.unlockAll === true,
    name: typeof r.name === 'string' ? r.name.slice(0, 28) : '',
  };
}
