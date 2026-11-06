/**
 * Trial phase 1: safe or melt? Nine shader effects. For each, decide whether
 * it only changes colour (clicks still land) or moves pixels away from the
 * hit region (the Melt wins). Scored by `breaksHitTesting` in rules.ts.
 */
import { button } from '../../ui/components/button';
import { h, rich } from '../../ui/dom';
import { breaksHitTesting, EFFECT_CARDS, type EffectCard } from './rules';

export interface SortPhase {
  onPass(mistakes: number): void;
  say(text: string, foe?: boolean): void;
}

export function mountSort(host: HTMLElement, phase: SortPhase): () => void {
  let mistakes = 0;
  const solved = new Set<string>();
  const progress = h('p', { class: 'fdy-sort-progress', 'aria-live': 'polite' });
  const list = h('ul', { class: 'fdy-sort' });

  const renderProgress = () => (progress.textContent = `${solved.size} of ${EFFECT_CARDS.length} sorted`);

  const row = (card: EffectCard) => {
    const feedback = h('p', { class: 'fdy-sort-why', 'aria-live': 'polite' });
    const choose = (melts: boolean) => {
      if (solved.has(card.id)) return;
      if (breaksHitTesting(card) === melts) {
        solved.add(card.id);
        li.dataset.verdict = melts ? 'melts' : 'safe';
        feedback.replaceChildren(rich(card.why));
        buttons.forEach((b) => (b.disabled = true));
        renderProgress();
        if (solved.size === EFFECT_CARDS.length) phase.onPass(mistakes);
        return;
      }
      mistakes += 1;
      li.dataset.verdict = 'wrong';
      feedback.textContent = melts
        ? 'Look again: does any pixel end up somewhere the geometry does not say?'
        : 'Look again: is the picture still exactly where the hit region is?';
      phase.say(melts ? 'Ha, you flinch at a little colour.' : 'Yes, trust it. Click and fall through.', true);
    };
    const buttons = [
      button({ label: 'Colour only', size: 'sm', variant: 'secondary', attrs: { 'aria-label': `${card.title}: colour only, clicks still land` }, onClick: () => choose(false) }),
      button({ label: 'Melts the clicks', size: 'sm', variant: 'secondary', attrs: { 'aria-label': `${card.title}: moves pixels, clicks miss` }, onClick: () => choose(true) }),
    ];
    const li = h('li', { class: 'fdy-effect', 'data-verdict': 'open' },
      h('div', { class: 'fdy-effect-head' }, h('h4', {}, card.title), h('code', {}, card.code)),
      h('div', { class: 'fdy-effect-actions' }, ...buttons),
      feedback);
    return li;
  };

  list.append(...EFFECT_CARDS.map(row));
  renderProgress();
  host.append(progress, list);
  return () => {};
}
