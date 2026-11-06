/**
 * The Album: a contact sheet of every negative and stamp.
 *
 * Collected negatives are flip cards: the front is the dark negative, the
 * back is the developed positive with the definition. Uncollected frames
 * stay unexposed and only say which roll develops them. A donut chart sums
 * up the collection by rarity.
 */
import type { GameStore } from '../game/store';
import { STAMPS } from '../game/stamps';
import { NEGATIVES, type Negative, type Rarity } from '../story/negatives';
import { getRoll } from '../story/rolls';
import { createDonut } from './charts/donut';
import { button } from './components/button';
import { glyph } from './components/glyphs';
import { stampBadge } from './components/stamp-badge';
import { h } from './dom';
import { attachTilt } from './fx/tilt';

export interface Album {
  open(): void;
  close(): void;
}

const RARITIES: Array<{ id: Rarity; label: string }> = [
  { id: 'common', label: 'Common' },
  { id: 'rare', label: 'Rare' },
  { id: 'legendary', label: 'Legendary' },
  { id: 'secret', label: 'Secret' },
];

export function mountAlbum(root: HTMLElement, store: GameStore): Album {
  const chart = h('div', { class: 'album-chart' });
  const sheet = h('div', { class: 'album-sheet' });
  const stamps = h('ul', { class: 'album-stamps' });
  const dialog = h('dialog', { class: 'album', 'aria-labelledby': 'album-title' },
    h('header', { class: 'album-head' },
      h('h2', { id: 'album-title' }, 'Album'),
      button({ label: 'Close', variant: 'ghost', size: 'sm', onClick: () => dialog.close() })),
    chart,
    h('h3', { class: 'album-section' }, 'Negatives'),
    h('p', { class: 'album-help' }, 'Click a developed negative to turn it over.'),
    sheet,
    h('h3', { class: 'album-section' }, 'Stamps'),
    stamps);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  root.append(dialog);

  const render = () => {
    const owned = new Set(store.getState().negatives);
    const earned = new Set(store.getState().stamps);
    chart.replaceChildren(createDonut(RARITIES.map(({ id, label }) => {
      const all = NEGATIVES.filter((n) => n.rarity === id);
      return { id, label, total: all.length, value: all.filter((n) => owned.has(n.id)).length };
    }), 'Negatives collected'));
    sheet.replaceChildren(...NEGATIVES.map((n) => renderNegative(n, owned.has(n.id))));
    stamps.replaceChildren(...STAMPS.map((stamp) => h('li', { class: 'stamp', 'data-earned': String(earned.has(stamp.id)) },
      stampBadge({ text: stamp.name, center: earned.has(stamp.id) ? 'silver' : 'lock', earned: earned.has(stamp.id), size: 104 }),
      h('strong', {}, stamp.name),
      h('span', {}, earned.has(stamp.id) ? stamp.text : 'Not earned yet'))));
  };

  return {
    open() {
      render();
      if (store.getState().negatives.length < NEGATIVES.length) store.dispatch({ type: 'earn-stamp', id: 'night-owl' });
      dialog.showModal();
    },
    close: () => dialog.close(),
  };
}

function renderNegative(negative: Negative, collected: boolean): HTMLElement {
  const roll = getRoll(negative.roll);
  const edge = h('p', { class: 'negative-edge' }, `Frame ${roll?.frame ?? '??'}`, h('span', {}, negative.rarity));
  if (!collected) {
    return h('article', { class: 'negative', 'data-collected': 'false', 'data-rarity': negative.rarity },
      edge, h('span', { class: 'negative-lock' }, glyph('lock', 28)),
      h('p', { class: 'negative-hidden' }, negative.rarity === 'secret' ? 'A secret. Look around.' : `Develops in “${roll?.title}”`));
  }

  const card = h('button', { type: 'button', class: 'negative-flip', 'aria-pressed': 'false', 'aria-label': `${negative.name}, ${negative.rarity} ${negative.kind}. Turn over` },
    h('span', { class: 'negative-face negative-front' },
      edge.cloneNode(true),
      h('span', { class: 'negative-emblem' }, glyph(negative.kind === 'object' ? 'property' : negative.kind, 34)),
      h('span', { class: 'negative-name' }, negative.name),
      h('span', { class: 'negative-kind' }, negative.kind)),
    h('span', { class: 'negative-face negative-back' },
      h('span', { class: 'negative-name' }, negative.name),
      h('span', { class: 'negative-text' }, negative.text),
      negative.code ? h('code', { class: 'negative-code' }, negative.code) : null));
  card.addEventListener('click', () => card.setAttribute('aria-pressed', String(card.getAttribute('aria-pressed') !== 'true')));
  const wrap = h('article', { class: 'negative', 'data-collected': 'true', 'data-rarity': negative.rarity }, card);
  attachTilt(wrap, 8);
  return wrap;
}
