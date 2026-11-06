/**
 * The copier deck for the trial's sorting phase, as a pure reducer.
 * A wrong call goes back to the end of the queue and costs a strike; too
 * many strikes and the Leak escapes, so guessing cannot clear the deck.
 */
import { itemById, type Verdict } from './rules';

export const MAX_STRIKES = 4;

export interface Deck {
  queue: readonly string[];
  done: readonly string[];
  strikes: number;
}

export function newDeck(ids: readonly string[], shuffle: (ids: string[]) => string[] = (x) => x): Deck {
  return { queue: shuffle(ids.filter((id) => itemById(id)?.status !== 'open')), done: [], strikes: 0 };
}

export interface Play {
  deck: Deck;
  correct: boolean;
  /** Every card sorted. */
  cleared: boolean;
  /** Out of strikes: the deck must be dealt again. */
  lost: boolean;
}

export function playCard(deck: Deck, verdict: Verdict): Play {
  const [id, ...rest] = deck.queue;
  if (!id) return { deck, correct: false, cleared: true, lost: false };
  const correct = itemById(id)?.status === verdict;
  const next: Deck = correct
    ? { queue: rest, done: [...deck.done, id], strikes: deck.strikes }
    : { queue: [...rest, id], done: deck.done, strikes: deck.strikes + 1 };
  return { deck: next, correct, cleared: next.queue.length === 0, lost: next.strikes >= MAX_STRIKES };
}

/** Fisher-Yates with an injectable random source, for repeatable tests. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
