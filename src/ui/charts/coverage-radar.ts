/**
 * Coverage radar: one spoke per roll, the distance along it is how much of
 * that roll you have mastered (0 to 1). A single series, so the title names
 * it and no legend box is needed. Spokes are labelled with the roll's frame
 * number; hovering or focusing a point shows the full detail, and a table
 * view carries every value as text.
 */
import { h } from '../dom';
import { polar, s } from './svg';

export interface RadarAxis {
  id: string;
  /** Short spoke label, e.g. a frame number. */
  short: string;
  label: string;
  value: number;
  detail: string;
}

const C = 150;
const R = 104;

export function createCoverageRadar(axes: RadarAxis[], caption: string): HTMLElement {
  const n = Math.max(3, axes.length);
  const angle = (i: number) => (i / n) * 360;
  const ring = (t: number) => axes.map((_, i) => polar(C, C, R * t, angle(i)).map((v) => v.toFixed(1)).join(',')).join(' ');
  const tooltip = h('div', { class: 'chart-tooltip', role: 'tooltip', hidden: true });

  const grid = [0.25, 0.5, 0.75, 1].map((t) => s('polygon', { points: ring(t), class: 'radar-grid', fill: 'none' }));
  const spokes = axes.map((_, i) => {
    const [x, y] = polar(C, C, R, angle(i));
    return s('line', { x1: C, y1: C, x2: x, y2: y, class: 'radar-spoke' });
  });
  const labels = axes.map((axis, i) => {
    const [x, y] = polar(C, C, R + 18, angle(i));
    return s('text', { x, y: y + 4, 'text-anchor': 'middle', class: 'radar-label' }, axis.short);
  });
  const area = s('polygon', {
    class: 'radar-area',
    points: axes.map((axis, i) => polar(C, C, R * Math.max(0.02, axis.value), angle(i)).map((v) => v.toFixed(1)).join(',')).join(' '),
  });
  const dots = axes.map((axis, i) => {
    const [x, y] = polar(C, C, R * Math.max(0.02, axis.value), angle(i));
    const g = s('g', { class: 'radar-point', tabindex: '0', role: 'img', 'aria-label': `${axis.label}: ${axis.detail}` },
      s('circle', { cx: x, cy: y, r: 12, class: 'radar-hit' }),
      s('circle', { cx: x, cy: y, r: 4, class: 'radar-dot' }));
    const show = () => {
      tooltip.hidden = false;
      tooltip.textContent = `${axis.label}: ${axis.detail}`;
    };
    g.addEventListener('pointerenter', show);
    g.addEventListener('focus', show);
    g.addEventListener('pointerleave', () => (tooltip.hidden = true));
    g.addEventListener('blur', () => (tooltip.hidden = true));
    return g;
  });

  const mean = axes.reduce((sum, a) => sum + a.value, 0) / Math.max(1, axes.length);
  const svg = s('svg', { viewBox: '0 0 300 300', class: 'radar-svg', role: 'group', 'aria-label': `${caption}: ${Math.round(mean * 100)}% overall` },
    ...grid, ...spokes, area, ...labels, ...dots);

  const table = h('details', { class: 'radar-table' },
    h('summary', {}, 'Show as a table'),
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Roll'), h('th', { scope: 'col' }, 'Mastery'))),
      h('tbody', {}, ...axes.map((a) => h('tr', {}, h('th', { scope: 'row' }, `${a.short} ${a.label}`), h('td', {}, a.detail))))));

  return h('figure', { class: 'chart coverage-radar' },
    h('div', { class: 'chart-head' }, h('span', { class: 'chart-title' }, caption), h('strong', { class: 'radar-mean' }, `${Math.round(mean * 100)}%`)),
    h('div', { class: 'radar-plot' }, svg, tooltip),
    table);
}
