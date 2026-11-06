/**
 * Vault figures: small SVG diagrams pinned to concept cards.
 */
import { s } from '../../ui/charts/svg';
import { h } from '../../ui/dom';

/** Two channels a leak could use, both closed by leaving the data out. */
export function channelsFigure(): HTMLElement {
  const box = (x: number, y: number, w: number, label: string, cls = 'vf-box') => s('g', { transform: `translate(${x} ${y})` },
    s('rect', { width: w, height: 40, rx: 6, class: cls }),
    s('text', { x: w / 2, y: 25, 'text-anchor': 'middle', class: 'vf-text' }, label));
  const arrow = (x1: number, y1: number, x2: number, y2: number) =>
    s('line', { x1, y1, x2, y2, class: 'vf-arrow', 'marker-end': 'url(#vf-head)' });
  const svg = s('svg', { viewBox: '0 0 640 200', class: 'figure-svg', role: 'img',
    'aria-label': 'Sensitive data could leak through painting, meaning pixel read-back or timing, or through invalidation, meaning the paint event. Both paths are cut because the data is never painted or invalidated.' },
    s('defs', {}, s('marker', { id: 'vf-head', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' },
      s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'vf-head' }))),
    box(16, 80, 150, 'sensitive data', 'vf-box vf-secret'),
    arrow(166, 92, 250, 52), arrow(166, 108, 250, 148),
    box(252, 30, 170, 'painting: pixels, timing'),
    box(252, 126, 170, 'invalidation: onpaint'),
    arrow(422, 50, 500, 50), arrow(422, 146, 500, 146),
    box(502, 30, 122, 'spy script'), box(502, 126, 122, 'spy script'),
    s('rect', { x: 432, y: 18, width: 26, height: 64, class: 'vf-bar' }),
    s('rect', { x: 432, y: 114, width: 26, height: 64, class: 'vf-bar' }),
    s('text', { x: 445, y: 196, 'text-anchor': 'middle', class: 'vf-note' }, 'excluded'));
  return h('div', { class: 'figure figure-vault' }, svg);
}

/** The two documents' lists side by side, with the rows only one of them names. */
export function listsFigure(): HTMLElement {
  const rows: Array<[string, boolean, boolean, 'never' | 'painted']> = [
    ['cross-origin content', true, true, 'never'],
    ['visited links', true, true, 'never'],
    ['spelling marks', true, true, 'never'],
    ['autofill previews', true, true, 'never'],
    ['system / OS theme colours', true, true, 'never'],
    ['caret blink rate', true, true, 'painted'],
    ['find-in-page', true, true, 'painted'],
    ['text-fragment markers', true, false, 'painted'],
    ['text selection', false, true, 'painted'],
  ];
  const y0 = 46;
  const svg = s('svg', { viewBox: `0 0 560 ${y0 + rows.length * 26 + 10}`, class: 'figure-svg', role: 'img',
    'aria-label': 'README and questionnaire compared. Both name cross-origin content, visited links, spelling marks and autofill as never painted, and caret blink rate and find-in-page as painted. Text-fragment markers appear only in the README, text selection only in the questionnaire. Both keep system or OS theme colours out.' },
    s('text', { x: 300, y: 26, 'text-anchor': 'middle', class: 'vf-head-text' }, 'README'),
    s('text', { x: 420, y: 26, 'text-anchor': 'middle', class: 'vf-head-text' }, 'Questionnaire'),
    ...rows.flatMap(([label, readme, quest, status], i) => {
      const y = y0 + i * 26;
      const mark = (x: number, on: boolean) => on
        ? s('rect', { x: x - 34, y: y - 9, width: 68, height: 14, rx: 2, class: status === 'never' ? 'vf-bar' : 'vf-shown' })
        : s('text', { x, y: y + 3, 'text-anchor': 'middle', class: 'vf-silent' }, 'silent');
      return [s('text', { x: 16, y: y + 3, class: 'vf-text vf-row' }, label), mark(300, readme), mark(420, quest)];
    }));
  return h('div', { class: 'figure figure-vault' }, svg,
    h('p', { class: 'vf-legend' }, h('span', { class: 'vf-key vf-key-never' }), 'never painted ', h('span', { class: 'vf-key vf-key-painted' }), 'painted'));
}
