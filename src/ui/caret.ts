/**
 * Caret, your guide: a blinking text cursor who lost their input field.
 * (A nod to the explainer's first screenshot: a form with a blinking caret.)
 */
import type { Speaker } from '../chapters/shared/chapter';
import { h } from './dom';

export function createAvatar(speaker: Speaker, foeName = 'The Smudge'): HTMLElement {
  if (speaker === 'caret') {
    return h('div', { class: 'avatar avatar-caret', role: 'img', 'aria-label': 'Caret' },
      h('span', { class: 'avatar-caret-eyes' }),
      h('span', { class: 'avatar-caret-bar' }));
  }
  if (speaker === 'foe') {
    return h('div', { class: 'avatar avatar-foe', role: 'img', 'aria-label': foeName });
  }
  return h('div', { class: 'avatar avatar-narrator', 'aria-hidden': 'true' });
}

export function speakerName(speaker: Speaker, foeName: string): string {
  return speaker === 'caret' ? 'Caret' : speaker === 'foe' ? foeName : 'Narrator';
}
