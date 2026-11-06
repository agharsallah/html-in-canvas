/**
 * X-ray: see the DOM inside the darkroom.
 *
 * Every print, the back of a print and the hero card are drawable HTML. X-ray
 * outlines their elements with CSS and labels them with their tags. Nothing
 * else is needed to show them in 3D: the CSS change makes the browser fire
 * `paint` with those elements in `changedElements`, and the new snapshots are
 * uploaded to WebGL. A tooltip follows the pointer and names the element the
 * browser hit, in that element's own pixels, through the 3D transform.
 */
import type { Capabilities } from '../core/capabilities';
import { glyph } from './components/glyphs';
import { append, h } from './dom';

const TAGGED = 'figure, h1, h2, .print-title, ul, ol, dl, button, input, footer, header';

export function mountXray(root: HTMLElement, caps: Capabilities): void {
  const native = caps.mode === 'native';
  const button = h('button', {
    class: 'hud-album hud-xray', type: 'button', 'aria-pressed': 'false',
    title: 'X-ray: outline the real HTML inside the canvas (X)',
  }, glyph('xray', 18), 'X-ray');
  // Beside the other darkroom controls, before the Album.
  root.querySelector('.hud-status > button.hud-album')?.before(button);

  const tip = h('div', { class: 'xray-tip', hidden: true, 'aria-hidden': 'true' });
  const legend = h('aside', { class: 'xray-legend', hidden: true, 'aria-live': 'polite' },
    h('p', { class: 'xray-legend-title' }, glyph('xray', 18), 'X-ray'),
    h('p', {}, native
      ? 'Every outline is a real DOM element inside the canvas. Turning X-ray on changed their CSS, the canvas fired paint, and the new snapshots went to WebGL.'
      : 'Every outline is a real DOM element. In your browser they are placed with CSS 3D transforms; with HTML-in-Canvas they would be drawn by WebGL.'),
    h('p', {}, 'Point at anything on a print to see what the browser hit.'));
  root.append(tip, legend);

  let on = false;
  const set = (value: boolean) => {
    on = value;
    document.body.dataset.xray = on ? 'on' : 'off';
    button.setAttribute('aria-pressed', String(on));
    legend.hidden = !on;
    if (!on) tip.hidden = true;
    if (on) tagDrawables();
  };

  button.addEventListener('click', () => set(!on));
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'x' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return;
    set(!on);
  });

  window.addEventListener('pointermove', (event) => {
    if (!on) return;
    const target = event.target as Element;
    const host = target.closest<HTMLElement>('[drawable], .print-card, .print-verso, .hero-card');
    if (!host || !(target instanceof HTMLElement)) {
      tip.hidden = true;
      return;
    }
    // Prints re-render as you progress: label anything new.
    if (host.querySelector(`:is(${TAGGED}):not([data-xray-tag])`)) tagDrawables();
    const [x, y] = localPoint(host, target, event);
    tip.replaceChildren();
    append(tip,
      h('code', { class: 'xray-tip-el' }, describe(target)),
      target !== host ? h('span', {}, 'inside ', h('code', {}, describe(host))) : null,
      h('span', {}, `at ${Math.round(x)}, ${Math.round(y)} in its own pixels`),
      h('span', { class: 'xray-tip-how' }, native
        ? 'Hit-tested through a 3D canvasTransform (updateElementGeometry)'
        : 'Hit-tested through CSS 3D transforms (fallback)'));
    tip.hidden = false;
    const flip = event.clientX > innerWidth - 300;
    tip.style.translate = `${event.clientX + (flip ? -16 : 16)}px ${event.clientY + 18}px`;
    tip.classList.toggle('xray-tip-left', flip);
  }, { passive: true });
}

/** Label each interesting element with its tag; give static ones a box for the label. */
function tagDrawables(): void {
  const hosts = document.querySelectorAll<HTMLElement>('.print-card, .print-verso, .hero-card');
  for (const host of hosts) {
    host.dataset.xrayTag = `<${host.localName} drawable>`;
    for (const el of host.querySelectorAll<HTMLElement>(TAGGED)) {
      if (el.dataset.xrayTag) continue;
      el.dataset.xrayTag = `<${el.localName}>`;
      if (getComputedStyle(el).position === 'static') el.dataset.xrayPos = '';
    }
  }
}

function describe(el: Element): string {
  const cls = el.classList[0];
  return `<${el.localName}${cls ? `.${cls}` : ''}>`;
}

/** The pointer in the host's own CSS pixels: offsetX is relative to the target. */
function localPoint(host: HTMLElement, target: HTMLElement, event: PointerEvent): [number, number] {
  let x = event.offsetX;
  let y = event.offsetY;
  let node: Element | null = target;
  while (node && node !== host && node instanceof HTMLElement) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return [x, y];
}
