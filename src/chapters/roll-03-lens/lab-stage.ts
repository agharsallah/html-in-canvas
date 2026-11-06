/**
 * The lab's real canvas: a `content="drawable"` canvas whose grid YOU pick.
 *
 * native:    the card is a drawable child, drawn with drawElementImage in
 *            `paint`, centred with the docs' scaleX/scaleY recipe. The blur
 *            you see is the browser's own resampling.
 * simulated: the card is canvas text with the same box. The grid and the
 *            resampling are still real, so the blur is real too.
 *
 * A ResizeObserver on `device-pixel-content-box` reports the CSS size and
 * the device pixels; the grid preset decides what goes into canvas.width.
 */
import type { Capabilities } from '../../core/capabilities';
import { onPaint } from '../../hic/paint';
import { isDrawable2D, isDrawableCanvas, makeDrawableHost, type DrawableCanvas, type Drawable2DContext } from '../../hic/types';
import { h } from '../../ui/dom';
import { CARD, createCardElement, drawCardMock, type CardColors } from './card';
import { centerElement, presetGrid, scaleFactors, type GridPreset, type Size } from './rules';

export interface StageMetrics {
  css: Size;
  device: Size;
  grid: Size;
  /** The real device px per CSS px of this screen (from the observer). */
  dpr: number;
}

export interface DefaultSizeReading {
  size: Size;
  offset: Size;
  /** True when the number came from the real getElementImageDefaultSize(). */
  real: boolean;
}

export interface LensStage {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly native: boolean;
  setGrid(preset: GridPreset, grind: number): void;
  metrics(): StageMetrics | null;
  measureDefaultSize(): DefaultSizeReading | null;
  onResize(handler: (metrics: StageMetrics) => void): void;
  /** Called after every draw (native: after each paint). */
  onDraw(handler: () => void): void;
  destroy(): void;
}

export function createLensStage(caps: Capabilities, colors: CardColors): LensStage {
  const canvas = h('canvas', { class: 'lens-canvas', 'aria-label': 'A canvas showing the Hello from the DOM card at the grid size you pick' });
  const card = createCardElement();
  const root = h('div', { class: 'lens-surface' }, canvas);
  if (caps.canvas2d) makeDrawableHost(canvas);
  const ctx = canvas.getContext('2d')!;
  const native = caps.canvas2d && isDrawableCanvas(canvas) && isDrawable2D(ctx);
  if (native) canvas.append(card);
  else {
    card.classList.add('lens-card-measure');
    root.append(card, h('p', { class: 'lab-sim-note' }, 'Simulated card: canvas text. The grid and its blur are real.'));
  }

  let preset: GridPreset = 'default';
  let grind = 1;
  let current: StageMetrics | null = null;
  let resizeHandler: ((m: StageMetrics) => void) | null = null;
  let drawHandler: (() => void) | null = null;

  const draw = () => {
    if (!current) return;
    const scale = scaleFactors({ width: canvas.width, height: canvas.height }, current.css);
    if (native) {
      const c = ctx as Drawable2DContext;
      c.reset();
      c.fillStyle = colors.paper;
      c.fillRect(0, 0, canvas.width, canvas.height);
      // The docs' recipe: offsetWidth is CSS px, so multiply by scaleX.
      const { x, y } = centerElement(canvas, scale, { width: card.offsetWidth, height: card.offsetHeight });
      try {
        c.drawElementImage(card, x, y);
      } catch {
        // No snapshot yet: the next paint will draw it.
      }
      drawHandler?.();
      return;
    }
    ctx.reset();
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const { x, y } = centerElement(canvas, scale, CARD);
    drawCardMock(ctx, x, y, scale.scaleX, scale.scaleY, colors);
    drawHandler?.();
  };

  const apply = () => {
    if (!current) return;
    const grid = presetGrid(preset, current.css, current.device, grind);
    // Assigning width/height resets the bitmap, so only touch it on change.
    if (canvas.width !== grid.width) canvas.width = grid.width;
    if (canvas.height !== grid.height) canvas.height = grid.height;
    current = { ...current, grid };
    if (native) (canvas as DrawableCanvas).requestPaint();
    else draw();
  };

  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const box = entry.contentBoxSize?.[0];
    const css = { width: box ? box.inlineSize : entry.contentRect.width, height: box ? box.blockSize : entry.contentRect.height };
    if (css.width <= 0 || css.height <= 0) return;
    const dpc = entry.devicePixelContentBoxSize?.[0];
    const device = dpc
      ? { width: dpc.inlineSize, height: dpc.blockSize }
      : { width: Math.round(css.width * devicePixelRatio), height: Math.round(css.height * devicePixelRatio) };
    current = { css, device, grid: current?.grid ?? { width: canvas.width, height: canvas.height }, dpr: device.width / css.width };
    apply();
    resizeHandler?.(current);
  });
  try {
    observer.observe(canvas, { box: 'device-pixel-content-box' });
  } catch {
    observer.observe(canvas);
  }
  const stopPaint = native ? onPaint(canvas, draw) : () => {};

  return {
    root,
    canvas,
    native,
    setGrid(next, nextGrind) {
      preset = next;
      grind = nextGrind;
      apply();
    },
    metrics: () => current,
    measureDefaultSize() {
      if (!current) return null;
      const offset = { width: card.offsetWidth || CARD.width, height: card.offsetHeight || CARD.height };
      const drawable = canvas as DrawableCanvas;
      if (native && typeof drawable.getElementImageDefaultSize === 'function') {
        try {
          const size = drawable.getElementImageDefaultSize(card);
          return { size: { width: size.width, height: size.height }, offset, real: true };
        } catch {
          // fall through to the model
        }
      }
      const scale = scaleFactors(current.grid, current.css);
      return { size: { width: offset.width * scale.scaleX, height: offset.height * scale.scaleY }, offset, real: false };
    },
    onResize(handler) {
      resizeHandler = handler;
    },
    onDraw(handler) {
      drawHandler = handler;
    },
    destroy() {
      observer.disconnect();
      stopPaint();
      root.remove();
    },
  };
}
