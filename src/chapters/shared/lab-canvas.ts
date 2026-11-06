/**
 * LabCanvas: a small 2D `content="drawable"` canvas for labs, with one API
 * that works in both render modes.
 *
 * native:    real `paint` events, real `drawElementImage`, real exceptions.
 * simulated: children sit in a CSS layer over the canvas. "Drawing" makes
 *            them visible at the requested transform; "paint" is emulated
 *            with the same semantics: at most one per frame, carrying the
 *            elements you reported as changed via `simulateChange()`.
 */
import type { Capabilities } from '../../core/capabilities';
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { onPaint } from '../../hic/paint';
import { isDrawable2D, isDrawableCanvas, makeDrawableHost, type Drawable2DContext } from '../../hic/types';
import { h } from '../../ui/dom';

export interface DrawTransform {
  rotate?: number; // degrees
  scale?: number;
}

export type LabPaintHandler = (changed: readonly Element[]) => void;

export interface LabCanvas {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly native: boolean;
  /** Canvas 2D context (drawable in native mode). */
  readonly ctx: CanvasRenderingContext2D;
  /** Device-pixel scale of the canvas grid. */
  scale(): number;
  /** Put an element where it can be drawn (canvas child or sim layer). */
  adopt(el: HTMLElement): void;
  onPaint(handler: LabPaintHandler): () => void;
  requestPaint(): void;
  /** Simulated mode only: report a DOM change to the emulated paint. */
  simulateChange(el: Element): void;
  /** Clear the canvas and hide simulated elements: call first in a paint. */
  beginFrame(): void;
  /** Draw an element at CSS px (x, y). Throws like the real API would. */
  drawElement(el: HTMLElement, x: number, y: number, transform?: DrawTransform): void;
  destroy(): void;
}

export interface LabCanvasOptions {
  /** Cap on the device-pixel scale of the canvas grid. Default 3. */
  maxScale?: number;
}

export function createLabCanvas(host: HTMLElement, caps: Capabilities, label: string, { maxScale = 3 }: LabCanvasOptions = {}): LabCanvas {
  const canvas = h('canvas', { class: 'lab-canvas', 'aria-label': label });
  const simLayer = h('div', { class: 'lab-sim-layer' });
  const root = h('div', { class: 'lab-surface', 'data-native': String(caps.canvas2d) }, canvas, simLayer);
  host.append(root);

  makeDrawableHost(canvas);
  const ctx2d = canvas.getContext('2d')!;
  const native = caps.canvas2d && isDrawableCanvas(canvas) && isDrawable2D(ctx2d);
  if (!native) root.append(h('p', { class: 'lab-sim-note' }, 'Simulated: same rules, no real snapshots'));
  let scale = devicePixelRatio || 1;
  const handlers = new Set<LabPaintHandler>();
  const pending = new Set<Element>();
  let simFrame = 0;
  const cleanups: Array<() => void> = [];

  const emit = (changed: readonly Element[]) => handlers.forEach((handler) => handler(changed));

  const scheduleSim = () => {
    if (native || simFrame) return;
    simFrame = requestAnimationFrame(() => {
      simFrame = 0;
      const changed = [...pending];
      pending.clear();
      emit(changed);
    });
  };

  cleanups.push(observeCanvasSize(canvas, (size) => {
    scale = size.scale;
    if (native && isDrawableCanvas(canvas)) canvas.requestPaint();
    else scheduleSim();
  }, { maxScale }));

  if (native) cleanups.push(onPaint(canvas, (changed) => emit(changed)));

  return {
    root,
    canvas,
    native,
    ctx: ctx2d,
    scale: () => scale,
    adopt(el) {
      // The caller decides whether it's `drawable`: that's part of the lesson.
      (native ? canvas : simLayer).append(el);
    },
    onPaint(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    requestPaint() {
      if (native && isDrawableCanvas(canvas)) canvas.requestPaint();
      else scheduleSim();
    },
    simulateChange(el) {
      if (native) return;
      pending.add(el);
      scheduleSim();
    },
    beginFrame() {
      ctx2d.reset();
      if (!native) for (const child of simLayer.children) (child as HTMLElement).dataset.drawn = 'false';
    },
    drawElement(el, x, y, { rotate = 0, scale: s = 1 } = {}) {
      if (native) {
        const ctx = ctx2d as Drawable2DContext;
        ctx.save();
        ctx.translate(x * scale, y * scale);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.scale(s, s);
        try {
          ctx.drawElementImage(el, 0, 0);
        } finally {
          ctx.restore();
        }
        return;
      }
      if (!el.hasAttribute('drawable')) {
        throw simulatedException('The element is not drawable. Add the drawable attribute.');
      }
      el.dataset.drawn = 'true';
      el.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${s})`;
    },
    destroy() {
      cancelAnimationFrame(simFrame);
      cleanups.forEach((cleanup) => cleanup());
      handlers.clear();
      root.remove();
    },
  };
}

/**
 * The exception a simulated draw throws. The explainer only says "an
 * exception is thrown" (README.md, 4. drawElementImage) and never names its
 * type, so the simulation doesn't invent one. Native mode shows the real one.
 */
export function simulatedException(message: string): Error {
  const error = new Error(message);
  error.name = 'Exception (simulated)';
  return error;
}

/** Pretty-print an exception the way a console would. */
export function describeError(error: unknown): string {
  if (error instanceof DOMException) return `${error.name}: ${error.message}`;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
