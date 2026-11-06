/**
 * The booth within the hall: the Chrome docs' nested canvases. An outer
 * drawable canvas draws a wrapper that contains an inner drawable canvas,
 * which draws a badge. Change the badge: the inner canvas paints first,
 * then the outer one draws the wrapper with the fresh inner pixels.
 *
 * Native: two real canvases, two real paint listeners, real order.
 * Simulated: the inner canvas draws a stand-in badge with plain 2D, and the
 * order follows the documented rule (descendants before ancestors).
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { onPaint } from '../../hic/paint';
import { isDrawable2D, isDrawableCanvas, makeDrawableHost } from '../../hic/types';
import { button } from '../../ui/components/button';
import { h } from '../../ui/dom';
import type { BeatContext } from '../shared/chapter';
import { createLabCanvas } from '../shared/lab-canvas';

const COLORS = ['#e0263f', '#1d6fd8', '#1f8a4c'];

export function mountNestedBooth(ctx: BeatContext, onInnerFirst: () => void): { el: HTMLElement; destroy(): void } {
  const outer = createLabCanvas(h('div'), ctx.caps, 'The outer canvas');
  outer.root.classList.add('proj-outer');
  const badge = h('div', { class: 'proj-badge', drawable: true, id: 'nestedElement' }, 'Inner child content');
  const inner = h('canvas', { class: 'proj-inner', id: 'nestedCanvas', 'aria-label': 'The nested canvas' }, badge);
  const wrapper = h('div', { class: 'proj-wrapper', drawable: true, id: 'wrapperElement' },
    h('p', { class: 'proj-wrapper-label' }, 'wrapperElement'), inner);
  outer.adopt(wrapper);

  const innerCtx = inner.getContext('2d')!;
  const native = outer.native;
  if (native) makeDrawableHost(inner);
  let hue = 0;
  let scale = 1;
  let order: string[] | null = null;
  let frame = 0;
  const log = h('ol', { class: 'console', 'aria-live': 'polite', 'aria-label': 'Paint order' });
  const note = (who: 'inner' | 'outer') => {
    frame += 1;
    log.prepend(h('li', {}, who === 'inner' ? `${frame}. nestedCanvas paint: drew nestedElement` : `${frame}. parentCanvas paint: drew wrapperElement`));
    while (log.children.length > 6) log.lastElementChild?.remove();
    if (!order) return;
    order.push(who);
    if (order.length === 2) {
      if (order[0] === 'inner' && order[1] === 'outer') {
        onInnerFirst();
        ctx.say('Inner first, outer second. The parent always composites fresh pixels.');
      }
      order = null;
    }
  };

  const drawInner = () => {
    innerCtx.reset();
    if (native && isDrawable2D(innerCtx)) {
      innerCtx.drawElementImage(badge, 10 * scale, 10 * scale);
    } else {
      // Stand-in for the badge's snapshot: same box, same colour, same text.
      innerCtx.scale(scale, scale);
      innerCtx.fillStyle = COLORS[hue]!;
      innerCtx.beginPath();
      innerCtx.roundRect(10, 10, 200, 44, 8);
      innerCtx.fill();
      innerCtx.fillStyle = '#ffffff';
      innerCtx.font = '600 16px "Atkinson Hyperlegible Next", sans-serif';
      innerCtx.fillText('Inner child content', 24, 38);
    }
    note('inner');
  };

  const cleanups: Array<() => void> = [];
  cleanups.push(observeCanvasSize(inner, (size) => {
    scale = size.scale;
    if (native && isDrawableCanvas(inner)) inner.requestPaint();
    else drawInner();
  }, { maxScale: 3 }));
  if (native) {
    cleanups.push(onPaint(inner, drawInner));
    if (isDrawableCanvas(inner)) inner.requestPaint();
  }

  cleanups.push(outer.onPaint(() => {
    outer.beginFrame();
    outer.drawElement(wrapper, 16, 16);
    note('outer');
  }));

  let simFrame = 0;
  const change = button({ label: 'Hover state: recolour the badge', variant: 'primary', onClick: () => {
    hue = (hue + 1) % COLORS.length;
    badge.style.setProperty('--badge', COLORS[hue]!);
    order = [];
    if (native) return; // the browser fires both paints, in its own order
    cancelAnimationFrame(simFrame);
    simFrame = requestAnimationFrame(() => {
      drawInner();
      outer.simulateChange(wrapper);
    });
  } });

  const el = h('section', { class: 'panel proj-nested', 'aria-label': 'Nested canvases' },
    h('h3', { class: 'panel-title' }, 'The booth within the hall'),
    h('p', { class: 'panel-help' }, 'A drawable canvas inside a drawable wrapper inside this canvas. Each has its own paint listener.'),
    h('div', { class: 'proj-nested-row' }, outer.root, h('div', { class: 'proj-nested-side' }, change, log)));
  outer.requestPaint();

  return {
    el,
    destroy() {
      cancelAnimationFrame(simFrame);
      cleanups.forEach((c) => c());
      outer.destroy();
    },
  };
}
