/**
 * Epilogue figures.
 */
import { s } from '../../ui/charts/svg';
import { h } from '../../ui/dom';

/**
 * Threaded scrolling against a busy main thread. Top: canvas content drawn
 * from script can only change when the main thread is free. Bottom (the
 * mode being considered): the canvas replays its retained commands on every
 * scroll update, without waiting for script.
 */
export function replayFigure(): HTMLElement {
  const ticks = Array.from({ length: 12 }, (_, i) => 150 + i * 38);
  const busy = { from: 260, to: 450 };
  const free = (x: number) => x < busy.from || x > busy.to;
  const lane = (y: number, label: string) => [
    s('text', { x: 10, y: y + 5, class: 'rf-label' }, label),
    s('line', { x1: 140, x2: 610, y1: y, y2: y, class: 'rf-lane' }),
  ];
  const svg = s('svg', { viewBox: '0 0 620 230', class: 'figure-svg', role: 'img',
    'aria-label': 'Scroll updates arrive steadily on their own thread. While the main thread is busy, canvas content drawn from script stops changing. In the auto-updating mode being considered, the canvas replays its commands on every scroll update and keeps up.' },
    ...lane(30, 'scroll thread'),
    ...ticks.map((x) => s('circle', { cx: x, cy: 30, r: 5, class: 'rf-tick' })),
    ...lane(80, 'main thread'),
    s('rect', { x: busy.from, y: 70, width: busy.to - busy.from, height: 20, rx: 4, class: 'rf-busy' }),
    s('text', { x: (busy.from + busy.to) / 2, y: 84, 'text-anchor': 'middle', class: 'rf-busy-text' }, 'busy script'),
    ...lane(140, 'paint event'),
    ...ticks.map((x) => s('rect', { x: x - 7, y: 132, width: 14, height: 16, rx: 2, class: free(x) ? 'rf-frame' : 'rf-frame rf-stale' })),
    ...lane(195, 'auto-updating'),
    ...ticks.map((x) => s('rect', { x: x - 7, y: 187, width: 14, height: 16, rx: 2, class: 'rf-frame rf-replay' })),
    s('text', { x: 140, y: 168, class: 'rf-note' }, 'frames wait for script'),
    s('text', { x: 140, y: 224, class: 'rf-note' }, 'commands replayed on each scroll update (being considered)'));
  return h('div', { class: 'figure figure-reel' }, svg);
}

/** The five primitives from the README, as one strip of film. */
export function primitivesFigure(): HTMLElement {
  const items = ['content attribute', 'drawable attribute', 'paint event', 'drawElementImage & co.', 'updateElementGeometry'];
  const svg = s('svg', { viewBox: '0 0 620 110', class: 'figure-svg', role: 'img',
    'aria-label': 'The five primitives: the content attribute, the drawable attribute, the paint event, drawElementImage with its WebGL and WebGPU siblings, and updateElementGeometry for synchronising the DOM.' },
    s('rect', { x: 4, y: 10, width: 612, height: 90, rx: 6, class: 'rf-film' }),
    ...Array.from({ length: 20 }, (_, i) => s('rect', { x: 14 + i * 30.5, y: 16, width: 12, height: 7, rx: 1, class: 'rf-sprocket' })),
    ...Array.from({ length: 20 }, (_, i) => s('rect', { x: 14 + i * 30.5, y: 87, width: 12, height: 7, rx: 1, class: 'rf-sprocket' })),
    ...items.flatMap((label, i) => [
      s('rect', { x: 14 + i * 120, y: 30, width: 110, height: 50, rx: 3, class: 'rf-cell' }),
      s('text', { x: 69 + i * 120, y: 52, 'text-anchor': 'middle', class: 'rf-num' }, String(i + 1)),
      s('text', { x: 69 + i * 120, y: 70, 'text-anchor': 'middle', class: 'rf-cell-text' }, label),
    ]));
  return h('div', { class: 'figure figure-reel' }, svg);
}
