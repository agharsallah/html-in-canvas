/**
 * Rail ledger: two small live charts for the worker railway, sharing one
 * time axis (the last 12 seconds, sampled ten times a second).
 *
 *  1. Images: open ElementImages (filled area) and images in flight (line).
 *  2. Latency: capture-to-draw time of the latest draw, with a dashed
 *     "late" threshold.
 *
 * Two measures with different units get two charts, never two y-axes.
 * Hovering (or focusing and using arrow keys) shows a crosshair and the
 * values at that moment. Updates only set a few attributes per sample.
 */
import { h } from '../dom';
import { s } from './svg';

export interface LedgerSample {
  open: number;
  inFlight: number;
  /** Latest capture-to-draw latency in ms, or null before the first draw. */
  latency: number | null;
}

export interface RailLedger {
  readonly el: HTMLElement;
  push(sample: LedgerSample): void;
  destroy(): void;
}

const N = 120;
const W = 320;
const H = 90;

interface Panel {
  el: HTMLElement;
  svg: SVGSVGElement;
  cross: SVGLineElement;
  draw(samples: LedgerSample[]): void;
}

function axis(max: number, unit: string): SVGGElement {
  return s('g', { class: 'ledger-axis' },
    s('line', { x1: 0, x2: W, y1: H, y2: H }),
    s('text', { x: 2, y: 10 }, `${max}${unit}`),
    s('text', { x: W - 2, y: H + 12, 'text-anchor': 'end' }, 'now'),
    s('text', { x: 2, y: H + 12 }, '−12 s'));
}

const xAt = (i: number) => (i / (N - 1)) * W;

function imagesPanel(): Panel {
  const area = s('path', { class: 'ledger-area' });
  const line = s('polyline', { class: 'ledger-line ledger-line-flight', fill: 'none' });
  const cross = s('line', { class: 'ledger-cross', y1: 0, y2: H, visibility: 'hidden' });
  const axisSlot = s('g');
  const svg = s('svg', { viewBox: `0 -4 ${W} ${H + 18}`, class: 'ledger-svg', 'aria-hidden': 'true' }, axisSlot, area, line, cross);
  const el = h('div', { class: 'ledger-panel' },
    h('div', { class: 'ledger-head' },
      h('span', { class: 'ledger-title' }, 'ElementImages'),
      h('span', { class: 'chart-legend' },
        h('span', { class: 'legend-item', 'data-series': 'open' }, h('i'), 'open (not closed)'),
        h('span', { class: 'legend-item', 'data-series': 'flight' }, h('i'), 'in flight'))),
    svg);
  return {
    el, svg, cross,
    draw(samples) {
      const max = Math.max(5, ...samples.map((x) => Math.max(x.open, x.inFlight)));
      const y = (v: number) => H - (v / max) * (H - 6);
      const offset = N - samples.length;
      const pts = samples.map((x, i) => `${xAt(offset + i).toFixed(1)},${y(x.open).toFixed(1)}`);
      area.setAttribute('d', pts.length ? `M ${xAt(offset)} ${H} L ${pts.join(' L ')} L ${xAt(N - 1)} ${H} Z` : '');
      line.setAttribute('points', samples.map((x, i) => `${xAt(offset + i).toFixed(1)},${y(x.inFlight).toFixed(1)}`).join(' '));
      axisSlot.replaceChildren(axis(max, ''));
    },
  };
}

