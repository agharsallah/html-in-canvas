/**
 * Reward toasts. Announced politely to screen readers; they never steal focus.
 */
import type { GameStore } from '../game/store';
import type { Reward } from '../game/state';
import { getNegative } from '../story/negatives';
import { getRoll } from '../story/rolls';
import { getStamp } from '../game/stamps';
import { h } from './dom';

const LIFETIME_MS = 4200;

export function mountToasts(root: HTMLElement, store: GameStore): void {
  const region = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
  root.append(region);

  store.onReward((reward) => {
    const toast = renderReward(reward);
    if (!toast) return;
    region.append(toast);
    setTimeout(() => {
      toast.dataset.leaving = 'true';
      setTimeout(() => toast.remove(), 400);
    }, LIFETIME_MS);
  });
}

function renderReward(reward: Reward): HTMLElement | null {
  switch (reward.kind) {
    case 'silver':
      return h('p', { class: 'toast', 'data-kind': 'silver' }, `+${reward.amount} silver`);
    case 'negative': {
      const negative = getNegative(reward.id);
      return negative
        ? h('p', { class: 'toast', 'data-kind': 'negative', 'data-rarity': negative.rarity },
            'New negative: ', h('strong', {}, negative.name))
        : null;
    }
    case 'stamp': {
      const stamp = getStamp(reward.id);
      return stamp ? h('p', { class: 'toast', 'data-kind': 'stamp' }, 'Stamp earned: ', h('strong', {}, stamp.name)) : null;
    }
    case 'unlock': {
      const roll = getRoll(reward.roll);
      return roll ? h('p', { class: 'toast', 'data-kind': 'unlock' }, 'Now developing: ', h('strong', {}, roll.title)) : null;
    }
    case 'rank':
      return h('p', { class: 'toast', 'data-kind': 'rank' }, 'New rank: ', h('strong', {}, reward.rank.title));
  }
}
