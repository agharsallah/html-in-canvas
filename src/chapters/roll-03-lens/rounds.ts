/**
 * Phase two of the boss fight: sizing and centring puzzles. Pure data plus a
 * checker, so tests can pin every expected answer to the docs.
 */
import { analyzeSizing, borderBoxWidth, centerElement, devicePixels, scaleFactors, type BoxStyle, type Size, type SizingReport } from './rules';

export interface GridRound {
  kind: 'grid';
  id: string;
  prompt: string;
  css: Size;
  dpr: number;
  /** The grid the canvas has now (shown as the starting point). */
  start: Size;
}

export interface CenterRound {
  kind: 'center';
  id: string;
  prompt: string;
  css: Size;
  dpr: number;
  /** The card's CSS, as written in the stylesheet. */
  card: BoxStyle & { height: number };
}

export type SizingRound = GridRound | CenterRound;

export const ROUNDS: readonly SizingRound[] = [
  {
    kind: 'grid', id: 'worked-example',
    prompt: 'The docs’ worked example. The canvas is 360 × 180 CSS px on a DPR 1.5 screen, with the default grid. Set a grid that is crisp.',
    css: { width: 360, height: 180 }, dpr: 1.5, start: { width: 300, height: 150 },
  },
  {
    kind: 'grid', id: 'hello-card',
    prompt: 'The “Hello from the DOM!” card: a canvas of 400 × 200 CSS px at DPR 1.5, grid still 400 × 200.',
    css: { width: 400, height: 200 }, dpr: 1.5, start: { width: 400, height: 200 },
  },
  {
    kind: 'grid', id: 'zoomed',
    prompt: 'The user zooms to 125%. A 320 × 160 CSS px canvas on a DPR 1 laptop now reports devicePixelRatio 1.25.',
    css: { width: 320, height: 160 }, dpr: 1.25, start: { width: 320, height: 160 },
  },
  {
    kind: 'center', id: 'center-border-box',
    prompt: 'Centre the card. The canvas is 320 × 160 CSS px at DPR 2, and its grid already matches the device pixels.',
    css: { width: 320, height: 160 }, dpr: 2,
    card: { width: 200, height: 80, padding: 16, border: 0, boxSizing: 'border-box' },
  },
  {
    kind: 'center', id: 'center-content-box',
    prompt: 'Centre it again. A 400 × 200 CSS px canvas at DPR 1.5, crisp grid. This stylesheet forgot one line.',
    css: { width: 400, height: 200 }, dpr: 1.5,
    card: { width: 200, height: 60, padding: 16, border: 2, boxSizing: 'content-box' },
  },
];

/** The crisp grid for a round (what devicePixelContentBoxSize reports). */
export function gridAnswer(round: GridRound): Size {
  return devicePixels(round.css, round.dpr);
}

export interface CenterAnswer {
  /** The card's border box in CSS px (offsetWidth, offsetHeight). */
  offset: Size;
  /** Drawn size and position in canvas grid px. */
  width: number;
  height: number;
  x: number;
  y: number;
}

export function centerAnswer(round: CenterRound): CenterAnswer {
  const grid = devicePixels(round.css, round.dpr);
  const offset = {
    width: borderBoxWidth(round.card),
    height: borderBoxWidth({ ...round.card, width: round.card.height }),
  };
  return { offset, ...centerElement(grid, scaleFactors(grid, round.css), offset) };
}

export interface RoundResult {
  ok: boolean;
  message: string;
  /** For grid rounds: the sharpness report of the submitted grid. */
  report?: SizingReport;
}

const TOLERANCE = 0.5;

export function checkGrid(round: GridRound, grid: Size): RoundResult {
  const device = gridAnswer(round);
  const report = analyzeSizing(round.css, grid, device);
  if (!Number.isFinite(grid.width) || !Number.isFinite(grid.height) || grid.width <= 0 || grid.height <= 0) {
    return { ok: false, report, message: 'A grid needs a positive width and height.' };
  }
  if (report.verdict === 'crisp') return { ok: true, report, message: `Crisp: ${device.width} × ${device.height} grid px, one canvas px per device px.` };
  if (grid.width === Math.round(round.css.width) && grid.height === Math.round(round.css.height)) {
    return { ok: false, report, message: 'That is the CSS size. The grid has to match device pixels: CSS px × devicePixelRatio.' };
  }
  if (report.stretched) return { ok: false, report, message: 'Width and height scale differently, so the print is squashed as well as blurred.' };
  return { ok: false, report, message: `Still resampled: one canvas px covers ${report.devicePerGrid.toFixed(2)} device px. Aim for exactly 1.` };
}

export function checkCenter(round: CenterRound, x: number, y: number): RoundResult {
  const answer = centerAnswer(round);
  const ok = Math.abs(x - answer.x) <= TOLERANCE && Math.abs(y - answer.y) <= TOLERANCE;
  if (ok) return { ok, message: `Dead centre: (${answer.x}, ${answer.y}) in grid px.` };
  const grid = devicePixels(round.css, round.dpr);
  const { scaleX } = scaleFactors(grid, round.css);
  const unscaled = (grid.width - answer.offset.width) / 2;
  if (Math.abs(x - unscaled) <= TOLERANCE) return { ok, message: '`offsetWidth` is CSS px. Multiply it by `scaleX` before subtracting it from `canvas.width`.' };
  const cssWidthOnly = (grid.width - round.card.width * scaleX) / 2;
  if (round.card.boxSizing === 'content-box' && Math.abs(x - cssWidthOnly) <= TOLERANCE) {
    return { ok, message: 'The card is `content-box`, so its drawn border box is wider than `width`: add the padding and border (that is `offsetWidth`).' };
  }
  return { ok, message: 'Not centred. Width in grid px = offsetWidth × scaleX; x = (canvas.width − width) / 2.' };
}
