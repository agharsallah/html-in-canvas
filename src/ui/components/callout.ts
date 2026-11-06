/**
 * Callouts: short, typed cues. The kind decides the colour bar and glyph,
 * so feedback reads the same way in every chapter.
 */
import { h, rich } from '../dom';

export type CalloutKind = 'info' | 'hint' | 'success' | 'error';

const GLYPH: Record<CalloutKind, string> = { info: 'i', hint: '?', success: '✓', error: '!' };

export interface CalloutOptions {
  kind: CalloutKind;
  title?: string;
  body?: string | Node;
}

export function callout({ kind, title, body }: CalloutOptions): HTMLElement {
  return h('div', { class: 'ui-callout', 'data-kind': kind, role: kind === 'error' || kind === 'success' ? 'status' : null },
    h('span', { class: 'ui-callout-glyph', 'aria-hidden': 'true' }, GLYPH[kind]),
    h('div', { class: 'ui-callout-body' },
      title ? h('p', { class: 'ui-callout-title' }, title) : null,
      typeof body === 'string' ? h('p', {}, rich(body)) : body ?? null));
}
