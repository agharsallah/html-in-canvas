/**
 * Leak bars: what a spy script can learn, per channel. One row per channel,
 * a stacked bar of "safe information" (allowed by design) and "leaked
 * secrets". Hover a segment for its count; the legend names both series and
 * the totals are direct-labelled in ink, so colour is never the only cue.
 */
import { h } from '../dom';
import { s } from './svg';

export interface LeakRow {
  id: string;
  label: string;
  safe: number;
  leaked: number;
}

export interface LeakBars {
  readonly el: HTMLElement;
  update(rows: LeakRow[], max: number): void;
}

const W = 420;
const LABEL_W = 132;
const ROW_H = 34;
const BAR_H = 14;
const GAP = 2;

export function createLeakBars(caption: string): LeakBars {
  const tooltip = h('div', { class: 'chart-tooltip', role: 'tooltip', hidden: true });
  const svg = s('svg', { class: 'leak-bars-svg', role: 'img' });
  const el = h('figure', { class: 'chart leak-bars' },
    h('div', { class: 'chart-head' }, h('span', { class: 'chart-title' }, caption),
      h('ul', { class: 'chart-legend' },
        h('li', { class: 'legend-item', 'data-series': 'safe' }, h('i'), 'safe, by design'),
        h('li', { class: 'legend-item', 'data-series': 'leaked' }, h('i'), 'leaked secrets'))),
    h('div', { class: 'leak-bars-plot' }, svg, tooltip));

  const tip = (node: SVGElement, text: string) => {
    node.addEventListener('pointerenter', () => {
      tooltip.hidden = false;
      tooltip.textContent = text;
    });
    node.addEventListener('pointerleave', () => (tooltip.hidden = true));
  };

  return {
    el,
    update(rows, max) {
      const height = rows.length * ROW_H + 8;
      const scale = (W - LABEL_W - 40) / Math.max(1, max);
      svg.setAttribute('viewBox', `0 0 ${W} ${height}`);
      svg.setAttribute('aria-label', rows.map((r) => `${r.label}: ${r.safe} safe, ${r.leaked} leaked`).join('; '));
      svg.replaceChildren(...rows.flatMap((row, i) => {
        const y = 4 + i * ROW_H + (ROW_H - BAR_H) / 2;
        const safeW = row.safe * scale;
        const leakW = row.leaked * scale;
        const safe = s('rect', { x: LABEL_W, y, width: Math.max(0, safeW - (leakW ? GAP : 0)), height: BAR_H, rx: 3, class: 'leak-seg', 'data-series': 'safe' });
        const leaked = s('rect', { x: LABEL_W + safeW, y, width: leakW, height: BAR_H, rx: 3, class: 'leak-seg', 'data-series': 'leaked' });
        tip(safe, `${row.label}: ${row.safe} safe`);
        tip(leaked, `${row.label}: ${row.leaked} leaked`);
        return [
          s('text', { x: 0, y: y + BAR_H - 2, class: 'leak-label' }, row.label),
          s('line', { x1: LABEL_W, x2: LABEL_W, y1: y - 6, y2: y + BAR_H + 6, class: 'leak-axis' }),
          safe, leaked,
          s('text', { x: LABEL_W + safeW + leakW + 6, y: y + BAR_H - 2, class: 'leak-total' }, row.leaked ? `${row.safe} + ${row.leaked}` : String(row.safe)),
        ];
      }));
    },
  };
}
