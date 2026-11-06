/**
 * Projector map: the source rect (CSS px, in the element's border-box space)
 * on the left, the destination rect (canvas grid px) on the right, with the
 * four corner rays between them and the scale each axis gets.
 * Used live in the projector lab and statically on a concept card.
 */
import { h } from '../dom';
import { s } from './svg';

export interface MapRect { x: number; y: number; w: number; h: number }
export interface ProjectorMapInput {
  /** The element's border box, CSS px. */
  element: { w: number; h: number };
  source: MapRect;
  /** The canvas grid, grid px. */
  canvas: { w: number; h: number };
  dest: MapRect;
}

export interface ProjectorMap {
  readonly el: HTMLElement;
  update(input: ProjectorMapInput): void;
}

const r = (n: number) => Math.round(n * 10) / 10;

/** Fit `rects` into a box; returns a mapper from local units to SVG units. */
function fit(rects: MapRect[], box: MapRect) {
  const x0 = Math.min(...rects.map((q) => q.x));
  const y0 = Math.min(...rects.map((q) => q.y));
  const x1 = Math.max(...rects.map((q) => q.x + q.w));
  const y1 = Math.max(...rects.map((q) => q.y + q.h));
  const k = Math.min(box.w / Math.max(1, x1 - x0), box.h / Math.max(1, y1 - y0));
  const ox = box.x + (box.w - (x1 - x0) * k) / 2;
  const oy = box.y + (box.h - (y1 - y0) * k) / 2;
  return (q: MapRect): MapRect => ({ x: ox + (q.x - x0) * k, y: oy + (q.y - y0) * k, w: q.w * k, h: q.h * k });
}

const rect = (q: MapRect, cls: string) => s('rect', { x: q.x, y: q.y, width: Math.max(0, q.w), height: Math.max(0, q.h), class: cls });

export function createProjectorMap(label = 'Source rect in CSS pixels mapped to destination rect in canvas grid pixels'): ProjectorMap {
  const svg = s('svg', { viewBox: '0 0 720 270', class: 'figure-svg pmap', role: 'img', 'aria-label': label });
  const caption = h('p', { class: 'pmap-caption', 'aria-live': 'polite' });
  const el = h('div', { class: 'figure pmap-figure' }, svg, caption);

  return {
    el,
    update({ element, source, canvas, dest }) {
      const left = fit([{ x: 0, y: 0, ...element }, source], { x: 24, y: 44, w: 250, h: 170 });
      const right = fit([{ x: 0, y: 0, ...canvas }, dest], { x: 420, y: 44, w: 276, h: 170 });
      const src = left(source);
      const dst = right(dest);
      const corners = (q: MapRect) => [[q.x, q.y], [q.x + q.w, q.y], [q.x + q.w, q.y + q.h], [q.x, q.y + q.h]] as const;
      const a = corners(src);
      const b = corners(dst);
      const kx = source.w ? dest.w / source.w : 0;
      const ky = source.h ? dest.h / source.h : 0;
      svg.replaceChildren(
        s('text', { x: 24, y: 24, class: 'pmap-title pmap-css' }, 'source · CSS px'),
        s('text', { x: 420, y: 24, class: 'pmap-title pmap-grid' }, 'destination · canvas grid px'),
        rect(left({ x: 0, y: 0, ...element }), 'pmap-element'),
        rect(right({ x: 0, y: 0, ...canvas }), 'pmap-canvas'),
        ...a.map(([x1, y1], i) => s('line', { x1, y1, x2: b[i]![0], y2: b[i]![1], class: 'pmap-ray' })),
        rect(src, 'pmap-src'),
        rect(dst, 'pmap-dst'),
        s('text', { x: 24, y: 248, class: 'pmap-num' }, `sx ${r(source.x)}  sy ${r(source.y)}  sw ${r(source.w)}  sh ${r(source.h)}`),
        s('text', { x: 420, y: 248, class: 'pmap-num' }, `dx ${r(dest.x)}  dy ${r(dest.y)}  dw ${r(dest.w)}  dh ${r(dest.h)}`),
        s('text', { x: 347, y: 128, class: 'pmap-k', 'text-anchor': 'middle' }, `×${r(kx)} · ×${r(ky)}`),
        s('text', { x: 347, y: 146, class: 'pmap-k-note', 'text-anchor': 'middle' }, 'grid px per CSS px'));
      caption.textContent = `Source ${r(source.w)} × ${r(source.h)} CSS px lands as ${r(dest.w)} × ${r(dest.h)} grid px: ${r(kx)} grid px per CSS px across, ${r(ky)} down.`;
    },
  };
}

/** A static example for the concept card: the docs' cropped call at 2 grid px per CSS px. */
export function projectorMapFigure(): HTMLElement {
  const map = createProjectorMap('Example: a 60 by 100 CSS pixel source rect drawn as 120 by 200 canvas grid pixels at a scale of 2');
  map.update({ element: { w: 200, h: 100 }, source: { x: 140, y: 0, w: 60, h: 100 }, canvas: { w: 600, h: 300 }, dest: { x: 240, y: 50, w: 120, h: 200 } });
  return map.el;
}
