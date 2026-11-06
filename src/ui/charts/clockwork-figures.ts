/**
 * Roll 11 concept figures.
 *
 * optionsFigure:      the explainer's step list as a column, with the three
 *                     candidate `paint` positions and the loop-back arcs of A and B.
 * reverseOrderFigure: a page with an iframe and nested canvases, numbered in
 *                     the order their `paint` events fire.
 */
import { h } from '../dom';
import { s } from './svg';

const ROWS: Array<{ text: string; option?: 'A' | 'B' | 'C' }> = [
  { text: '14. Run animation frame callbacks' },
  { text: '16.2.1. Recalculate styles and update layout' },
  { text: '16.2.6. Deliver resize observers' },
  { text: 'Option A: paint here, loop to 16.2.1', option: 'A' },
  { text: '19. Update intersection observations' },
  { text: 'Paint (records painted output)' },
  { text: 'Option B: paint here, loop to 16.2.1', option: 'B' },
  { text: 'Option C: paint here, once (selected)', option: 'C' },
  { text: 'Commit / thread handoff' },
];

export function optionsFigure(): HTMLElement {
  const rowH = 30;
  const y = (i: number) => 14 + i * rowH;
  const rows = ROWS.map((row, i) => s('g', { class: `clock-fig-row${row.option ? ` clock-fig-opt clock-fig-opt-${row.option}` : ''}`, transform: `translate(110 ${y(i)})` },
    s('rect', { width: 370, height: rowH - 6, rx: 6 }),
    s('text', { x: 12, y: 16 }, row.text)));
  const loop = (from: number, cls: string, x: number) =>
    s('path', { d: `M 110 ${y(from) + 12} C ${x} ${y(from) + 12}, ${x} ${y(1) + 12}, 110 ${y(1) + 12}`, class: `clock-fig-loop ${cls}`, 'marker-end': 'url(#clock-fig-arrow)' });

  const svg = s('svg', { viewBox: '0 0 500 290', class: 'figure-svg', role: 'img',
    'aria-label': 'The update-the-rendering steps as listed in the explainer. Option A fires paint after resize observers and loops back to style and layout. Option B fires paint after Paint and loops back. Option C, the selected design, fires paint once right after Paint.' },
    s('defs', {}, s('marker', { id: 'clock-fig-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'clock-fig-head' }))),
    loop(3, 'clock-fig-loop-A', 62), loop(6, 'clock-fig-loop-B', 20),
    s('text', { x: 8, y: y(2) + 6, class: 'clock-fig-note' }, 'loops'),
    ...rows);
  return h('div', { class: 'figure clock-figure' }, svg);
}

export function reverseOrderFigure(): HTMLElement {
  const box = (x: number, yy: number, w: number, hh: number, label: string, order: string | null, cls: string) => s('g', { class: cls },
    s('rect', { x, y: yy, width: w, height: hh, rx: 8 }),
    s('text', { x: x + 10, y: yy + 18, class: 'clock-fig-label' }, label),
    order ? s('g', { class: 'clock-fig-badge' },
      s('circle', { cx: x + w - 16, cy: yy + 16, r: 11 }),
      s('text', { x: x + w - 16, y: yy + 20, 'text-anchor': 'middle' }, order)) : null);

  const svg = s('svg', { viewBox: '0 0 520 230', class: 'figure-svg', role: 'img',
    'aria-label': 'paint order: first the canvas inside the child iframe, then in the parent document the nested inner canvas, then the outer canvas that contains it.' },
    box(6, 6, 508, 218, 'parent document', null, 'clock-fig-doc'),
    box(22, 34, 190, 170, 'child <iframe>', null, 'clock-fig-frame'),
    box(38, 70, 158, 110, '<canvas>', '1', 'clock-fig-canvas'),
    box(228, 34, 270, 170, 'outer <canvas>', '3', 'clock-fig-canvas'),
    box(250, 76, 226, 104, 'nested <canvas>', '2', 'clock-fig-canvas clock-fig-inner'));
  return h('div', { class: 'figure clock-figure' }, svg);
}
