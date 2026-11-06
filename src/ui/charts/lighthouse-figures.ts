/**
 * Concept figures for Roll 09 (the lighthouse).
 */
import { h } from '../dom';
import { s } from './svg';

/** inert vs aria-hidden vs clearElementGeometry, as a real (accessible) table. */
export function hidingTableFigure(): HTMLElement {
  const same = 'unchanged';
  const no = 'no';
  const rows: Array<[string, string, string, string]> = [
    ['aria-hidden="true"', no, same, same],
    ['inert', no, no, no],
    ['clearElementGeometry()', 'yes, as offscreen', same, no],
  ];
  return h('div', { class: 'figure lh-figure-table' },
    h('table', {},
      h('caption', {}, 'Hiding a view that is no longer drawn'),
      h('thead', {}, h('tr', {}, ...['', 'Announced', 'Tab reaches it', 'Clicks reach it'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, ...rows.map(([what, ...cells]) =>
        h('tr', {}, h('th', { scope: 'row' }, h('code', {}, what)), ...cells.map((c) => h('td', { 'data-v': c === 'no' ? 'no' : 'yes' }, c)))))));
}

/**
 * The figure example: the <figure> is not drawable, its image and caption
 * are drawn separately. Left: what the canvas shows. Right: the
 * accessibility tree, with bounds for drawn nodes.
 */
export function figureTreeFigure(): HTMLElement {
  const node = (x: number, y: number, label: string, note: string, cls: string) => s('g', { transform: `translate(${x} ${y})`, class: cls },
    s('rect', { width: 250, height: 34, rx: 6 }),
    s('text', { x: 12, y: 22 }, label),
    s('text', { x: 238, y: 22, 'text-anchor': 'end', class: 'lh-fig-note' }, note));
  const svg = s('svg', { viewBox: '0 0 620 190', class: 'figure-svg', role: 'img',
    'aria-label': 'Left: a canvas showing an image and a caption, drawn separately. Right: the accessibility tree keeps the figure grouping, and the drawn image and caption have bounds.' },
    s('rect', { x: 10, y: 10, width: 250, height: 170, rx: 10, class: 'lh-fig-canvas' }),
    s('rect', { x: 30, y: 26, width: 210, height: 100, rx: 4, class: 'lh-fig-img' }),
    s('text', { x: 135, y: 82, 'text-anchor': 'middle', class: 'lh-fig-small' }, 'img (0, 0)'),
    s('text', { x: 135, y: 158, 'text-anchor': 'middle', class: 'lh-fig-small' }, 'figcaption (0, 200)'),
    s('line', { x1: 285, y1: 95, x2: 335, y2: 95, class: 'lh-fig-arrow' }),
    node(350, 20, 'figure', 'not drawable: semantics', 'lh-fig-node lh-fig-nogeo'),
    node(370, 75, 'img "image alt text"', 'bounds', 'lh-fig-node'),
    node(370, 130, 'figcaption', 'bounds', 'lh-fig-node'));
  return h('div', { class: 'figure lh-figure-tree' }, svg);
}
