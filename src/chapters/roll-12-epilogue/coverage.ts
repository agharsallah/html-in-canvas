/**
 * Coverage: how much of each roll the learner has mastered, from the saved
 * game state. Half frames developed, half negatives collected (secrets
 * excluded, so nobody is penalised for not finding them).
 */
import { FRAMES, type GameState } from '../../game/state';
import { NEGATIVES } from '../../story/negatives';
import { ROLLS, type RollId } from '../../story/rolls';

export interface RollCoverage {
  roll: RollId;
  frames: number;
  negatives: number;
  negativesTotal: number;
  value: number;
}

export function coverageFor(state: Pick<GameState, 'frames' | 'negatives'>, roll: RollId): RollCoverage {
  const frames = (state.frames[roll] ?? []).filter((f) => FRAMES.includes(f)).length;
  const pool = NEGATIVES.filter((n) => n.roll === roll && n.rarity !== 'secret');
  const negatives = pool.filter((n) => state.negatives.includes(n.id)).length;
  const frameShare = frames / FRAMES.length;
  const value = pool.length ? (frameShare + negatives / pool.length) / 2 : frameShare;
  return { roll, frames, negatives, negativesTotal: pool.length, value };
}

export function coverage(state: Pick<GameState, 'frames' | 'negatives'>): RollCoverage[] {
  return ROLLS.map((roll) => coverageFor(state, roll.id));
}
