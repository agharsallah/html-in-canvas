/**
 * GPU pipeline chart: the path an element takes to the screen, stage by
 * stage, and the separate path its hit region takes back to the DOM.
 *
 *   element → snapshot (paint) → upload → texture → vertex → fragment → canvas
 *        ↖──────────── updateElementGeometry (hit region) ────────────┘
 *
 * Each stage is coloured by what the current shader does there: idle,
 * colour only, or moving pixels. A drift bar below compares how far pixels
 * moved with the tolerance under which clicks still land.
 */
import { h } from '../dom';
import { s } from './svg';

export type StageState = 'idle' | 'colour' | 'moves';

export interface PipelineReading {
  uploads: number;
  api: string;
  texture: string;
  vertex: { state: StageState; note: string };
  fragment: { state: StageState; note: string };
  drift: number;
  tolerance: number;
}

export interface GpuPipelineChart {
  readonly el: HTMLElement;
  update(reading: PipelineReading): void;
}

const STAGES = ['element', 'snapshot', 'upload', 'texture', 'vertex', 'fragment', 'canvas'] as const;
const LABELS: Record<(typeof STAGES)[number], string> = {
  element: 'HTML card', snapshot: 'Snapshot', upload: 'Upload', texture: 'Texture', vertex: 'Vertex', fragment: 'Fragment', canvas: 'Canvas',
};
const DRIFT_MAX = 60;

export function createGpuPipelineChart(): GpuPipelineChart {
  const gap = 106;
  const subs = new Map<string, SVGTextElement>();
  const nodes = new Map<string, SVGGElement>();
  const groups = STAGES.map((id, i) => {
    const sub = s('text', { x: 46, y: 38, 'text-anchor': 'middle', class: 'gp-sub' }, '');
    subs.set(id, sub);
    const g = s('g', { class: 'gp-node', 'data-state': 'idle', transform: `translate(${12 + i * gap} 52)` },
      s('rect', { width: 92, height: 50, rx: 8 }),
      s('text', { x: 46, y: 21, 'text-anchor': 'middle', class: 'gp-label' }, LABELS[id]),
      sub);
    nodes.set(id, g);
    return g;
  });
  const links = STAGES.slice(1).map((_, i) => s('line', { x1: 12 + i * gap + 92, x2: 12 + (i + 1) * gap, y1: 77, y2: 77, class: 'gp-link' }));
  const hitArc = s('path', { d: `M ${12 + 6 * gap + 46} 104 C ${12 + 6 * gap + 46} 168, ${58} 168, ${58} 106`, class: 'gp-hit', 'data-sync': 'true' });
  const hitLabel = s('text', { x: 380, y: 160, 'text-anchor': 'middle', class: 'gp-hit-label' }, '');
  const driftFill = s('rect', { x: 12, y: 186, height: 10, width: 0, rx: 3, class: 'gp-drift' });
  const tolX = 12 + (2 / DRIFT_MAX) * 736;
  const svg = s('svg', { viewBox: '0 0 760 214', class: 'figure-svg gp-svg', 'aria-hidden': 'true' },
    s('text', { x: 12, y: 30, class: 'gp-caption' }, 'What you see'),
    ...links, ...groups, hitArc, hitLabel,
    s('rect', { x: 12, y: 186, width: 736, height: 10, rx: 3, class: 'gp-drift-track' }),
    driftFill,
    s('line', { x1: tolX, x2: tolX, y1: 180, y2: 202, class: 'gp-tol' }),
    s('text', { x: 12, y: 178, class: 'gp-caption' }, 'Pixel drift from the hit region'),
    s('text', { x: 748, y: 178, 'text-anchor': 'end', class: 'gp-caption' }, `${DRIFT_MAX} px`));
  const summary = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const el = h('figure', { class: 'chart gpu-pipeline' },
    h('figcaption', { class: 'chart-head' }, h('span', { class: 'chart-title' }, 'The pipeline'),
      h('span', { class: 'chart-legend' },
        h('span', { class: 'legend-item', 'data-series': 'colour' }, h('i'), 'Colour only'),
        h('span', { class: 'legend-item', 'data-series': 'moves' }, h('i'), 'Moves pixels'))),
    svg, summary);

  let lastSummary = '';
  return {
    el,
    update(r) {
      subs.get('element')!.textContent = 'live DOM';
      subs.get('snapshot')!.textContent = 'paint event';
      subs.get('upload')!.textContent = `${r.uploads} × ${r.api.startsWith('tex') ? 'WebGL' : r.api.startsWith('stand') ? 'sim' : 'GPU'}`;
      subs.get('texture')!.textContent = r.texture;
      subs.get('vertex')!.textContent = r.vertex.note;
      subs.get('fragment')!.textContent = r.fragment.note;
      subs.get('canvas')!.textContent = r.drift > r.tolerance ? 'pixels moved' : 'in place';
      nodes.get('vertex')!.dataset.state = r.vertex.state;
      nodes.get('fragment')!.dataset.state = r.fragment.state;
      nodes.get('canvas')!.dataset.state = r.drift > r.tolerance ? 'moves' : r.fragment.state === 'idle' ? 'idle' : 'colour';
      const sync = r.drift <= r.tolerance;
      hitArc.dataset.sync = String(sync);
      hitLabel.textContent = sync ? 'updateElementGeometry: hit region matches the picture' : `updateElementGeometry: hit region is up to ${Math.round(r.drift)} px off the picture`;
      driftFill.setAttribute('width', String((Math.min(r.drift, DRIFT_MAX) / DRIFT_MAX) * 736));
      driftFill.dataset.over = String(!sync);
      const text = sync ? 'Colour only: clicks land where you see them.' : `Pixels moved up to ${Math.round(r.drift)} pixels: clicks will miss.`;
      if (text !== lastSummary) summary.textContent = lastSummary = text;
    },
  };
}
