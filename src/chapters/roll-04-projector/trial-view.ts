/**
 * Trial visuals: the 600 × 300 grid screen with the target framing and
 * your projected attempt, and a blueprint of the ticket in CSS px with the
 * guide lines you need to read source rects from.
 */
import { s } from '../../ui/charts/svg';
import { h } from '../../ui/dom';
import { SCREEN, TICKET, TICKET_GLOW, type Projection } from './rules';
import { framing, ticketArt } from './ticket-svg';

export interface ScreenView {
  readonly el: HTMLElement;
  show(target: Projection, attempt: Projection | null, ok: boolean): void;
}

export function createScreenView(): ScreenView {
  const svg = s('svg', { viewBox: `-30 -30 ${SCREEN.w + 60} ${SCREEN.h + 60}`, class: 'figure-svg tk-screen', role: 'img' });
  const el = h('div', { class: 'tk-screen-wrap' }, svg);
  const grid = Array.from({ length: 11 }, (_, i) => s('line', { x1: i * 60, y1: 0, x2: i * 60, y2: SCREEN.h, class: 'tk-gridline' }))
    .concat(Array.from({ length: 6 }, (_, i) => s('line', { x1: 0, y1: i * 60, x2: SCREEN.w, y2: i * 60, class: 'tk-gridline' })));
  const labels = [0, 120, 240, 360, 480, 600].map((x) => s('text', { x, y: -10, class: 'tk-axis', 'text-anchor': 'middle' }, String(x)))
    .concat([0, 60, 120, 180, 240, 300].map((y) => s('text', { x: -8, y: y + 4, class: 'tk-axis', 'text-anchor': 'end' }, String(y))));

  return {
    el,
    show(target, attempt, ok) {
      svg.setAttribute('aria-label', attempt
        ? `The screen. The target framing is outlined; your projection ${ok ? 'matches it' : 'does not match it yet'}.`
        : 'The screen, 600 by 300 grid pixels, with the target framing outlined.');
      const clip = s('clipPath', { id: 'tk-screen-clip' }, s('rect', { x: 0, y: 0, width: SCREEN.w, height: SCREEN.h }));
      svg.replaceChildren(
        clip,
        s('rect', { x: 0, y: 0, width: SCREEN.w, height: SCREEN.h, class: 'tk-canvas' }),
        ...grid, ...labels,
        s('g', { 'clip-path': 'url(#tk-screen-clip)' },
          framing(target, 'tk-target'),
          attempt ? framing(attempt, ok ? 'tk-attempt tk-ok' : 'tk-attempt') : null));
    },
  };
}

/** The ticket in its own CSS px, with guides at the numbers the rounds use. */
export function ticketBlueprint(): HTMLElement {
  const g = TICKET_GLOW;
  const xs = [0, 140, TICKET.w];
  const ys = [0, 40, TICKET.h];
  const svg = s('svg', { viewBox: `${-g - 34} ${-g - 26} ${TICKET.w + 2 * g + 54} ${TICKET.h + 2 * g + 40}`, class: 'figure-svg tk-blueprint', role: 'img',
    'aria-label': 'The ticket, 200 by 100 CSS pixels. The title band is the top-left 140 by 40. The stub is the right 60 pixels, from x 140. A 10 pixel glow surrounds the border box.' },
  ticketArt(),
  ...xs.map((x) => s('line', { x1: x, y1: -g - 6, x2: x, y2: TICKET.h + g, class: 'tk-guide' })),
  ...ys.map((y) => s('line', { x1: -g - 6, y1: y, x2: TICKET.w + g, y2: y, class: 'tk-guide' })),
  ...xs.map((x) => s('text', { x, y: -g - 10, class: 'tk-axis', 'text-anchor': 'middle' }, String(x))),
  ...ys.map((y) => s('text', { x: -g - 9, y: y + 4, class: 'tk-axis', 'text-anchor': 'end' }, String(y))),
  s('text', { x: TICKET.w + g + 2, y: TICKET.h + g + 12, class: 'tk-axis', 'text-anchor': 'end' }, `glow ${g} px`));
  return h('figure', { class: 'tk-blueprint-fig' }, svg, h('figcaption', {}, 'The ticket, in CSS px'));
}
