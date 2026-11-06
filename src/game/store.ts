/**
 * The game store: holds GameState, persists it, and broadcasts changes and
 * rewards. UI subscribes; chapters dispatch.
 */
import { Emitter } from '../core/emitter';
import type { KeyValueStore } from '../core/storage';
import { hydrate, reduce, type Action, type GameState, type Reward } from './state';

const STORAGE_KEY = 'drawable:save:v1';

interface StoreEvents extends Record<string, unknown> {
  change: GameState;
  reward: Reward;
}

export interface GameStore {
  getState(): GameState;
  dispatch(action: Action): Reward[];
  onChange(listener: (state: GameState) => void): () => void;
  onReward(listener: (reward: Reward) => void): () => void;
}

export function createGameStore(kv: KeyValueStore): GameStore {
  let state = load(kv);
  const events = new Emitter<StoreEvents>();

  return {
    getState: () => state,
    dispatch(action) {
      const result = reduce(state, action);
      if (result.state !== state) {
        state = result.state;
        kv.write(STORAGE_KEY, JSON.stringify(state));
        events.emit('change', state);
      }
      result.rewards.forEach((reward) => events.emit('reward', reward));
      return result.rewards;
    },
    onChange: (listener) => events.on('change', listener),
    onReward: (listener) => events.on('reward', listener),
  };
}

function load(kv: KeyValueStore): GameState {
  try {
    return hydrate(JSON.parse(kv.read(STORAGE_KEY) ?? 'null'));
  } catch {
    return hydrate(null);
  }
}
