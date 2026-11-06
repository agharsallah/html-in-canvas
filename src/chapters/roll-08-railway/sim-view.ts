/**
 * Simulated mode's two platforms: the main thread's real form (type into
 * it) and a stand-in for the worker's canvas. The stand-in redraws the text
 * the form held *when its image was captured*, so a slow worker visibly
 * shows old snapshots. It is plain 2D canvas text, labelled as simulated.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { h } from '../../ui/dom';

export interface SimPlatforms {
  readonly main: HTMLElement;
  readonly worker: HTMLElement;
  /** Remember what the form looked like for image `id`. */
  capture(id: number): void;
  /** Draw image `id` on the stand-in worker canvas. */
  draw(id: number, late: boolean): void;
  forget(id: number): void;
  destroy(): void;
}

export function createSimPlatforms(): SimPlatforms {
  const input = h('input', { id: 'rail-sim-name', class: 'ui-field', value: 'Caret', autocomplete: 'off' });
  const form = h('form', { class: 'rail-form', id: 'rail-form' }, h('label', { for: 'rail-sim-name' }, 'name: '), input);
  form.addEventListener('submit', (event) => event.preventDefault());
  const main = h('div', { class: 'rail-platform', 'data-side': 'main' },
    h('p', { class: 'rail-platform-name' }, 'Main thread: the live form'), form,
    h('p', { class: 'panel-help' }, 'Type here. Each capture records what the form looks like right now.'));

  const canvas = h('canvas', { class: 'rail-sim-canvas', role: 'img', 'aria-label': 'Simulated worker canvas' });
  const worker = h('div', { class: 'rail-platform', 'data-side': 'worker' },
    h('p', { class: 'rail-platform-name' }, 'Worker: its OffscreenCanvas'), canvas,
    h('p', { class: 'lab-sim-note rail-sim-note' }, 'Simulated: redraws the text captured with each image'));

  const snapshots = new Map<number, string>();
  const ctx = canvas.getContext('2d')!;
  let scale = 1;
  let shown = { id: 0, text: '', late: false };

  const paint = () => {
    const { width, height } = canvas;
    const ink = getComputedStyle(canvas).color || '#202124';
    ctx.reset();
    ctx.fillStyle = '#fbfbf7';
    ctx.fillRect(0, 0, width, height);
    if (!shown.id) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = ink;
    ctx.font = '16px "Atkinson Hyperlegible Next", sans-serif';
    ctx.fillText('name:', 16, 34);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(70, 16, 150, 28);
    ctx.fillText(shown.text.slice(0, 18), 78, 35);
    ctx.font = '12px "Atkinson Hyperlegible Mono", monospace';
    ctx.fillStyle = shown.late ? '#b8284a' : '#2f8f6b';
    ctx.fillText(`img #${shown.id}${shown.late ? ' · late' : ''}`, 16, 66);
  };

  const stopSize = observeCanvasSize(canvas, (size) => {
    scale = size.scale;
    paint();
  }, { maxScale: 2 });

  return {
    main,
    worker,
    capture: (id) => snapshots.set(id, input.value),
    draw(id, late) {
      shown = { id, text: snapshots.get(id) ?? '', late };
      snapshots.delete(id);
      for (const key of snapshots.keys()) if (key < id - 600) snapshots.delete(key);
      paint();
    },
    forget: (id) => snapshots.delete(id),
    destroy() {
      stopSize();
      main.remove();
      worker.remove();
    },
  };
}
