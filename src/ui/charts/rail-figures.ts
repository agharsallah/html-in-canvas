/**
 * Railway figure: the round trip of an ElementImage, as two swimlanes.
 * Main thread: paint -> captureElementImage -> postMessage
 * Worker:      drawElementImage -> geometry queued -> microtask batch -> post task
 * Main thread: geometry applied -> elementgeometryupdate
 */
import { h } from '../dom';
import { s } from './svg';

const MAIN_Y = 44;
const WORKER_Y = 136;

export function railRoundTripFigure(): HTMLElement {
  const step = (x: number, y: number, label: string, key = false) =>
    s('g', { class: key ? 'rail-fig-node rail-fig-key' : 'rail-fig-node', transform: `translate(${x} ${y - 18})` },
      s('rect', { width: 118, height: 36, rx: 8 }),
      s('text', { x: 59, y: 23, 'text-anchor': 'middle' }, label));
  const arrow = (x1: number, y1: number, x2: number, y2: number) =>
    s('line', { x1, y1, x2, y2, class: 'rail-fig-link', 'marker-end': 'url(#rail-arrow)' });

  const svg = s('svg', {
    viewBox: '0 0 760 190', class: 'figure-svg', role: 'img',
    'aria-label': 'Main thread: paint, captureElementImage, postMessage. Worker: drawElementImage, geometry queued and batched in a microtask, posted home. Main thread: geometry applied, then elementgeometryupdate fires.',
  },
  s('defs', {}, s('marker', { id: 'rail-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
    s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'rail-fig-head' }))),
  s('text', { x: 6, y: MAIN_Y - 26, class: 'rail-fig-lane' }, 'main thread'),
  s('text', { x: 6, y: WORKER_Y + 38, class: 'rail-fig-lane' }, 'worker'),
  s('line', { x1: 0, x2: 760, y1: 90, y2: 90, class: 'rail-fig-divider' }),
  step(6, MAIN_Y, 'paint'),
  step(132, MAIN_Y, 'capture'),
  step(258, MAIN_Y, 'postMessage'),
  step(258, WORKER_Y, 'drawElementImage'),
  step(384, WORKER_Y, 'microtask batch'),
  step(510, MAIN_Y, 'apply geometry'),
  step(636, MAIN_Y, 'geometryupdate', true),
  arrow(124, MAIN_Y, 130, MAIN_Y),
  arrow(250, MAIN_Y, 256, MAIN_Y),
  arrow(317, MAIN_Y + 18, 317, WORKER_Y - 20),
  arrow(376, WORKER_Y, 382, WORKER_Y),
  arrow(443, WORKER_Y - 18, 560, MAIN_Y + 20),
  arrow(628, MAIN_Y, 634, MAIN_Y),
  s('text', { x: 520, y: 112, class: 'rail-fig-note' }, 'posted as a task'));

  return h('div', { class: 'figure figure-rail' }, svg);
}
