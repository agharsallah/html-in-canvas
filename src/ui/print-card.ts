/**
 * The HTML that becomes a hanging print.
 *
 * This is ordinary, accessible DOM: a heading, a list, a real <button>. In
 * native mode it is a `drawable` child of the WebGL canvas, so you can Tab to
 * the button and click it on a tilted 3D surface. Re-rendering it (after
 * progress changes) makes the browser fire `paint` with this element in
 * `changedElements`, which re-uploads the texture. No manual invalidation.
 */
import { FRAMES, type FrameId } from '../game/state';
import type { Roll } from '../story/rolls';
import { h } from './dom';

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

export function createPrintCard(roll: Roll): HTMLElement {
  const card = h('article', {
    class: 'print-card',
    'data-roll': roll.id,
    'aria-label': `Frame ${roll.frame}`,
  });
  card.style.setProperty('--paper', roll.process.paper);
  card.style.setProperty('--ink', roll.process.ink);
  card.style.setProperty('--accent', roll.process.accent);
  return card;
}

/** Re-render only when the view actually changed, to avoid useless paints. */
export function renderPrintCard(card: HTMLElement, roll: Roll, view: PrintView): void {
  const key = `${view.status}|${view.frames.join(',')}|${view.current ? 1 : 0}`;
  if (card.dataset.view === key) return;
  card.dataset.view = key;
  card.dataset.status = view.status;
  card.replaceChildren(...content(roll, view));
}

function content(roll: Roll, view: PrintView): Node[] {
  const edge = h('p', { class: 'print-edge' }, `Frame ${roll.frame}`,
    view.current ? h('span', { class: 'print-next' }, 'Up next') : h('span', {}, roll.process.name));

  if (view.status === 'locked') {
    return [
      edge,
      // A paragraph, not a heading: twelve identical "Undeveloped" headings
      // cluttered heading navigation (CONCEPTS.md §8; README, Accessibility).
      h('p', { class: 'print-title' }, 'Undeveloped'),
      h('p', { class: 'print-logline' }, `Finish the trial in “${view.previousTitle ?? 'the last roll'}” to develop this print.`),
    ];
  }

  const concepts = h('ul', { class: 'print-concepts', 'aria-label': 'Covers' },
    ...roll.concepts.map((concept) => h('li', {}, h('code', {}, concept))));
  const foe = h('p', { class: 'print-foe' }, `Faces ${roll.foe}`);
  const body = [edge, h('h2', { class: 'print-title' }, roll.title), h('p', { class: 'print-logline' }, roll.logline), concepts, foe];

  if (view.status === 'sealed') {
    return [...body, h('p', { class: 'print-note' }, 'Still in the fixer bath. This roll is being written.')];
  }

  const done = view.frames.length;
  const label = done === 0 ? 'Start roll' : done === FRAMES.length ? 'Replay roll' : 'Continue roll';
  const marks = h('ol', { class: 'print-frames', 'aria-label': `${done} of ${FRAMES.length} frames developed` },
    ...FRAMES.map((frame) =>
      h('li', { 'data-done': view.frames.includes(frame) ? 'true' : 'false' }, frame)));

  return [
    ...body,
    h('div', { class: 'print-footer' }, marks, h('button', { class: 'print-enter', type: 'button', 'data-enter': roll.id }, label)),
  ];
}
