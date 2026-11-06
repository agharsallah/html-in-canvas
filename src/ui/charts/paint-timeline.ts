/**
 * Paint timeline: a live strip chart of rendering updates. One column per
 * frame. A bar means `paint` fired; its height is the number of changed
 * elements (a bare requestPaint() paint shows as a short bar of its own
 * colour). Frames with no paint show a small baseline tick: silence.
 *
 * Two series (change, request) with a legend; per-column hover tooltip;
 * a text summary for screen readers.
 *
 * After half a second without a paint the strip freezes and shows a quiet
 * marker, so the last burst stays readable instead of scrolling away.
 *
 * Performance: drawn on a 2D canvas from the slot list, and only while the
 * strip moves. A live chart that rebuilds SVG every frame costs hundreds of
 * DOM mutations a second; this costs one small canvas draw per frame, and
 * nothing at all while quiet.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { h } from '../dom';

export interface PaintTimeline {
  readonly el: HTMLElement;
  /** Advance one rendering update (call once per animation frame). */
  tick(): void;
  /** Record a paint in the current frame. */
  record(changed: readonly string[]): void;
  destroy(): void;
}

interface Slot {
  frame: number;
  paint: boolean;
  changed: string[];
}

const SLOTS = 180; // about three seconds at 60 frames a second
const MAX_CHANGED = 3;
const FREEZE_AFTER = 30; // frames of silence before the strip stops scrolling
const COLORS = { change: '#c4501d', request: '#11907a' };

export function createPaintTimeline(): PaintTimeline {
  let frame = 0;
  let slots: Slot[] = [];
  let current: Slot = { frame, paint: false, changed: [] };
  const totals = { change: 0, request: 0 };
  let idle = 0;
  let scale = 1;
  let quietInk = '';

  const canvas = h('canvas', { class: 'timeline-canvas', 'aria-hidden': 'true' });
  const status = h('span', { class: 'timeline-status', 'aria-hidden': 'true', 'data-quiet': 'false' }, 'Live');
  const tooltip = h('div', { class: 'chart-tooltip', role: 'tooltip', hidden: true });
  const summary = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const counts = { change: h('strong', {}, '0'), request: h('strong', {}, '0') };
  const el = h('figure', { class: 'chart timeline' },
    h('figcaption', { class: 'chart-head' },
      h('span', { class: 'chart-title' }, 'Rendering updates'),
      h('span', { class: 'chart-legend' },
        h('span', { class: 'legend-item', 'data-series': 'change' }, h('i'), 'Real change ', counts.change),
        h('span', { class: 'legend-item', 'data-series': 'request' }, h('i'), 'requestPaint() only ', counts.request),
        h('span', { class: 'legend-item', 'data-series': 'quiet' }, h('i'), 'No paint')),
      status),
    h('div', { class: 'timeline-plot' }, canvas, tooltip),
    h('p', { class: 'chart-axis-label' }, 'Newest on the right. Bar height: number of changed elements.'),
    summary);

  const columns = () => [...slots, current].slice(-SLOTS);

  const draw = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width) return;
    // Read the theme colour once; getComputedStyle per frame forces style work.
    quietInk ||= getComputedStyle(el).getPropertyValue('--ink').trim() || '#3d2414';
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const bar = width / SLOTS;
    const barWidth = Math.max(1, bar - Math.max(1, scale)); // a surface gap between fills
    const base = height - 2 * scale;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = quietInk;
    ctx.fillRect(0, base, width, scale);
    const cols = columns();
    const offset = SLOTS - cols.length;
    cols.forEach((slot, i) => {
      const x = (offset + i) * bar;
      if (!slot.paint) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = quietInk;
        ctx.fillRect(x, base - 3 * scale, barWidth, 3 * scale);
        return;
      }
      const units = slot.changed.length ? Math.min(slot.changed.length, MAX_CHANGED) : 0.5;
      const barHeight = (units / MAX_CHANGED) * (base - 8 * scale);
      ctx.globalAlpha = 1;
      ctx.fillStyle = slot.changed.length ? COLORS.change : COLORS.request;
      ctx.fillRect(x, base - barHeight, barWidth, barHeight);
    });
  };

  const stopSize = observeCanvasSize(canvas, (size) => {
    scale = size.scale;
    draw();
  }, { maxScale: 2 });

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * SLOTS);
    const cols = columns();
    const slot = cols[col - (SLOTS - cols.length)];
    if (!slot) {
      tooltip.hidden = true;
      return;
    }
    tooltip.hidden = false;
    tooltip.textContent = !slot.paint
      ? `Frame ${slot.frame}: no paint`
      : `Frame ${slot.frame}: paint, changedElements [${slot.changed.join(', ')}]`;
    tooltip.style.left = `${Math.min(rect.width - 220, Math.max(0, event.clientX - rect.left - 110))}px`;
  });
  canvas.addEventListener('pointerleave', () => (tooltip.hidden = true));

  /** Write the status only when its text changes: no DOM work on quiet frames. */
  const setStatus = (text: string, quiet: boolean) => {
    if (status.textContent === text) return;
    status.textContent = text;
    status.dataset.quiet = String(quiet);
  };

  let summaryTimer = 0;
  return {
    el,
    tick() {
      if (!current.paint) idle += 1;
      if (idle > FREEZE_AFTER) {
        setStatus(`Quiet for ${Math.floor(idle / 60)}s`, true);
        frame += 1;
        current.frame = frame;
        return;
      }
      setStatus('Live', false);
      slots.push(current);
      if (slots.length > SLOTS) slots = slots.slice(-SLOTS);
      frame += 1;
      current = { frame, paint: false, changed: [] };
      draw();
    },
    record(changed) {
      idle = 0;
      current.paint = true;
      current.changed = [...changed];
      const kind = changed.length ? 'change' : 'request';
      totals[kind] += 1;
      counts[kind].textContent = String(totals[kind]);
      clearTimeout(summaryTimer);
      summaryTimer = window.setTimeout(() => {
        summary.textContent = `${totals.change} paints from real changes, ${totals.request} from requestPaint only.`;
      }, 800);
    },
    destroy() {
      clearTimeout(summaryTimer);
      stopSize();
    },
  };
}
