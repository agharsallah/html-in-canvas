/**
 * The loupe: a magnifier over the first letters of the card, showing the
 * pixels a screen of a chosen DPR would light up.
 *
 * It replays the pipeline from the Chrome docs (concepts.md, CC:274):
 *   1. the card is drawn into the canvas grid (anti-aliased once),
 *   2. the grid is resampled onto the device grid (blended again unless the
 *      two grids match 1:1),
 * and sets it above a reference: the same card drawn straight onto the
 * device grid, which is what a plain <div> gets. Magnified with
 * nearest-neighbour, so each block is one device pixel.
 *
 * In native mode, when the simulated DPR is your screen's, step 1 uses the
 * real canvas bitmap: real HTML, really drawn by drawElementImage.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { h } from '../../ui/dom';
import { CARD, cardOrigin, drawCardMock, type CardColors } from './card';
import { centerElement, devicePixels, scaleFactors, type Size } from './rules';

export interface LoupeInput {
  css: Size;
  grid: Size;
  dpr: number;
  /** The real canvas, used as the grid bitmap when its size matches. */
  source: HTMLCanvasElement | null;
}

export interface Loupe {
  readonly el: HTMLElement;
  render(input: LoupeInput): void;
  destroy(): void;
}

/** The magnified patch, in CSS px relative to the card: "Hel" of "Hello". */
const PATCH = { x: 18, y: 10, width: 44, height: 24 };

export function createLoupe(colors: CardColors): Loupe {
  const canvas = h('canvas', { class: 'lens-loupe-canvas', role: 'img', 'aria-label': 'Magnified device pixels of the first letters of the card' });
  const sourceNote = h('span', { class: 'lens-loupe-source' });
  const topLabel = h('span', { class: 'lens-loupe-label', 'data-row': 'top' });
  const bottomLabel = h('span', { class: 'lens-loupe-label', 'data-row': 'bottom' }, 'A plain <div>: anti-aliased once');
  const el = h('figure', { class: 'lens-loupe' },
    h('div', { class: 'lens-loupe-glass' }, canvas, topLabel, bottomLabel),
    h('figcaption', {}, 'The loupe. Each block is one device pixel. ', sourceNote));
  const ctx = canvas.getContext('2d')!;
  const gridCanvas = document.createElement('canvas');
  const deviceCanvas = document.createElement('canvas');
  const refCanvas = document.createElement('canvas');
  let last: LoupeInput | null = null;

  const resize = (target: HTMLCanvasElement, size: Size) => {
    if (target.width !== size.width) target.width = size.width;
    if (target.height !== size.height) target.height = size.height;
  };

  const paint = () => {
    if (!last || !canvas.width) return;
    const { css, grid, dpr, source } = last;
    const device = devicePixels(css, dpr);

    // 1. The canvas grid bitmap.
    resize(gridCanvas, grid);
    const g = gridCanvas.getContext('2d')!;
    const useReal = !!source && source.width === grid.width && source.height === grid.height;
    g.reset();
    let drewReal = false;
    if (useReal && source) {
      try {
        g.drawImage(source, 0, 0);
        drewReal = true;
      } catch {
        // fall back to the stand-in below
      }
    }
    if (!drewReal) {
      g.fillStyle = colors.paper;
      g.fillRect(0, 0, grid.width, grid.height);
      const scale = scaleFactors(grid, css);
      const at = centerElement(grid, scale, CARD);
      drawCardMock(g, at.x, at.y, scale.scaleX, scale.scaleY, colors);
    }
    sourceNote.textContent = drewReal ? 'Top row: your real canvas bitmap.' : 'Simulated pipeline.';

    // 2. Resampled onto the device grid (the browser stretching the canvas).
    resize(deviceCanvas, device);
    const d = deviceCanvas.getContext('2d')!;
    d.reset();
    d.imageSmoothingEnabled = true;
    d.imageSmoothingQuality = 'high';
    d.drawImage(gridCanvas, 0, 0, device.width, device.height);

    // Reference: drawn straight onto the device grid.
    resize(refCanvas, device);
    const r = refCanvas.getContext('2d')!;
    r.reset();
    r.fillStyle = colors.paper;
    r.fillRect(0, 0, device.width, device.height);
    const at = centerElement(device, { scaleX: dpr, scaleY: dpr }, CARD);
    drawCardMock(r, at.x, at.y, dpr, dpr, colors);

    // 3. Magnify the patch, nearest-neighbour, one block per device pixel.
    const origin = cardOrigin(css);
    const sx = Math.floor((origin.x + PATCH.x) * dpr);
    const sy = Math.floor((origin.y + PATCH.y) * dpr);
    const sw = Math.max(1, Math.round(PATCH.width * dpr));
    const sh = Math.max(1, Math.round(PATCH.height * dpr));
    const W = canvas.width;
    const half = Math.floor(canvas.height / 2);
    ctx.reset();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(deviceCanvas, sx, sy, sw, sh, 0, 0, W, half - 2);
    ctx.drawImage(refCanvas, sx, sy, sw, sh, 0, half + 2, W, half - 2);
    ctx.fillStyle = colors.ink;
    ctx.fillRect(0, half - 2, W, 4);
    const block = W / sw;
    if (block >= 6) {
      ctx.strokeStyle = 'rgba(31, 37, 43, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < sw; i++) {
        const x = Math.round(i * block) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let j = 1; j < sh; j++) {
        const y = Math.round(j * ((half - 2) / sh)) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.moveTo(0, y + half + 2);
        ctx.lineTo(W, y + half + 2);
      }
      ctx.stroke();
    }
    const matched = grid.width === device.width && grid.height === device.height;
    topLabel.textContent = matched ? 'Your canvas: anti-aliased once' : 'Your canvas: anti-aliased, then resampled';
  };

  const stopSize = observeCanvasSize(canvas, paint, { maxScale: 2 });
  return {
    el,
    render(input) {
      last = input;
      paint();
    },
    destroy() {
      stopSize();
      for (const c of [gridCanvas, deviceCanvas, refCanvas]) c.width = c.height = 0;
      el.remove();
    },
  };
}
