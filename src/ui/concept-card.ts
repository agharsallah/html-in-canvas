/**
 * A concept card: a kind emblem and name, a one-line definition, an optional
 * diagram, then detail, code and source. Cards tilt toward the pointer.
 */
import { KIND_LABELS, type ConceptCard } from '../chapters/shared/chapter';
import { glyph } from './components/glyphs';
import { h, rich } from './dom';
import { attachTilt } from './fx/tilt';

export function renderConcept(concept: ConceptCard, headingLevel: 'h3' | 'h4' = 'h3'): HTMLElement {
  const card = h('article', { class: 'concept', id: `concept-${concept.id}`, 'data-kind': concept.kind, tabindex: '-1' },
    h('div', { class: 'concept-head' },
      h('span', { class: 'concept-emblem', 'aria-hidden': 'true' }, glyph(concept.kind, 22)),
      h('div', {},
        h('p', { class: 'concept-kind' }, KIND_LABELS[concept.kind]),
        h(headingLevel, { class: 'concept-title' }, rich(concept.title)))),
    h('p', { class: 'concept-what' }, rich(concept.what)),
    concept.figure ? concept.figure() : null,
    ...(concept.body ?? []).map((paragraph) => h('p', { class: 'concept-detail' }, rich(paragraph))),
    concept.code ? h('pre', { class: 'code' }, h('code', {}, concept.code)) : null,
    concept.source ? h('p', { class: 'concept-source' }, `Source: ${concept.source}`) : null,
  );
  attachTilt(card, 3);
  return card;
}
