/**
 * Native probe: in a browser with HTML-in-Canvas, watch the real order of
 * one frame's callbacks. A rAF chain numbers the frames; a ResizeObserver,
 * a `paint` listener and a DOM edit inside `paint` log where they land.
 * This is an observation of this browser, shown next to the model.
 */
import type { Capabilities } from '../../core/capabilities';
import { isDrawable2D, isDrawableCanvas, makeDrawableHost } from '../../hic/types';
import { button } from '../../ui/components/button';
import { h } from '../../ui/dom';
import { describeError } from '../shared/lab-canvas';

export interface Probe {
  readonly el: HTMLElement;
  destroy(): void;
}

export function createProbe(caps: Capabilities, onDone: (lines: string[]) => void): Probe {
  if (!caps.canvas2d) {
    return {
      el: h('p', { class: 'panel-help clock-probe-off' }, 'Native probe: open this lab in Chrome 157+ to log the real order of rAF, ResizeObserver and paint. The clock above is a model either way.'),
      destroy: () => {},
    };
  }
  const log = h('ol', { class: 'console clock-probe-log', 'aria-live': 'polite', 'aria-label': 'Probe log' });
  const stage = h('div', { class: 'clock-probe-stage' });
  let cleanup = () => {};

  const run = () => {
    cleanup();
    log.replaceChildren();
    const lines: string[] = [];
    const write = (text: string) => {
      lines.push(text);
      log.append(h('li', {}, text));
    };
    const canvas = h('canvas', { class: 'clock-probe-canvas', 'aria-label': 'Probe canvas' });
    makeDrawableHost(canvas);
    const chip = h('div', { drawable: true, class: 'clock-probe-chip' }, 'tick');
    canvas.append(chip);
    stage.replaceChildren(canvas);
    const ctx = canvas.getContext('2d');
    if (!isDrawableCanvas(canvas) || !isDrawable2D(ctx)) return;

    let frame = 0;
    let raf = 0;
    let paints = 0;
    const chain = () => {
      frame += 1;
      write(`frame ${frame}: rAF callback`);
      if (frame < 3) raf = requestAnimationFrame(chain);
      else finish();
    };
    const ro = new ResizeObserver(() => write(`frame ${frame}: ResizeObserver callback`));
    const onPaintEvent = (event: Event) => {
      paints += 1;
      const changed = (event as Event & { changedElements?: readonly Element[] }).changedElements?.length ?? 0;
      write(`frame ${frame}: paint (changedElements: ${changed})`);
      try {
        ctx.reset();
        ctx.drawElementImage(chip, 0, 0);
      } catch (error) {
        write(`  drawElementImage threw ${describeError(error)}`);
      }
      if (paints === 1) {
        chip.textContent = 'tock';
        write(`frame ${frame}: DOM edit inside paint`);
      }
    };
    const finish = () => {
      cleanup();
      onDone(lines);
    };
    cleanup = () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('paint', onPaintEvent);
      cleanup = () => {};
    };

    canvas.addEventListener('paint', onPaintEvent);
    raf = requestAnimationFrame(chain);
    ro.observe(canvas);
    canvas.requestPaint();
  };

  const el = h('div', { class: 'clock-probe' },
    h('p', { class: 'panel-help' }, 'Native mode: log one real frame in this browser.'),
    button({ label: 'Probe this browser', variant: 'secondary', size: 'sm', onClick: run }),
    stage, log);
  return { el, destroy: () => cleanup() };
}
