/**
 * Lab readouts: the station board (open, in flight, latency, late trains,
 * geometry events), the last `elementgeometryupdate`, and an event log.
 * The log is flushed at most four times a second: at 60 captures a second,
 * writing every line to the DOM would cost more than the railway itself.
 */
import { h } from '../../ui/dom';
import type { RailStats } from './engine';
import type { RailEvent } from './sim';

export interface LabReadouts {
  readonly el: HTMLElement;
  update(stats: RailStats): void;
  geometry(elements: string[], staleness: number): void;
  log(event: RailEvent): void;
  destroy(): void;
}

const LINES = 6;
const FLUSH_MS = 250;

function describe(event: RailEvent): string | null {
  switch (event.kind) {
    case 'capture': return `main    captureElementImage(form) → img #${event.id}, posted`;
    case 'draw': return `worker  drawElementImage(img #${event.id}) after ${Math.round(event.latency)} ms${event.late ? '  LATE' : ''}`;
    case 'close': return `worker  img #${event.id}.close()${event.skipped ? '  (skipped)' : ''}`;
    case 'drop': return `worker  dropped img #${event.id} without close()`;
    case 'geometry': return `main    elementgeometryupdate  elements: [${(event.elements ?? ['#rail-form']).join(', ')}]`;
    case 'arrive': return null;
  }
}

export function createLabReadouts(): LabReadouts {
  const cell = () => h('dd', {}, '0');
  const cells = { open: cell(), inFlight: cell(), latency: cell(), late: cell(), geometry: cell() };
  const board = h('dl', { class: 'rail-board' },
    h('dt', {}, 'Open images'), cells.open,
    h('dt', {}, 'In flight'), cells.inFlight,
    h('dt', {}, 'Latest latency'), cells.latency,
    h('dt', {}, 'Late trains'), cells.late,
    h('dt', {}, 'Geometry events'), cells.geometry);
  const lastGeometry = h('p', { class: 'panel-help rail-geometry' }, 'No geometry has come home yet.');
  const console = h('ol', { class: 'console rail-log', 'aria-label': 'Railway log' });
  const el = h('div', { class: 'rail-readouts' },
    h('h3', { class: 'panel-title' }, 'Station board'), board, lastGeometry,
    h('h3', { class: 'panel-title' }, 'Log'), console);

  const buffer: string[] = [];
  let timer = 0;
  let geometryShown = 0;
  const flush = () => {
    timer = 0;
    console.replaceChildren(...buffer.slice(-LINES).reverse().map((line) => h('li', { 'data-late': String(line.endsWith('LATE')) }, line)));
    buffer.splice(0, Math.max(0, buffer.length - LINES));
  };

  return {
    el,
    update(stats) {
      cells.open.textContent = String(stats.open);
      cells.inFlight.textContent = String(stats.inFlight);
      cells.latency.textContent = stats.latency === null ? '—' : `${Math.round(stats.latency)} ms`;
      cells.late.textContent = String(stats.late);
      cells.geometry.textContent = String(stats.geometryEvents);
    },
    geometry(elements, staleness) {
      // At most once a second: it is read, not watched.
      const now = performance.now();
      if (now - geometryShown < 1000) return;
      geometryShown = now;
      lastGeometry.textContent = `Last elementgeometryupdate: elements [${elements.join(', ')}], ${Math.round(staleness)} ms after that image was captured.`;
    },
    log(event) {
      const line = describe(event);
      if (!line) return;
      buffer.push(line);
      if (!timer) timer = window.setTimeout(flush, FLUSH_MS);
    },
    destroy: () => clearTimeout(timer),
  };
}
