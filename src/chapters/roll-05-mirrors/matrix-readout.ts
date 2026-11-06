/**
 * Matrix readout: the transform you drew with, next to the one the browser
 * holds (`getElementTransform`), cell by cell. Cells that disagree glow: that
 * gap is where Ghost Clicks lives. All values are CSS px.
 */
import { h } from '../../ui/dom';
import { toAffine, type Matrix16 } from './rules';

const CELLS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

export interface MatrixReadout {
  readonly el: HTMLElement;
  update(drawn: Matrix16, reported: Matrix16, status: { geometry: boolean; clipped: boolean; native: boolean }): void;
}

const fmt = (n: number) => (Math.abs(n) < 0.005 ? '0' : n.toFixed(Math.abs(n) >= 10 ? 1 : 2));

export function createMatrixReadout(): MatrixReadout {
  const row = (label: HTMLElement | string) => {
    const cells = CELLS.map((c) => h('td', { 'data-cell': c }, '0'));
    return { tr: h('tr', {}, h('th', { scope: 'row' }, label), ...cells), cells };
  };
  const drawnRow = row('drawn at');
  const reportedRow = row(h('code', {}, 'getElementTransform()'));
  const status = h('p', { class: 'matrix-status', 'aria-live': 'polite' });
  const el = h('div', { class: 'matrix-readout' },
    h('table', { class: 'matrix-table' },
      h('caption', {}, 'Transforms, CSS px'),
      h('thead', {}, h('tr', {}, h('td'), ...CELLS.map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, drawnRow.tr, reportedRow.tr)),
    status);
  let lastStatus = '';

  return {
    el,
    update(drawn, reported, s) {
      const d = toAffine(drawn);
      const r = toAffine(reported);
      let differs = false;
      CELLS.forEach((c, i) => {
        drawnRow.cells[i]!.textContent = fmt(d[c]);
        reportedRow.cells[i]!.textContent = fmt(r[c]);
        const off = s.geometry && Math.abs(d[c] - r[c]) > 0.5;
        differs ||= off;
        reportedRow.cells[i]!.dataset.off = String(off);
      });
      const text = !s.geometry
        ? 'No geometry: not hit testable. getElementTransform() reports identity.'
        : differs
          ? 'Out of sync: the hit area is not where the button is drawn.'
          : `In sync${s.clipped ? ', hit area clipped to the top half' : ''}.`;
      const full = `${text}${s.native ? ' (read from the browser)' : ' (simulated)'}`;
      if (full !== lastStatus) {
        status.textContent = full;
        status.dataset.state = !s.geometry ? 'none' : differs ? 'off' : 'ok';
        lastStatus = full;
      }
    },
  };
}
