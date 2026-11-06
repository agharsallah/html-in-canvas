/**
 * The HTML that becomes a hanging print.
 *
 * This is ordinary, accessible DOM: a picture, a heading, a list, real
 * <button>s. In native mode it is a `drawable` child of the WebGL canvas, so
 * you can Tab to the buttons and click them on a tilted 3D surface.
 * Re-rendering it (after progress changes) makes the browser fire `paint`
 * with this element in `changedElements`, which re-uploads the texture.
 *
 * Locked prints carry their full picture too, as a latent image: the shader
 * keeps it faint, and a safelight loupe under the pointer develops a peek.
 */
import { FRAMES, type FrameId } from '../game/state';
import type { Roll } from '../story/rolls';
import { glyph } from './components/glyphs';
import { h } from './dom';
import { printArt } from './print-art';

/** Must match `.print-card` width/height in print-card.css. */
export const PRINT_CARD_SIZE = { width: 340, height: 460 } as const;

export type PrintStatus = 'locked' | 'open' | 'sealed';

export interface PrintView {
  status: PrintStatus;
  frames: FrameId[];
  /** The roll the learner should play next: gets an "Up next" tag. */
  current?: boolean;
  /** Title of the roll whose trial unlocks this one. */
  previousTitle?: string;
}

const pictures = new WeakMap<HTMLElement, HTMLElement>();

export function createPrintCard(roll: Roll): HTMLElement {
  const card = h('article', {
    class: 'print-card',
    'data-roll': roll.id,
    'aria-label': `Frame ${roll.frame}: ${roll.title}`,
  });
  for (const key of ['paper', 'ink', 'accent', 'glow', 'second'] as const) {
    card.style.setProperty(`--${key}`, roll.process[key]);
  }
  // The picture never changes, so it is built once and moved between renders.
  pictures.set(card, h('figure', { class: 'print-art' }, printArt(roll.id)));
  return card;
}

/** Re-render only when the view actually changed, to avoid useless paints. */
export function renderPrintCard(card: HTMLElement, roll: Roll, view: PrintView): void {
  const key = `${view.status}|${view.frames.join(',')}|${view.current ? 1 : 0}`;
  if (card.dataset.view === key) return;
  card.dataset.view = key;
  card.dataset.status = view.status;
  card.replaceChildren(...content(card, roll, view));
}

function content(card: HTMLElement, roll: Roll, view: PrintView): Node[] {
  const art = pictures.get(card)!;
  const done = view.frames.length;
  const complete = done === FRAMES.length;
  const tag = view.status === 'locked'
    ? h('span', { class: 'print-tag print-tag-latent' }, glyph('lock', 13), 'Latent')
    : view.current
      ? h('span', { class: 'print-tag print-tag-next' }, 'Up next')
      : complete ? h('span', { class: 'print-tag print-tag-done' }, glyph('check', 13), 'Developed') : null;
  art.querySelector('.print-tag')?.remove();
  art.querySelector('.print-foe')?.remove();
  art.append(...[tag, h('figcaption', { class: 'print-foe' }, `Faces ${roll.foe}`)].filter((n): n is HTMLElement => n !== null));

  const edge = h('p', { class: 'print-edge' }, h('span', {}, `Frame ${roll.frame}`), h('span', {}, roll.process.name));
  // Locked prints use a paragraph, not a heading: a dozen locked headings
  // would clutter heading navigation (CONCEPTS.md §8).
  const title = view.status === 'locked'
    ? h('p', { class: 'print-title' }, roll.title)
    : h('h2', { class: 'print-title' }, roll.title);
  const concepts = h('ul', { class: 'print-concepts', 'aria-label': 'Covers' },
    ...roll.concepts.map((concept) => h('li', {}, h('code', {}, concept))));
  const turn = h('button', {
    class: 'print-turn', type: 'button', 'data-turn': roll.id,
    'aria-label': `Turn over ${roll.title}: read the notes on the back`,
  }, glyph('story', 16), 'Notes');

  return [edge, art, title, h('p', { class: 'print-logline' }, roll.logline), concepts, footer(roll, view, turn)];
}

function footer(roll: Roll, view: PrintView, turn: HTMLElement): HTMLElement {
  if (view.status === 'locked') {
    return h('div', { class: 'print-footer' },
      h('p', { class: 'print-latent' }, `Develops after “${view.previousTitle ?? 'the last roll'}”`),
      turn);
  }
  if (view.status === 'sealed') {
    return h('div', { class: 'print-footer' }, h('p', { class: 'print-latent' }, 'Still in the fixer bath.'), turn);
  }
  const done = view.frames.length;
  const label = done === 0 ? 'Start roll' : done === FRAMES.length ? 'Replay roll' : 'Continue roll';
  const marks = h('ol', { class: 'print-frames', 'aria-label': `${done} of ${FRAMES.length} frames developed` },
    ...FRAMES.map((frame) => h('li', { 'data-done': view.frames.includes(frame) ? 'true' : 'false', title: frame })));
  return h('div', { class: 'print-footer' },
    marks,
    h('span', { class: 'print-actions' }, turn, h('button', { class: 'print-enter', type: 'button', 'data-enter': roll.id }, label)));
}
