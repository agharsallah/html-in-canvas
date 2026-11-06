/**
 * The back of a print: notes pencilled on the verso. What the roll teaches,
 * one line per concept, its four frames as a contact sheet, and what you
 * build. One element is shared by every print and re-rendered for the print
 * you turn over; it is a drawable too, so it is real, clickable HTML.
 */
import { FRAMES, type FrameId } from '../game/state';
import { FRAME_NOTES, ROLL_NOTES } from '../story/roll-notes';
import type { Roll } from '../story/rolls';
import { glyph } from './components/glyphs';
import { h } from './dom';
import type { PrintView } from './print-card';

/** 1.5x the front's CSS size (same aspect), so text is crisp up close. */
export const VERSO_SIZE = { width: 510, height: 690 } as const;

export interface VersoPosition {
  index: number;
  total: number;
}

export function createVerso(): HTMLElement {
  return h('article', { class: 'print-verso', inert: true, 'aria-hidden': 'true', 'aria-label': 'Notes on the back of the print' });
}

export function renderVerso(el: HTMLElement, roll: Roll, view: PrintView, at: VersoPosition): void {
  for (const key of ['paper', 'ink', 'accent', 'glow', 'second'] as const) {
    el.style.setProperty(`--${key}`, roll.process[key]);
  }
  el.dataset.roll = roll.id;
  el.dataset.status = view.status;
  const notes = ROLL_NOTES[roll.id];

  const learn = h('dl', { class: 'verso-learn' },
    ...roll.concepts.flatMap((concept) => [
      h('dt', {}, h('code', {}, concept)),
      h('dd', {}, notes.gists[concept] ?? ''),
    ]));

  const sheet = h('ol', { class: 'verso-sheet', 'aria-label': 'The four frames of this roll' },
    ...FRAMES.map((frame: FrameId) => {
      const done = view.frames.includes(frame);
      return h('li', { 'data-done': done ? 'true' : 'false' },
        h('span', { class: 'verso-frame-name' }, glyph(frame, 18), frame),
        h('span', { class: 'verso-frame-note' }, done ? 'Developed' : FRAME_NOTES[frame]));
    }));

  el.replaceChildren(
    h('p', { class: 'verso-watermark', 'aria-hidden': 'true' }, 'drawable photographic paper  drawable photographic paper'),
    h('header', { class: 'verso-edge' },
      h('span', { class: 'verso-hand' }, 'Notes on the back'),
      h('span', {}, `Frame ${roll.frame}, ${roll.process.name}`)),
    h('h2', { class: 'verso-title' }, roll.title),
    h('p', { class: 'verso-foe' }, h('em', {}, `Faces ${roll.foe}.`)),
    h('h3', { class: 'verso-heading' }, 'What you’ll learn'),
    learn,
    h('h3', { class: 'verso-heading' }, 'Contact sheet'),
    sheet,
    h('p', { class: 'verso-build' }, h('strong', {}, 'You’ll build: '), notes.build),
    ...(view.status === 'open' ? [] : [h('p', { class: 'verso-locked' }, glyph('lock', 16),
      view.status === 'sealed' ? 'Still in the fixer bath.' : `Develops after you finish the trial in “${view.previousTitle ?? 'the last roll'}”.`)]),
    footer(roll, view, at),
  );
}

function footer(roll: Roll, view: PrintView, at: VersoPosition): HTMLElement {
  const done = view.frames.length;
  const action = view.status === 'open'
    ? h('button', { class: 'verso-start', type: 'button', 'data-enter': roll.id },
      done === 0 ? 'Start roll' : done === FRAMES.length ? 'Replay roll' : 'Continue roll')
    : null;

  return h('footer', { class: 'verso-footer' },
    h('span', { class: 'verso-nav' },
      h('button', { class: 'verso-step', type: 'button', 'data-verso': 'prev', 'aria-label': 'Previous print', disabled: at.index === 0 }, '‹'),
      h('span', { class: 'verso-count' }, `${at.index + 1} of ${at.total}`),
      h('button', { class: 'verso-step', type: 'button', 'data-verso': 'next', 'aria-label': 'Next print', disabled: at.index === at.total - 1 }, '›')),
    h('span', { class: 'verso-actions' },
      h('button', { class: 'verso-close', type: 'button', 'data-verso': 'close' }, 'Hang it back'),
      action));
}
