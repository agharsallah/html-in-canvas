/**
 * The native railway: the explainer's OffscreenCanvas example, running for
 * real. A drawable canvas with a drawable form hands its control to a
 * worker; every Nth `paint` captures the form as an ElementImage and posts
 * it in the transfer list; the worker draws it; `elementgeometryupdate`
 * reports the geometry coming home.
 *
 * Throws during setup if anything is missing, so the lab can fall back to
 * the simulation.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { canCaptureElementImage, isDrawableCanvas, makeDrawableHost, type ElementGeometryUpdateEvent } from '../../hic/types';
import { h } from '../../ui/dom';
import type { RailEngine, RailListener, RailStats } from './engine';
import { LATE_MS, type RailSettings } from './sim';

export interface NativeRailEngine extends RailEngine {
  readonly view: HTMLElement;
  readonly form: HTMLFormElement;
}

const FORM_AT = { x: 16, y: 14 }; // CSS px inside the canvas

export function createNativeEngine(initial: RailSettings, listener: RailListener): NativeRailEngine {
  const canvas = h('canvas', { class: 'rail-native-canvas', 'aria-label': 'Drawn by the worker' });
  makeDrawableHost(canvas);
  const form = h('form', { class: 'rail-form', id: 'rail-form', drawable: true },
    h('label', { for: 'rail-name' }, 'name: '),
    h('input', { id: 'rail-name', class: 'ui-field', value: 'Caret', autocomplete: 'off' }));
  form.addEventListener('submit', (event) => event.preventDefault());
  canvas.append(form);
  const view = h('div', { class: 'rail-native' }, canvas);
  if (!isDrawableCanvas(canvas) || !canCaptureElementImage(canvas)) throw new Error('captureElementImage is not available');

  const worker = new Worker(new URL('./railway-worker.ts', import.meta.url), { type: 'module' });
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({ canvas: offscreen }, [offscreen]);

  let settings = initial;
  const absNow = () => performance.timeOrigin + performance.now();
  const capturedAt = new Map<number, number>();
  const open = new Set<number>();
  const pending = new Set<number>();
  let nextId = 1;
  let frame = 0;
  let lastDrawn = 0;
  let latency: number | null = null;
  /** When the worker module finished loading: images captured before it waited on startup, not on the railway. */
  let readyAt = 0;
  const totals = { late: 0, draws: 0, geometryEvents: 0 };
  const postSettings = () => worker.postMessage({ settings: { delay: settings.workerDelayMs, close: settings.closeImages, skip: settings.skipToNewest } });
  postSettings();

  const onPaint = () => {
    frame += 1;
    if (frame % Math.max(1, settings.captureEvery) === 0) {
      const id = nextId++;
      const formImg = canvas.captureElementImage(form);
      capturedAt.set(id, absNow());
      open.add(id);
      pending.add(id);
      worker.postMessage({ id, form: formImg }, [formImg as unknown as Transferable]);
      listener({ kind: 'capture', id, at: absNow() });
    }
    canvas.requestPaint(); // keep the line running
  };
  canvas.addEventListener('paint', onPaint);

  const onGeometry = (event: Event) => {
    const elements = [...((event as ElementGeometryUpdateEvent).elements ?? [])].map((el) => `#${el.id || el.tagName.toLowerCase()}`);
    totals.geometryEvents += 1;
    listener({ kind: 'geometry', ids: [lastDrawn], at: absNow(), staleness: absNow() - (capturedAt.get(lastDrawn) ?? absNow()), elements });
  };
  canvas.addEventListener('elementgeometryupdate', onGeometry);

  worker.onmessage = (event: MessageEvent) => {
    const data = event.data as { type: string; id: number; at?: number; skipped?: boolean; message?: string };
    const at = data.at ?? absNow();
    if (data.type === 'arrive') listener({ kind: 'arrive', id: data.id, at });
    if (data.type === 'draw') {
      pending.delete(data.id);
      lastDrawn = data.id;
      const captured = capturedAt.get(data.id) ?? at;
      latency = at - captured;
      totals.draws += 1;
      const late = readyAt > 0 && captured >= readyAt && latency > LATE_MS;
      if (!readyAt) readyAt = at;
      if (late) totals.late += 1;
      listener({ kind: 'draw', id: data.id, at, latency, late });
    }
    if (data.type === 'close') {
      open.delete(data.id);
      pending.delete(data.id);
      listener({ kind: 'close', id: data.id, at, skipped: !!data.skipped });
    }
    if (data.type === 'drop') {
      pending.delete(data.id);
      listener({ kind: 'drop', id: data.id, at });
    }
    if (data.type === 'error') console.warn('[railway worker]', data.message);
    // Keep timestamps only for images we may still measure.
    for (const id of capturedAt.keys()) if (id < lastDrawn && !pending.has(id)) capturedAt.delete(id);
  };

  // Size the canvas grid in the worker, as the explainer does, then ask for a paint.
  const stopSize = observeCanvasSize(canvas, ({ device, scale }) => {
    worker.postMessage({ width: device.width, height: device.height, x: FORM_AT.x * scale, y: FORM_AT.y * scale });
    canvas.requestPaint();
  }, { maxScale: 2, applyToCanvas: false });
  canvas.requestPaint();

  return {
    native: true,
    view,
    form,
    set(next) {
      settings = next;
      postSettings();
    },
    sweep: () => worker.postMessage({ sweep: true }),
    stats: (): RailStats => ({ open: open.size, inFlight: pending.size, latency, ...totals }),
    destroy() {
      canvas.removeEventListener('paint', onPaint);
      canvas.removeEventListener('elementgeometryupdate', onGeometry);
      stopSize();
      worker.terminate();
      view.remove();
    },
  };
}
