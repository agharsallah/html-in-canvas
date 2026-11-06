/**
 * Hit scatter: every click on a lab canvas, plotted where it landed, over the
 * drawn area (solid) and the hit area the DOM believes in (dashed). Each
 * outcome has a colour *and* a shape, so identity never rests on colour:
 *
 *   hit     ● filled dot    the drawn element got the click
 *   missed  ✕ cross         clicked the drawing, the element never heard it
 *   ghost   ◇ diamond       clicked empty canvas, the element answered anyway
 *   empty   · small ring    clicked empty canvas, nothing answered
 *
 * Series colours validated on the tintype surface (dataviz validator, dark).
 */
import { h } from '../dom';
import { s } from './svg';

export type HitKind = 'hit' | 'missed' | 'ghost' | 'empty';
export interface ScatterPoint { x: number; y: number }

const LABELS: Record<HitKind, string> = { hit: 'Hit', missed: 'Missed', ghost: 'Ghost click', empty: 'Empty' };
const KINDS: HitKind[] = ['hit', 'missed', 'ghost', 'empty'];
const MAX_POINTS = 60;

export interface HitScatter {
  readonly el: HTMLElement;
  add(point: ScatterPoint, kind: HitKind): void;
  /** Canvas size (CSS px) and the two areas to outline. */
  setShapes(size: { width: number; height: number }, drawn: ScatterPoint[] | null, hit: ScatterPoint[] | null): void;
  reset(): void;
  counts(): Record<HitKind, number>;
}

function mark(kind: HitKind, p: ScatterPoint, titled = true): SVGElement {
  const label = titled ? s('title', {}, `${LABELS[kind]} at ${Math.round(p.x)}, ${Math.round(p.y)} px`) : null;
  const attrs = { class: `scatter-mark`, 'data-kind': kind };
  if (kind === 'hit') return s('circle', { ...attrs, cx: p.x, cy: p.y, r: 6 }, label);
  if (kind === 'missed') return s('path', { ...attrs, d: `M${p.x - 5} ${p.y - 5} L${p.x + 5} ${p.y + 5} M${p.x + 5} ${p.y - 5} L${p.x - 5} ${p.y + 5}` }, label);
  if (kind === 'ghost') return s('path', { ...attrs, d: `M${p.x} ${p.y - 7} L${p.x + 7} ${p.y} L${p.x} ${p.y + 7} L${p.x - 7} ${p.y} Z` }, label);
  return s('circle', { ...attrs, cx: p.x, cy: p.y, r: 3.5 }, label);
}

const polygon = (pts: ScatterPoint[] | null) => (pts ? pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') : '');

export function createHitScatter(title: string): HitScatter {
  const counts: Record<HitKind, number> = { hit: 0, missed: 0, ghost: 0, empty: 0 };
  const drawnShape = s('polygon', { class: 'scatter-drawn' });
  const hitShape = s('polygon', { class: 'scatter-hit-area' });
  const marks = s('g', {});
  const frame = s('rect', { class: 'scatter-frame', x: 0, y: 0, width: 400, height: 300 });
  const svg = s('svg', { class: 'scatter-svg', viewBox: '0 0 400 300', role: 'img', 'aria-label': `${title}: no clicks yet` }, frame, drawnShape, hitShape, marks);
  const legendCounts = new Map<HitKind, HTMLElement>();
  const legend = h('ul', { class: 'chart-legend scatter-legend' }, ...KINDS.map((kind) => {
    const count = h('strong', {}, '0');
    legendCounts.set(kind, count);
    const glyph = s('svg', { viewBox: '-8 -8 16 16', width: 14, height: 14, 'aria-hidden': 'true' }, mark(kind, { x: 0, y: 0 }, false));
    return h('li', { class: 'legend-item', 'data-kind': kind }, glyph, LABELS[kind], count);
  }));
  const key = h('ul', { class: 'chart-legend scatter-key' },
    h('li', { class: 'legend-item' }, h('i', { class: 'scatter-key-drawn' }), 'drawn'),
    h('li', { class: 'legend-item' }, h('i', { class: 'scatter-key-hit' }), 'hit area (geometry)'));

  const el = h('figure', { class: 'chart hit-scatter' },
    h('div', { class: 'chart-head' }, h('span', { class: 'chart-title' }, title), key),
    svg,
    h('figcaption', {}, legend));

  const summarize = () => {
    const total = KINDS.reduce((sum, k) => sum + counts[k], 0);
    svg.setAttribute('aria-label', total
      ? `${title}: ${KINDS.map((k) => `${counts[k]} ${LABELS[k].toLowerCase()}`).join(', ')}`
      : `${title}: no clicks yet`);
    KINDS.forEach((k) => (legendCounts.get(k)!.textContent = String(counts[k])));
  };

  return {
    el,
    add(point, kind) {
      counts[kind] += 1;
      marks.append(mark(kind, point));
      while (marks.childElementCount > MAX_POINTS) marks.firstElementChild?.remove();
      summarize();
    },
    setShapes(size, drawn, hit) {
      const w = Math.max(1, Math.round(size.width));
      const ht = Math.max(1, Math.round(size.height));
      svg.setAttribute('viewBox', `0 0 ${w} ${ht}`);
      frame.setAttribute('width', String(w));
      frame.setAttribute('height', String(ht));
      drawnShape.setAttribute('points', polygon(drawn));
      hitShape.setAttribute('points', polygon(hit));
    },
    reset() {
      KINDS.forEach((k) => (counts[k] = 0));
      marks.replaceChildren();
      summarize();
    },
    counts: () => ({ ...counts }),
  };
}
