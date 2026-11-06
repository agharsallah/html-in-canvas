/**
 * Frame ledger: a swimlane chart of rendering updates. Rows are steps, the
 * x axis is time, grouped into frame bands. A line walks through the steps
 * in the order they ran; loop-backs show as the line jumping up. Dots are
 * coloured by kind (step, handler run, quiet, partial, jam). Flags under each
 * band show which injected effects landed in that frame.
 *
 * Generic: callers pass rows, ticks and flags; nothing here knows the model.
 * Rebuilt as SVG on each step (a few hundred nodes at most, only on input).
 */
import { h } from '../dom';
import { s } from './svg';

export interface LedgerTick {
  frame: number;
  row: number;
  kind: string;
  note: string;
}

export interface LedgerFlag {
  frame: number;
  label: string;
  tone: string;
}

export interface LedgerData {
  rows: string[];
  frames: number;
  ticks: LedgerTick[];
  /** Index of the last revealed tick (-1: nothing yet). */
  cursor: number;
  flags: LedgerFlag[];
  /** One short badge per frame, e.g. "paint ×2". */
  badges: string[];
}

export interface FrameLedger {
  readonly el: HTMLElement;
  render(data: LedgerData): void;
}

const LEFT = 118;
const TOP = 34;
const ROW_H = 24;
const COL_W = 20;
const GAP = 16;

export function createFrameLedger(title = 'Frame ledger'): FrameLedger {
  const holder = h('div', { class: 'ledger-scroll' });
  const el = h('figure', { class: 'chart ledger' },
    h('figcaption', { class: 'chart-head' },
      h('span', { class: 'chart-title' }, title),
      h('span', { class: 'chart-legend' },
        ...[['step', 'Step'], ['handler', 'paint handler'], ['loop', 'Loop back'], ['quiet', 'Quiet'], ['jam', 'Jam']].map(([k, label]) =>
          h('span', { class: 'legend-item', 'data-kind': k }, h('i'), label!)))),
    holder);

  const render = ({ rows, frames, ticks, cursor, flags, badges }: LedgerData) => {
    // Columns: collapse consecutive ticks of one step into one column.
    const cols: Array<{ frame: number; row: number; kinds: Set<string>; notes: string[]; first: number; last: number }> = [];
    ticks.forEach((t, i) => {
      const prev = cols.at(-1);
      if (prev && prev.frame === t.frame && prev.row === t.row && t.kind !== 'loop' && !prev.kinds.has('loop')) {
        prev.kinds.add(t.kind);
        prev.notes.push(t.note);
        prev.last = i;
      } else cols.push({ frame: t.frame, row: t.row, kinds: new Set([t.kind]), notes: [t.note], first: i, last: i });
    });
    const xs: number[] = [];
    const bandStart: number[] = [];
    const bandEnd: number[] = [];
    let x = LEFT;
    for (let f = 1; f <= frames; f++) {
      bandStart[f] = x;
      cols.forEach((c, i) => {
        if (c.frame !== f) return;
        xs[i] = x + COL_W / 2;
        x += COL_W;
      });
      if (x === bandStart[f]) x += COL_W * 3; // empty (jammed) frame
      bandEnd[f] = x;
      x += GAP;
    }
    const width = x;
    const rowY = (r: number) => TOP + r * ROW_H + ROW_H / 2;
    const maxFlags = Math.max(1, ...Array.from({ length: frames }, (_, k) => flags.filter((fl) => fl.frame === k + 1).length));
    const flagTop = TOP + rows.length * ROW_H + 18;
    const height = flagTop + maxFlags * 16;
    const visible = cols.map((c, i) => ({ c, i })).filter(({ c }) => c.first <= cursor);
    const current = cols.findIndex((c) => c.first <= cursor && cursor <= c.last);

    const bands = Array.from({ length: frames }, (_, k) => {
      const f = k + 1;
      // A frame is done once its last tick is revealed (an empty, jammed frame: once every tick is).
      const lastOfFrame = ticks.reduce((acc, t, i) => (t.frame === f ? i : acc), ticks.length - 1);
      const doneFrame = ticks.length > 0 && cursor >= lastOfFrame;
      return s('g', { class: 'ledger-band', 'data-odd': String(f % 2) },
        s('rect', { x: bandStart[f]! - 4, y: 4, width: bandEnd[f]! - bandStart[f]! + 8, height: height - 8, rx: 6 }),
        s('text', { x: bandStart[f]!, y: 20, class: 'ledger-frame' }, `Frame ${f}`),
        doneFrame && badges[k] ? s('text', { x: bandEnd[f]!, y: 20, class: 'ledger-badge', 'text-anchor': 'end' }, badges[k]!) : null,
        ...(doneFrame ? flags.filter((fl) => fl.frame === f).map((fl, j) =>
          s('text', { x: bandStart[f]!, y: flagTop + j * 16, class: `ledger-flag ledger-flag-${fl.tone}` }, `▲ ${fl.label}`)) : []));
    });
    const labels = rows.map((r, i) => s('text', { x: LEFT - 10, y: rowY(i) + 4, class: 'ledger-row', 'text-anchor': 'end' }, r));
    const guides = rows.map((_, i) => s('line', { x1: LEFT - 4, x2: width, y1: rowY(i), y2: rowY(i), class: 'ledger-guide' }));
    const pts = visible.map(({ i }) => `${xs[i]},${rowY(cols[i]!.row)}`).join(' ');
    const dots = visible.map(({ c, i }) => {
      const kind = c.kinds.has('jam') ? 'jam' : c.kinds.has('loop') ? 'loop' : c.kinds.has('handler') ? 'handler' : c.kinds.has('quiet') ? 'quiet' : c.kinds.has('partial') ? 'partial' : 'step';
      return s('g', { class: `ledger-dot ledger-${kind}${i === current ? ' ledger-current' : ''}` },
        s('circle', { cx: xs[i]!, cy: rowY(c.row), r: i === current ? 7 : 5 }),
        s('title', {}, c.notes.join(' ')));
    });
    const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, class: 'ledger-svg', role: 'img', style: `min-width:${Math.min(width, 560)}px`,
      'aria-label': `${title}: ${frames} frames, ${visible.length} steps run so far.` },
      ...bands, ...guides, ...labels,
      s('polyline', { points: pts, class: 'ledger-path' }), ...dots);
    holder.replaceChildren(svg);
  };

  return { el, render };
}
