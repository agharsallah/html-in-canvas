/**
 * Lens grinder chart: the three coordinate systems of a canvas side by side.
 *
 * Top: one bar per system (CSS box, canvas grid, device pixels), length
 * proportional to its width. Bottom: a ruler over the same 8 CSS px with a
 * tick row per system, so you can see whether canvas pixels land on device
 * pixels (crisp) or straddle them (a second blend). Plain SVG, no library.
 */
import { h } from '../dom';
import { s } from './svg';

export interface GridSizes {
  css: { width: number; height: number };
  grid: { width: number; height: number };
  device: { width: number; height: number };
}

export interface GridsChart {
  readonly el: HTMLElement;
  update(sizes: GridSizes): void;
}

const W = 520;
const LABEL_W = 108;
const BAR_MAX = W - LABEL_W - 110;
const RULER_CSS = 8;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function createGridsChart(): GridsChart {
  const svg = s('svg', { viewBox: `0 0 ${W} 236`, class: 'lens-grids-svg', role: 'img' });
  const caption = h('p', { class: 'lens-grids-caption', 'aria-live': 'polite' });
  const el = h('figure', { class: 'chart lens-grids' }, svg, caption);

  const update = ({ css, grid, device }: GridSizes) => {
    const max = Math.max(css.width, grid.width, device.width);
    const rows: Array<[string, string, number, string]> = [
      ['CSS box', 'lens-bar-css', css.width, `${fmt(css.width)} × ${fmt(css.height)}`],
      ['Canvas grid', 'lens-bar-grid', grid.width, `${grid.width} × ${grid.height}`],
      ['Device px', 'lens-bar-device', device.width, `${device.width} × ${device.height}`],
    ];
    const bars = rows.map(([label, cls, value, text], i) => {
      const y = 14 + i * 34;
      const len = Math.max(4, (value / max) * BAR_MAX);
      return s('g', { class: 'lens-bar-row' },
        s('text', { x: 0, y: y + 15, class: 'lens-bar-label' }, label),
        s('rect', { x: LABEL_W, y, width: len, height: 20, rx: 3, class: `lens-bar ${cls}` }),
        s('text', { x: LABEL_W + len + 8, y: y + 15, class: 'lens-bar-value' }, text));
    });

    // Ruler: 8 CSS px wide. One tick row per system.
    const x0 = LABEL_W;
    const span = W - LABEL_W - 12;
    const pxPerCss = span / RULER_CSS;
    const ticks = (step: number, y: number, cls: string) => {
      const out: SVGElement[] = [];
      for (let t = 0, i = 0; t <= RULER_CSS + 1e-6 && i < 200; t += step, i++) {
        out.push(s('line', { x1: x0 + t * pxPerCss, x2: x0 + t * pxPerCss, y1: y, y2: y + 16, class: cls }));
      }
      return out;
    };
    const gridStep = css.width / grid.width;
    const deviceStep = css.width / device.width;
    const aligned = grid.width === device.width;
    const rulerY = 130;
    const ruler = s('g', { class: 'lens-ruler', 'data-aligned': String(aligned) },
      s('text', { x: 0, y: rulerY + 13, class: 'lens-bar-label' }, '1 CSS px'),
      ...ticks(1, rulerY, 'lens-tick lens-tick-css'),
      s('text', { x: 0, y: rulerY + 43, class: 'lens-bar-label' }, '1 canvas px'),
      ...ticks(gridStep, rulerY + 30, 'lens-tick lens-tick-grid'),
      s('text', { x: 0, y: rulerY + 73, class: 'lens-bar-label' }, '1 device px'),
      ...ticks(deviceStep, rulerY + 60, 'lens-tick lens-tick-device'),
      s('line', { x1: x0, x2: x0 + span, y1: rulerY + 23, y2: rulerY + 23, class: 'lens-ruler-base' }));

    svg.replaceChildren(...bars, ruler);
    const cssPerGrid = css.width / grid.width;
    const devPerGrid = device.width / grid.width;
    const text = `1 canvas px = ${fmt(+cssPerGrid.toFixed(3))} CSS px = ${fmt(+devPerGrid.toFixed(3))} device px.${aligned ? ' The grids line up: crisp.' : ' The grids don’t line up: blur.'}`;
    caption.textContent = text;
    svg.setAttribute('aria-label', `CSS box ${fmt(css.width)} by ${fmt(css.height)}, canvas grid ${grid.width} by ${grid.height}, device ${device.width} by ${device.height}. ${text}`);
  };

  return { el, update };
}

/** Static figure for a concept card: the docs' worked example (CC:274). */
export function workedExampleFigure(): HTMLElement {
  const chart = createGridsChart();
  chart.update({ css: { width: 360, height: 180 }, grid: { width: 300, height: 150 }, device: { width: 540, height: 270 } });
  return h('div', { class: 'figure figure-lens-grids' }, chart.el);
}