function latencyPanel(lateMs: number): Panel {
  const line = s('polyline', { class: 'ledger-line ledger-line-latency', fill: 'none' });
  const threshold = s('line', { class: 'ledger-late', x1: 0, x2: W });
  const thresholdLabel = s('text', { class: 'ledger-late-label', x: W - 2, 'text-anchor': 'end' }, `late > ${lateMs} ms`);
  const cross = s('line', { class: 'ledger-cross', y1: 0, y2: H, visibility: 'hidden' });
  const axisSlot = s('g');
  const svg = s('svg', { viewBox: `0 -4 ${W} ${H + 18}`, class: 'ledger-svg', 'aria-hidden': 'true' }, axisSlot, threshold, thresholdLabel, line, cross);
  const el = h('div', { class: 'ledger-panel' },
    h('div', { class: 'ledger-head' }, h('span', { class: 'ledger-title' }, 'Capture-to-draw latency')),
    svg);
  return {
    el, svg, cross,
    draw(samples) {
      const max = Math.ceil(Math.max(lateMs * 1.5, ...samples.map((x) => x.latency ?? 0)) / 50) * 50;
      const y = (v: number) => H - (v / max) * (H - 6);
      const offset = N - samples.length;
      line.setAttribute('points', samples.flatMap((x, i) => (x.latency === null ? [] : [`${xAt(offset + i).toFixed(1)},${y(x.latency).toFixed(1)}`])).join(' '));
      threshold.setAttribute('y1', y(lateMs).toFixed(1));
      threshold.setAttribute('y2', y(lateMs).toFixed(1));
      thresholdLabel.setAttribute('y', (y(lateMs) - 4).toFixed(1));
      axisSlot.replaceChildren(axis(max, ' ms'));
    },
  };
}

export function createRailLedger(lateMs: number): RailLedger {
  const samples: LedgerSample[] = [];
  const panels = [imagesPanel(), latencyPanel(lateMs)];
  const tooltip = h('div', { class: 'chart-tooltip ledger-tooltip', role: 'tooltip', hidden: true });
  const summary = h('p', { class: 'visually-hidden' });
  const el = h('figure', { class: 'chart rail-ledger', tabindex: '0', 'aria-label': 'Railway ledger. Use left and right arrows to read past samples.' },
    h('figcaption', { class: 'chart-head' }, h('span', { class: 'chart-title' }, 'The yard ledger'), h('span', { class: 'chart-axis-label' }, 'last 12 seconds')),
    ...panels.map((p) => p.el), tooltip, summary);
  let hover: number | null = null;

  const describe = (x: LedgerSample) =>
    `${x.open} open, ${x.inFlight} in flight, latency ${x.latency === null ? 'none yet' : `${Math.round(x.latency)} ms`}`;

  const showHover = () => {
    const offset = N - samples.length;
    if (hover === null || !samples.length) {
      panels.forEach((p) => p.cross.setAttribute('visibility', 'hidden'));
      tooltip.hidden = true;
      return;
    }
    const i = Math.min(samples.length - 1, Math.max(0, hover - offset));
    const x = xAt(offset + i);
    panels.forEach((p) => {
      p.cross.setAttribute('x1', x.toFixed(1));
      p.cross.setAttribute('x2', x.toFixed(1));
      p.cross.setAttribute('visibility', 'visible');
    });
    const ago = ((samples.length - 1 - i) / 10).toFixed(1);
    tooltip.textContent = `${ago} s ago: ${describe(samples[i]!)}`;
    tooltip.style.left = `${Math.min(70, Math.max(0, (x / W) * 100 - 15))}%`;
    tooltip.hidden = false;
  };

  const onMove = (event: PointerEvent) => {
    const rect = panels[0]!.svg.getBoundingClientRect();
    hover = Math.round(((event.clientX - rect.left) / rect.width) * (N - 1));
    showHover();
  };
  const onLeave = () => {
    hover = null;
    showHover();
  };
  const onKey = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    hover = Math.min(N - 1, Math.max(N - samples.length, (hover ?? N - 1) + step));
    showHover();
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('blur', onLeave);
  el.addEventListener('keydown', onKey);

  return {
    el,
    push(sample) {
      samples.push(sample);
      if (samples.length > N) samples.shift();
      panels.forEach((p) => p.draw(samples));
      summary.textContent = `Now: ${describe(sample)}.`;
      if (hover !== null) showHover();
    },
    destroy() {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('blur', onLeave);
      el.removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}
