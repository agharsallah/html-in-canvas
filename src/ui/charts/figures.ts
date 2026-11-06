/**
 * Concept figures: small animated diagrams pinned to concept cards.
 */
import { h } from '../dom';
import { s } from './svg';

/**
 * The rendering update, left to right, with `paint` right after Paint.
 * A pulse travels the pipeline; two arcs show where your work lands:
 * canvas drawing joins this frame, DOM edits loop back to the next one.
 */
export function pipelineFigure(): HTMLElement {
  const steps = ['rAF', 'Style', 'Layout', 'Observers', 'Paint', 'paint event', 'Composite'];
  const gap = 104;
  const nodes = steps.map((label, i) => {
    const x = 20 + i * gap;
    const special = label === 'paint event';
    return s('g', { class: special ? 'pipe-node pipe-node-key' : 'pipe-node', transform: `translate(${x} 60)` },
      s('rect', { width: 92, height: 40, rx: 8 }),
      s('text', { x: 46, y: 25, 'text-anchor': 'middle' }, label));
  });
  const links = steps.slice(1).map((_, i) =>
    s('line', { x1: 20 + i * gap + 92, x2: 20 + (i + 1) * gap, y1: 80, y2: 80, class: 'pipe-link' }));
  const paintX = 20 + 5 * gap + 46;
  const styleX = 20 + 1 * gap + 46;
  const compositeX = 20 + 6 * gap + 46;

  const svg = s('svg', { viewBox: '0 0 760 170', class: 'figure-svg', role: 'img',
    'aria-label': 'One rendering update: rAF, style, layout, observers, Paint, then the paint event, then composite. Canvas drawing in the paint event joins this frame; DOM edits loop back to the next update.' },
    s('defs', {}, s('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'pipe-arrowhead' }))),
    ...links, ...nodes,
    s('circle', { cx: 20, cy: 80, r: 6, class: 'pipe-pulse' }),
    s('path', { d: `M ${paintX} 58 C ${paintX} 18, ${compositeX} 18, ${compositeX} 56`, class: 'pipe-arc pipe-arc-now', 'marker-end': 'url(#arrow)' }),
    s('text', { x: (paintX + compositeX) / 2, y: 22, class: 'pipe-note', 'text-anchor': 'middle' }, 'canvas drawing: this frame'),
    s('path', { d: `M ${paintX} 102 C ${paintX} 158, ${styleX} 158, ${styleX} 104`, class: 'pipe-arc pipe-arc-next', 'marker-end': 'url(#arrow)' }),
    s('text', { x: (paintX + styleX) / 2, y: 160, class: 'pipe-note', 'text-anchor': 'middle' }, 'DOM edits: next frame'));

  return h('div', { class: 'figure figure-pipeline' }, svg);
}

/**
 * Nested drawables: #poem's snapshot has a hole where the drawable #you
 * sits; a second draw call fills it.
 */
export function nestedFigure(): HTMLElement {
  const lines = [0, 1, 2].map((i) => s('rect', { x: 24, y: 36 + i * 22, width: 150 - i * 18, height: 10, rx: 3, class: 'nest-line' }));
  const card = (x: number, label: string, hole: boolean, filled: boolean) => s('g', { transform: `translate(${x} 10)` },
    s('rect', { width: 210, height: 150, rx: 10, class: 'nest-card' }),
    ...lines,
    s('rect', { x: 24, y: 102, width: 70, height: 12, rx: 3, class: 'nest-line' }),
    hole ? s('rect', { x: 102, y: 96, width: 62, height: 24, rx: 5, class: 'nest-hole' }) : null,
    filled ? s('rect', { x: 102, y: 96, width: 62, height: 24, rx: 5, class: 'nest-you' }) : null,
    filled ? s('text', { x: 133, y: 113, class: 'nest-you-text', 'text-anchor': 'middle' }, 'you') : null,
    s('text', { x: 105, y: 182, class: 'nest-caption', 'text-anchor': 'middle' }, label));

  const svg = s('svg', { viewBox: '0 0 720 196', class: 'figure-svg', role: 'img',
    'aria-label': 'Left: the snapshot of poem leaves out the nested drawable you, so its spot is empty. Middle: you drawn on its own. Right: both draws combined.' },
    card(10, 'drawElementImage(poem)', true, false),
    s('text', { x: 240, y: 92, class: 'nest-op', 'text-anchor': 'middle' }, '+'),
    s('g', { transform: 'translate(262 10)' },
      s('rect', { x: 50, y: 50, width: 110, height: 50, rx: 10, class: 'nest-you' }),
      s('text', { x: 105, y: 82, class: 'nest-you-text nest-you-big', 'text-anchor': 'middle' }, 'you'),
      s('text', { x: 105, y: 182, class: 'nest-caption', 'text-anchor': 'middle' }, 'drawElementImage(you)')),
    s('text', { x: 486, y: 92, class: 'nest-op', 'text-anchor': 'middle' }, '='),
    card(500, 'the finished print', false, true));

  return h('div', { class: 'figure figure-nested' }, svg);
}
