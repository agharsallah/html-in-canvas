/**
 * Take content that isn't drawn out of the accessibility tree and the Tab order.
 *
 * The explainer says to hide canvas content you no longer draw with `inert` or
 * `aria-hidden`. Verified in Chrome 157: inside a `content="drawable"` canvas,
 * `inert` is NOT honoured (the subtree stays in the accessibility tree and its
 * links can still take focus), while `aria-hidden` and `hidden` are.
 * So we set all three mechanisms: `inert` (the intent), `aria-hidden`
 * (the accessibility tree), and tabindex=-1 on focusables (the Tab order).
 */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

export function setOffstage(el: HTMLElement, off: boolean): void {
  if (el.inert === off && el.hasAttribute('aria-hidden') === off) return;
  el.inert = off;
  el.toggleAttribute('aria-hidden', off);
  if (off) el.setAttribute('aria-hidden', 'true');
  for (const f of el.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (off) {
      if (!f.hasAttribute('data-tabindex')) f.dataset.tabindex = f.getAttribute('tabindex') ?? '';
      f.tabIndex = -1;
    } else if (f.hasAttribute('data-tabindex')) {
      const prev = f.dataset.tabindex;
      if (prev) f.setAttribute('tabindex', prev);
      else f.removeAttribute('tabindex');
      delete f.dataset.tabindex;
    }
  }
}
