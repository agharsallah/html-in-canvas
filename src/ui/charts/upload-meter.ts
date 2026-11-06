/**
 * Upload meter: a live SVG bar chart of texture uploads per second, with
 * GPU (re)allocations marked on each bar and the bytes moved per second.
 *
 * One bar per half second, 24 bars (12 s). A dashed line marks "one upload
 * every frame" at 60/s, the cost of uploading without checking
 * `changedElements`. Redrawn twice a second, never per frame.
 */
import { h } from '../dom';
import { s } from './svg';

export interface UploadMeter {
  readonly el: HTMLElement;
  record(bytes: number, allocated: boolean): void;
  /** Uploads per second over the last full second. */
  readonly rate: number;
  destroy(): void;
}

interface Bucket { uploads: number; allocations: number; bytes: number }

const BUCKETS = 24;
const BUCKET_MS = 500;
const W = 480;
const H = 150;
const PAD = { left: 34, right: 8, top: 10, bottom: 22 };
const MAX_RATE = 70;

export function createUploadMeter(): UploadMeter {
  const buckets: Bucket[] = Array.from({ length: BUCKETS }, () => ({ uploads: 0, allocations: 0, bytes: 0 }));
  let current: Bucket = { uploads: 0, allocations: 0, bytes: 0 };
  let total = 0;
  let totalAllocations = 0;
  let rate = 0;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const y = (perSecond: number) => PAD.top + plotH - (Math.min(perSecond, MAX_RATE) / MAX_RATE) * plotH;
  const barW = plotW / BUCKETS;

  const bars = s('g', { class: 'meter-bars' });
  const marks = s('g', { class: 'meter-allocs' });
  const grid = s('g', { class: 'meter-grid' },
    ...[0, 30, 60].map((v) => s('g', {},
      s('line', { x1: PAD.left, x2: W - PAD.right, y1: y(v), y2: y(v), class: v === 60 ? 'meter-frame-line' : 'meter-gridline' }),
      s('text', { x: PAD.left - 6, y: y(v) + 4, 'text-anchor': 'end' }, String(v)))),
    s('text', { x: W - PAD.right, y: y(60) - 4, 'text-anchor': 'end', class: 'meter-note' }, 'every frame'),
    s('text', { x: PAD.left, y: H - 6 }, '12 s ago'),
    s('text', { x: W - PAD.right, y: H - 6, 'text-anchor': 'end' }, 'now'));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'meter-svg', 'aria-hidden': 'true' }, grid, bars, marks);

  const stat = (label: string) => {
    const value = h('strong', {}, '0');
    return { value, el: h('span', { class: 'meter-stat' }, value, h('span', {}, label)) };
  };
  const perSec = stat('uploads / s');
  const bytesSec = stat('moved / s');
  const allocs = stat('allocations');
  const summary = h('p', { class: 'visually-hidden' });
  const el = h('figure', { class: 'chart upload-meter' },
    h('figcaption', { class: 'chart-head' },
      h('span', { class: 'chart-title' }, 'Texture uploads'),
      h('span', { class: 'chart-legend' },
        h('span', { class: 'legend-item', 'data-series': 'upload' }, h('i'), 'Uploads'),
        h('span', { class: 'legend-item', 'data-series': 'alloc' }, h('i'), 'GPU allocations'))),
    h('div', { class: 'meter-stats' }, perSec.el, bytesSec.el, allocs.el),
    svg, summary);

  const draw = () => {
    bars.replaceChildren(...buckets.map((b, i) => {
      const perSecond = b.uploads * (1000 / BUCKET_MS);
      return s('rect', { x: PAD.left + i * barW + 1, y: y(perSecond), width: Math.max(1, barW - 2), height: PAD.top + plotH - y(perSecond), rx: 2 });
    }));
    marks.replaceChildren(...buckets.flatMap((b, i) => b.allocations
      ? [s('rect', { x: PAD.left + i * barW + 1, y: y(b.allocations * (1000 / BUCKET_MS)) - 1, width: Math.max(1, barW - 2), height: Math.max(3, PAD.top + plotH - y(b.allocations * (1000 / BUCKET_MS))), rx: 2 })]
      : []));
  };

  const fmt = (bytes: number) => bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : bytes >= 1e3 ? `${Math.round(bytes / 1e3)} kB` : `${bytes} B`;
  const timer = window.setInterval(() => {
    buckets.shift();
    buckets.push(current);
    current = { uploads: 0, allocations: 0, bytes: 0 };
    const last = buckets.slice(-2);
    rate = last.reduce((n, b) => n + b.uploads, 0);
    perSec.value.textContent = String(rate);
    bytesSec.value.textContent = fmt(last.reduce((n, b) => n + b.bytes, 0));
    allocs.value.textContent = String(totalAllocations);
    summary.textContent = `${rate} uploads per second, ${totalAllocations} allocations, ${total} uploads in total.`;
    draw();
  }, BUCKET_MS);
  draw();

  return {
    el,
    get rate() {
      return rate;
    },
    record(bytes, allocated) {
      current.uploads += 1;
      current.bytes += bytes;
      total += 1;
      if (allocated) {
        current.allocations += 1;
        totalAllocations += 1;
      }
    },
    destroy: () => clearInterval(timer),
  };
}
