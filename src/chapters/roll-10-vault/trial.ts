/**
 * Trial: guard the vault. Phase 1 sorts the explainer's lists through the
 * copier; phase 2 calls six heists by outcome and channel. The rules live in
 * rules.ts and deck.ts, pinned to the README by tests/vault-rules.test.ts.
 */
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { mountHeistPhase } from './heist-phase';
import { mountSortPhase } from './sort-phase';

export const trial: Beat = (host, ctx) => {
  const stage = h('div', { class: 'vault-trial' });
  const title = h('h3', { class: 'vault-phase', tabindex: '-1' });
  host.append(title, stage);
  let cleanup = () => {};
  let total = 0;

  const phase2 = () => {
    cleanup();
    stage.replaceChildren();
    title.textContent = 'Phase 2 of 2: the heist';
    title.focus();
    cleanup = mountHeistPhase(stage, ctx, (mistakes) => {
      total += mistakes;
      ctx.say(total === 0 ? 'Airtight. Not one pixel leaked.' : 'The vault holds. The Leak has nothing to read.');
      ctx.completeTrial({ mistakes: total, stamps: total === 0 ? ['airtight'] : [] });
    });
  };

  title.textContent = 'Phase 1 of 2: the copier';
  cleanup = mountSortPhase(stage, ctx, (mistakes) => {
    total += mistakes;
    phase2();
  });
  return () => {
    cleanup();
    title.remove();
    stage.remove();
  };
};
