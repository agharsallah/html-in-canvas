/**
 * Collection donut: collected negatives by rarity, with the uncollected
 * remainder as a quiet track. The centre is the headline number. Each
 * segment has a hover tooltip; the legend carries labels and counts.
 */
import { h } from '../dom';
import { arcPath, s } from './svg';

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  total: number;
}

const R = 70;
const STROKE = 18;
const GAP_DEG = 2.5;

export function createDonut(slices: DonutSlice[], caption: string): HTMLElement {
  const total = slices.reduce((sum, slice) => sum + slice.total, 0);
  const collected = slices.reduce((sum, slice) => sum + slice.value, 0);
  const tooltip = h('div', { class: 'chart-tooltip', role: 'tooltip', hidden: true });

  const segments: SVGElement[] = [s('circle', { cx: 100, cy: 100, r: R, class: 'donut-track', 'stroke-width': STROKE, fill: 'none' })];
  let angle = 0;
  for (const slice of slices) {
    if (!slice.value) continue;
    const sweep = (slice.value / total) * 360;
    const path = s('path', {
      d: arcPath(100, 100, R, angle + GAP_DEG / 2, angle + Math.max(sweep - GAP_DEG / 2, GAP_DEG)),
      class: 'donut-seg', 'data-series': slice.id, 'stroke-width': STROKE, fill: 'none', 'stroke-linecap': 'butt',
    });
    path.addEventListener('pointerenter', () => {
      tooltip.hidden = false;
      tooltip.textContent = `${slice.label}: ${slice.value} of ${slice.total}`;
    });
    path.addEventListener('pointerleave', () => (tooltip.hidden = true));
    segments.push(path);
    angle += sweep;
  }

  const svg = s('svg', { viewBox: '0 0 200 200', class: 'donut-svg', role: 'img', 'aria-label': `${collected} of ${total} collected` },
    ...segments,
    s('text', { x: 100, y: 98, class: 'donut-value', 'text-anchor': 'middle' }, String(collected)),
    s('text', { x: 100, y: 122, class: 'donut-sub', 'text-anchor': 'middle' }, `of ${total}`));

  return h('figure', { class: 'chart donut' },
    h('div', { class: 'donut-plot' }, svg, tooltip),
    h('figcaption', {},
      h('span', { class: 'chart-title' }, caption),
      h('ul', { class: 'donut-legend' }, ...slices.map((slice) =>
        h('li', { class: 'legend-item', 'data-series': slice.id }, h('i'), slice.label, h('strong', {}, `${slice.value}/${slice.total}`))))));
}
