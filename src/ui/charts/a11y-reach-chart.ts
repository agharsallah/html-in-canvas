/**
 * Reach chart: how many canvas children each audience can reach right now.
 * Four horizontal bars (announced, Tab-reachable, with bounds, clickable),
 * each out of the same total, with the count at the end of the bar.
 * Updates in place; the bars ease with a CSS transition.
 */
import { h } from '../dom';
import { s } from './svg';

export interface ReachRow {
  id: string;
  label: string;
  value: number;
}

export interface ReachChart {
  readonly el: HTMLElement;
  update(rows: readonly ReachRow[], total: number): void;
}

const W = 360;
const LABEL_W = 132;
const ROW_H = 30;
const BAR_H = 16;

export function createReachChart(title: string, ids: ReadonlyArray<{ id: string; label: string }>): ReachChart {
  const plotW = W - LABEL_W - 36;
  const bars = new Map<string, { bar: SVGRectElement; value: SVGTextElement }>();
  const rowsSvg = ids.map((row, i) => {
    const y = i * ROW_H;
    const bar = s('rect', { x: LABEL_W, y: y + (ROW_H - BAR_H) / 2, width: 0, height: BAR_H, rx: 3, class: 'reach-bar', 'data-series': row.id });
    const value = s('text', { x: LABEL_W + 6, y: y + ROW_H / 2 + 4, class: 'reach-value' }, '0');
    bars.set(row.id, { bar, value });
    return s('g', {},
      s('text', { x: LABEL_W - 10, y: y + ROW_H / 2 + 4, 'text-anchor': 'end', class: 'reach-label' }, row.label),
      s('rect', { x: LABEL_W, y: y + (ROW_H - BAR_H) / 2, width: plotW, height: BAR_H, rx: 3, class: 'reach-track' }),
      bar, value);
  });
  const svg = s('svg', { viewBox: `0 0 ${W} ${ids.length * ROW_H}`, class: 'reach-svg', 'aria-hidden': 'true' }, ...rowsSvg);
  // The chart is decorative for screen readers; this sentence carries the data.
  const summary = h('p', { class: 'visually-hidden' });
  const totalNote = h('span', { class: 'chart-axis-label' });
  const el = h('figure', { class: 'chart reach-chart' },
    h('div', { class: 'chart-head' }, h('span', { class: 'chart-title' }, title), totalNote),
    svg, summary);

  return {
    el,
    update(rows, total) {
      const parts: string[] = [];
      for (const row of rows) {
        const slot = bars.get(row.id);
        if (!slot) continue;
        const width = total ? (row.value / total) * plotW : 0;
        slot.bar.setAttribute('width', width.toFixed(1));
        slot.value.setAttribute('x', String(LABEL_W + width + 6));
        slot.value.textContent = String(row.value);
        parts.push(`${row.label}: ${row.value} of ${total}`);
      }
      totalNote.textContent = `out of ${total} nodes`;
      summary.textContent = parts.join('. ');
    },
  };
}
