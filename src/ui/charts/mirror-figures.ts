/**
 * Concept figures for the mirror maze (Roll 05): drawn pixels versus the
 * hit area the DOM believes in, and the hit-test stack.
 */
import { h } from '../dom';
import { s } from './svg';

/**
 * Left: in sync, the ghost (dashed) sits on the drawn button. Right: drawn
 * somewhere new without a geometry update, the ghost stays behind; a click on
 * the button misses, a click on the empty ghost lands.
 */
export function ghostFigure(): HTMLElement {
  const panel = (x: number, title: string, synced: boolean) => {
    const drawnX = synced ? 40 : 120;
    const drawnY = synced ? 50 : 88;
    return s('g', { transform: `translate(${x} 10)` },
      s('rect', { width: 300, height: 170, rx: 10, class: 'mfig-canvas' }),
      s('g', { transform: `translate(${drawnX} ${drawnY}) rotate(${synced ? 0 : -8})` },
        s('rect', { width: 120, height: 40, rx: 6, class: 'mfig-drawn' }),
        s('text', { x: 60, y: 25, 'text-anchor': 'middle', class: 'mfig-label' }, 'Polish me')),
      s('rect', { x: 40, y: 50, width: 120, height: 40, rx: 6, class: 'mfig-ghost' }),
      synced ? null : s('text', { x: 100, y: 42, 'text-anchor': 'middle', class: 'mfig-note' }, 'hit area stays here'),
      synced ? null : s('circle', { cx: 190, cy: 106, r: 6, class: 'mfig-miss' }),
      synced ? null : s('circle', { cx: 70, cy: 70, r: 6, class: 'mfig-ghost-click' }),
      synced ? s('circle', { cx: 100, cy: 70, r: 6, class: 'mfig-hit' }) : null,
      s('text', { x: 150, y: 196, 'text-anchor': 'middle', class: 'mfig-caption' }, title));
  };
  const svg = s('svg', { viewBox: '0 0 660 210', class: 'figure-svg', role: 'img',
    'aria-label': 'Left: drawn and synced, the dashed hit area sits on the button and a click hits. Right: the button is drawn somewhere new but the hit area stays behind: a click on the button misses and a click on the empty spot reaches it.' },
    panel(10, 'drawn and synced', true),
    panel(350, 'drawn, geometry not updated', false));
  return h('div', { class: 'figure figure-ghost' }, svg);
}

/**
 * The hit-test stack as cards seen edge-on. A click drops from the top and
 * the first card whose area contains it answers. An update (default) lifts a
 * card to the top; preserveHitTestOrder leaves it where it is.
 */
export function stackFigure(): HTMLElement {
  const card = (y: number, label: string, cls: string) => s('g', { transform: `translate(60 ${y})` },
    s('rect', { width: 220, height: 34, rx: 6, class: `mfig-card ${cls}` }),
    s('text', { x: 110, y: 22, 'text-anchor': 'middle', class: 'mfig-label' }, label));
  const column = (x: number, title: string, order: string[], lifted: string) => s('g', { transform: `translate(${x} 0)` },
    s('line', { x1: 170, y1: 6, x2: 170, y2: 40, class: 'mfig-ray' }),
    ...order.map((label, i) => card(44 + i * 44, label, label === lifted ? 'mfig-card-lifted' : '')),
    s('text', { x: 170, y: 196, 'text-anchor': 'middle', class: 'mfig-caption' }, title));
  const svg = s('svg', { viewBox: '0 0 700 210', class: 'figure-svg', role: 'img',
    'aria-label': 'Two hit-test stacks. With the default, updating the backdrop lifts it to the top so it takes the click. With preserveHitTestOrder true, the backdrop stays at the bottom and the button takes the click.' },
    column(0, 'update(backdrop): lifted to the top', ['backdrop', 'button', 'caption'], 'backdrop'),
    column(350, '{ preserveHitTestOrder: true }: stays put', ['button', 'caption', 'backdrop'], 'button'));
  return h('div', { class: 'figure figure-stack' }, svg);
}
