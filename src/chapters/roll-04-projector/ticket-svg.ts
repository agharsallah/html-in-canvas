/**
 * The trial's ticket as SVG, and a faithful SVG "projection" of a
 * drawElementImage call: clip to the source rect (CSS px, element space),
 * then map it onto the destination rect (grid px) under ctx.rotate.
 */
import { s } from '../../ui/charts/svg';
import { TICKET, TICKET_GLOW, type Projection } from './rules';

let clipCount = 0;

/** A 200 × 100 ticket in its own CSS px space, with a glow that overflows the border box. */
export function ticketArt(): SVGGElement {
  const { w, h } = TICKET;
  const g = TICKET_GLOW;
  const holes = Array.from({ length: 9 }, (_, i) => s('rect', { x: 10 + i * 14, y: 86, width: 7, height: 6, rx: 1.5, class: 'tk-hole' }));
  return s('g', { class: 'tk' },
    s('rect', { x: -g, y: -g, width: w + 2 * g, height: h + 2 * g, rx: 14, class: 'tk-glow' }),
    s('rect', { x: 0, y: 0, width: w, height: h, rx: 6, class: 'tk-paper' }),
    s('rect', { x: 0, y: 0, width: 140, height: 40, class: 'tk-title-band' }),
    s('text', { x: 10, y: 26, class: 'tk-title' }, 'CROOKED REEL'),
    s('text', { x: 10, y: 60, class: 'tk-sub' }, 'Hall 4 · Row C · Seat 7'),
    ...holes,
    s('line', { x1: 140, y1: 4, x2: 140, y2: 96, class: 'tk-tear' }),
    s('text', { x: 174, y: 44, class: 'tk-stub', transform: 'rotate(-90 174 44)', 'text-anchor': 'middle' }, 'ADMIT ONE'),
    s('text', { x: 170, y: 93, class: 'tk-stub-no', 'text-anchor': 'middle' }, 'Nº 04'));
}

/** The ticket as `projection` would draw it on a canvas grid. */
export function framing(projection: Projection, className: string): SVGGElement {
  const { source: src, dest, rotate } = projection;
  const id = `tk-clip-${++clipCount}`;
  const sx = src.w ? dest.w / src.w : 0;
  const sy = src.h ? dest.h / src.h : 0;
  return s('g', { class: className, transform: `rotate(${rotate}) translate(${dest.x} ${dest.y}) scale(${sx} ${sy}) translate(${-src.x} ${-src.y})` },
    s('clipPath', { id }, s('rect', { x: src.x, y: src.y, width: src.w, height: src.h })),
    s('g', { 'clip-path': `url(#${id})` }, ticketArt()),
    s('rect', { x: src.x, y: src.y, width: src.w, height: src.h, class: 'tk-frame', 'vector-effect': 'non-scaling-stroke' }));
}
