/**
 * Concept-card figures for the lens grinder: the units table, grouped by
 * unit and colour-coded like the lab chart.
 */
import { h } from '../../ui/dom';
import { LEDGER, UNIT_LABELS, UNITS } from './units';

export function unitsTableFigure(): HTMLElement {
  const rows = UNITS.map((unit) => h('tr', { 'data-unit': unit },
    h('th', { scope: 'row' }, UNIT_LABELS[unit]),
    h('td', {}, ...LEDGER.filter((item) => item.unit === unit).flatMap((item, i) => [
      i ? ', ' : '',
      h('code', { title: item.context }, label(item.code, item.context)),
    ]))));
  return h('div', { class: 'figure lens-units-figure' },
    h('table', { class: 'lens-units-table' },
      h('caption', {}, 'Which unit each value uses (Chrome docs, concepts.md)'),
      h('tbody', {}, ...rows)));
}

/** `dx (drawElementImage)`, or just the code when the context is prose. */
function label(code: string, context: string): string {
  const call = /^(?:ctx|canvas|gl|device\.queue)\.(\w+)\(/.exec(context);
  return call ? `${code} (${call[1]})` : code;
}
