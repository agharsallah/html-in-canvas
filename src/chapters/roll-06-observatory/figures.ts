/**
 * Observatory concept figures (SVG, built on demand).
 */
import { s } from '../../ui/charts/svg';
import { h } from '../../ui/dom';

const box = (x: number, y: number, w: number, label: string, sub: string, key = false) =>
  s('g', { class: key ? 'pipe-node pipe-node-key' : 'pipe-node', transform: `translate(${x} ${y})` },
    s('rect', { width: w, height: 46, rx: 8 }),
    s('text', { x: w / 2, y: 20, 'text-anchor': 'middle' }, label),
    s('text', { x: w / 2, y: 37, 'text-anchor': 'middle', class: 'pipe-sub' }, sub));

const arrow = (x1: number, y1: number, x2: number, y2: number) =>
  s('line', { x1, y1, x2, y2, class: 'pipe-link', 'marker-end': 'url(#obs-arrow)' });

const defs = () => s('defs', {}, s('marker', { id: 'obs-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
  s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'pipe-arrowhead' })));

/** Allocate once, upload on change, draw, then send geometry back to the DOM. */
export function uploadFigure(): HTMLElement {
  const svg = s('svg', { viewBox: '0 0 760 200', class: 'figure-svg', role: 'img',
    'aria-label': 'Setup allocates empty texture storage once. Each paint uploads the element snapshot into it with texElementSubImage2D, the scene is drawn, and updateElementGeometry tells the DOM where the element landed.' },
    defs(),
    box(10, 20, 150, '<form drawable>', 'live element'),
    box(200, 20, 150, 'snapshot', 'paint event'),
    box(390, 20, 170, 'texElementSubImage2D', 'copy into texture', true),
    box(600, 20, 150, 'drawScene()', 'WebGL draw'),
    box(390, 130, 170, 'texImage2D(…, null)', 'allocate once'),
    box(10, 130, 330, 'updateElementGeometry(form, …)', 'hit testing and a11y follow the mesh'),
    arrow(160, 43, 198, 43), arrow(350, 43, 388, 43), arrow(560, 43, 598, 43),
    arrow(475, 128, 475, 68),
    s('path', { d: 'M 675 66 C 675 160, 520 196, 342 160', class: 'pipe-arc pipe-arc-next', 'marker-end': 'url(#obs-arrow)' }));
  return h('div', { class: 'figure figure-obs' }, svg);
}

/** M = Viewport · Projection · View · Model · ElementToPlane, and the quad it makes. */
export function matrixFigure(): HTMLElement {
  const steps = ['ElementToPlane', 'Model', 'View', 'Projection', 'Viewport'];
  const nodes = steps.map((label, i) => box(10 + i * 112, 20, 102, label, ['px → plane', 'tilt, place', 'camera', 'perspective', '→ CSS px'][i]!));
  const links = steps.slice(1).map((_, i) => arrow(112 + i * 112, 43, 120 + i * 112, 43));
  const svg = s('svg', { viewBox: '0 0 760 200', class: 'figure-svg', role: 'img',
    'aria-label': 'Five matrices multiply into one canvasTransform. A rectangle in element pixels becomes a perspective quad on the canvas; the browser inverts it to hit-test clicks.' },
    defs(), ...links, ...nodes,
    s('rect', { x: 600, y: 18, width: 70, height: 50, class: 'obs-fig-flat' }),
    s('text', { x: 635, y: 86, 'text-anchor': 'middle', class: 'pipe-note' }, 'element box'),
    arrow(635, 92, 635, 112),
    s('polygon', { points: '598,124 690,116 676,176 610,170', class: 'obs-fig-quad' }),
    s('text', { x: 300, y: 112, 'text-anchor': 'middle', class: 'pipe-note' }, 'one 4×4 canvasTransform, in CSS px'),
    s('text', { x: 300, y: 140, 'text-anchor': 'middle', class: 'pipe-note' }, 'click at (x, y) → inverse → (u, v) in the form → the input under it'));
  return h('div', { class: 'figure figure-obs' }, svg);
}
