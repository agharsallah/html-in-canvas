/**
 * Trial phase 1: the copier. One card at a time; stamp it REDACT (never
 * painted) or PRINT (painted). Wrong calls cost a strike and return to the
 * end of the deck. Out of strikes, the Leak escapes and the deck is dealt
 * again. Open questions jam the copier: they are shown, never scored.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { h, rich } from '../../ui/dom';
import type { BeatContext } from '../shared/chapter';
import { MAX_STRIKES, newDeck, playCard, shuffled, type Deck } from './deck';
import { DISCUSS_IDS, itemById, SORT_IDS, type Verdict } from './rules';

export function mountSortPhase(host: HTMLElement, ctx: BeatContext, onDone: (mistakes: number) => void): () => void {
  let deck: Deck = newDeck(SORT_IDS, shuffled);
  let mistakes = 0;
  let busy = false;
  let timer = 0;

  const card = h('div', { class: 'vault-card', 'aria-live': 'polite' });
  const counter = h('p', { class: 'vault-counter' });
  const strikes = h('div', { class: 'vault-strikes', role: 'img' });
  const feedback = h('div', { class: 'vault-feedback', 'aria-live': 'polite' });
  const shredded = h('ul', { class: 'vault-tray', 'data-tray': 'never', 'aria-label': 'Redacted: never painted' });
  const printed = h('ul', { class: 'vault-tray', 'data-tray': 'painted', 'aria-label': 'Printed: painted on purpose' });

  const render = () => {
    const id = deck.queue[0];
    const item = id ? itemById(id) : undefined;
    card.replaceChildren(item ? h('p', {}, rich(item.label)) : h('p', {}, 'Deck cleared'));
    counter.textContent = `${deck.done.length} of ${deck.done.length + deck.queue.length} sorted`;
    strikes.setAttribute('aria-label', `${deck.strikes} of ${MAX_STRIKES} strikes`);
    strikes.replaceChildren(...Array.from({ length: MAX_STRIKES }, (_, i) => h('span', { 'data-hit': String(i < deck.strikes) })));
  };

  const fileCard = (id: string) => {
    const item = itemById(id)!;
    (item.status === 'never' ? shredded : printed).append(h('li', {}, rich(item.label)));
  };

  const stamp = (verdict: Verdict) => {
    const id = deck.queue[0];
    if (!id || busy) return;
    const item = itemById(id)!;
    const play = playCard(deck, verdict);
    deck = play.deck;
    if (play.correct) fileCard(id);
    else mistakes += 1;
    feedback.replaceChildren(callout({ kind: play.correct ? 'success' : 'error', title: play.correct ? (verdict === 'never' ? 'Redacted' : 'Printed') : 'The Leak slips through', body: `${item.why} (${[item.readme && `README ${item.readme}`, item.questionnaire && `questionnaire ${item.questionnaire}`].filter(Boolean).join('; ')})` }));
    card.dataset.flash = play.correct ? 'right' : 'wrong';
    if (play.lost) {
      ctx.say('Too many slips. The Leak escaped with the dossier. Deal again.', 'foe');
      deck = newDeck(SORT_IDS, shuffled);
      shredded.replaceChildren();
      printed.replaceChildren();
    } else if (play.cleared) {
      busy = true;
      ctx.say('Every card in the right tray. Now the Leak tries a heist.');
      timer = window.setTimeout(() => onDone(mistakes), 900);
    }
    render();
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.target instanceof Element && event.target.closest('input, textarea, dialog[open]')) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'r') stamp('never');
    if (key === 'p') stamp('painted');
  };
  window.addEventListener('keydown', onKey);

  const jams = DISCUSS_IDS.map((id) => itemById(id)!).map((item) =>
    h('li', { class: 'vault-jam' }, h('p', { class: 'vault-jam-label' }, rich(item.label)), h('p', {}, rich(item.why))));

  host.append(h('div', { class: 'vault-sort' },
    h('div', { class: 'vault-copier' },
      h('div', { class: 'vault-copier-head' }, counter, strikes),
      card,
      h('div', { class: 'vault-stamps' },
        button({ label: 'Redact: never painted', variant: 'primary', kbd: 'R', onClick: () => stamp('never') }),
        button({ label: 'Print: painted', variant: 'secondary', kbd: 'P', onClick: () => stamp('painted') })),
      feedback),
    h('div', { class: 'vault-trays' },
      h('section', {}, h('h3', { class: 'panel-title' }, 'Redacted'), shredded),
      h('section', {}, h('h3', { class: 'panel-title' }, 'Printed'), printed)),
    h('section', { class: 'vault-jams' }, h('h3', { class: 'panel-title' }, 'Jammed in the copier: open questions, not scored'), h('ul', {}, ...jams))));
  render();
  return () => {
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
  };
}
