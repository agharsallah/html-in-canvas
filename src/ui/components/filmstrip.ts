/**
 * Filmstrip: the frames of a roll as a strip of 35mm film. Sprocket holes
 * run along both edges; undone frames are dark negatives, developed frames
 * are positives, and the current frame is lit by the safelight.
 */
import { h } from '../dom';
import { glyph } from './glyphs';

export interface Frame {
  id: string;
  label: string;
}

export interface Filmstrip {
  readonly el: HTMLElement;
  update(current: string, done: readonly string[]): void;
}

export function createFilmstrip(frames: Frame[], label: string, onSelect: (id: string) => void): Filmstrip {
  const buttons = frames.map((frame, i) =>
    h('button', { type: 'button', class: 'film-frame', 'data-step': frame.id, onclick: () => onSelect(frame.id) },
      h('span', { class: 'film-frame-number', 'aria-hidden': 'true' }, `${i + 1}A`),
      h('span', { class: 'film-frame-art', 'aria-hidden': 'true' }, glyph(frame.id, 22)),
      h('span', { class: 'film-frame-label' }, frame.label),
      h('span', { class: 'visually-hidden film-frame-state' })));

  const el = h('nav', { class: 'filmstrip', 'aria-label': label },
    h('ol', {}, ...buttons.map((b) => h('li', {}, b))));

  return {
    el,
    update(current, done) {
      buttons.forEach((b) => {
        const id = b.dataset.step!;
        const isDone = done.includes(id);
        b.dataset.done = String(isDone);
        b.querySelector('.film-frame-state')!.textContent = isDone ? ', developed' : ', not developed yet';
        if (id === current) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
    },
  };
}
