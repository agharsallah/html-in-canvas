/**
 * Passes · crop, clip and un-draw.
 *
 * Both passes sit on the same spot. The divider decides how much of each you
 * see. Each is drawn cropped with the 7-argument drawElementImage
 * (source rect in CSS px, at default size) and { preserveElementGeometry: true },
 * then given its geometry by hand:
 *
 *   - canvasTransform places the card (CSS px)
 *   - canvasClip limits hit testing to the visible half, so the hidden "Buy"
 *     button can't be clicked through the other card
 *   - once a card is fully covered it's un-drawn with clearElementGeometry and
 *     taken offstage (inert + aria-hidden + tabindex=-1, see hic/a11y.ts), so it
 *     leaves the Tab order and the accessibility tree
 *   - getElementTransform reads the placement back to line the slider up
 */
import { setOffstage } from '../../hic/a11y';
import { PaintLoop } from '../../hic/loop';
import { observeGrid, type Grid } from '../../hic/sizing';
import { upgradeStage } from '../../hic/stage';
import type { Support } from '../../hic/support';
import { palette } from '../../lib/palette';
import { prefs } from '../../lib/prefs';

const PAD = 20;
const HIDE_BELOW = 28; // CSS px: narrower than this and a card counts as not drawn

export function enhancePasses(root: HTMLElement, support: Support): void {
  const stage = root.querySelector<HTMLElement>('[data-stage="passes"]');
  const range = root.querySelector<HTMLInputElement>('.pass-split input');
  const wrap = root.querySelector<HTMLElement>('.pass-split');
  if (!stage || !range || !wrap || !support.ctx2d) return;
  const canvas = upgradeStage(stage);
  const ctx = canvas.getContext('2d')!;
  const [a, b] = Array.from(canvas.querySelectorAll<HTMLElement>('.pass')) as [HTMLElement, HTMLElement];
  const names = [a.querySelector('.pass-name')?.textContent ?? 'A', b.querySelector('.pass-name')?.textContent ?? 'B'];
  let grid: Grid | null = null;
  let split = 0.5;
  let shown = 0.5;
  observeGrid(canvas, (g) => (grid = g));

  const setSplit = (v: number) => {
    split = Math.max(0, Math.min(1, v));
    range.value = String(Math.round(split * 100));
    range.setAttribute('aria-valuetext', `${Math.round(split * 100)}% ${names[0]}, ${100 - Math.round(split * 100)}% ${names[1]}`);
    loop.kick();
  };
  range.addEventListener('input', () => setSplit(Number(range.value) / 100));

  // Drag the divider on the canvas itself (but only near the line, so the buttons still work).
  let dragging = false;
  const cardX = () => (grid ? (grid.cssWidth - a.offsetWidth) / 2 : 0);
  canvas.addEventListener('pointerdown', (e) => {
    if (!grid) return;
    const r = canvas.getBoundingClientRect();
    const lineX = cardX() + a.offsetWidth * shown;
    if (Math.abs(e.clientX - r.left - lineX) > 22) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!grid) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    canvas.style.cursor = dragging || Math.abs(x - (cardX() + a.offsetWidth * shown)) <= 22 ? 'ew-resize' : '';
    if (dragging) setSplit((x - cardX()) / a.offsetWidth);
  });
  canvas.addEventListener('pointerup', () => (dragging = false));
  canvas.addEventListener('pointercancel', () => (dragging = false));

  const loop = new PaintLoop(canvas, ({ dt }) => {
    if (!grid) return false;
    const { scaleX: sx, scaleY: sy } = grid;
    // Same height for both cards, and a canvas that fits them (DOM edits: next frame).
    const h = Math.max(a.scrollHeight, b.scrollHeight);
    for (const card of [a, b]) if (card.style.minHeight !== `${h}px`) card.style.minHeight = `${h}px`;
    const want = `${h + PAD * 2}px`;
    if (canvas.style.height !== want) canvas.style.height = want;

    shown += (split - shown) * (prefs.reducedMotion ? 1 : Math.min(1, dt * 16));
    if (Math.abs(split - shown) < 0.001) shown = split;
    const w = a.offsetWidth, hh = a.offsetHeight;
    const x = cardX(), y = PAD;
    const cut = w * shown; // CSS px from the card's left edge
    const p = palette();

    ctx.reset();
    // Hard shadow under the pair.
    ctx.fillStyle = p.css.ink;
    ctx.beginPath();
    ctx.roundRect((x + 10) * sx, (y + 10) * sy, w * sx, hh * sy, 22 * sx);
    ctx.fill();

    const transform = new DOMMatrix().translate(x, y);
    const parts: [HTMLElement, number, number][] = [[a, 0, cut], [b, cut, w - cut]];
    for (const [card, sx0, sw] of parts) {
      if (sw < HIDE_BELOW) {
        // Fully covered: un-draw it. It stays in the DOM, leaves hit testing, and is reported offscreen.
        canvas.clearElementGeometry(card);
        setOffstage(card, true);
        continue;
      }
      setOffstage(card, false);
      // (element, sx, sy, sw, sh, dx, dy): a crop at default size. Source in CSS px, destination in grid px.
      ctx.drawElementImage(card, sx0, 0, sw, hh, (x + sx0) * sx, y * sy, { preserveElementGeometry: true });
      canvas.updateElementGeometry(card, {
        canvasTransform: transform,
        canvasClip: { x: sx0, y: 0, width: sw, height: hh }, // hit testing only for the visible part
      });
    }
    // The divider.
    const lx = (x + cut) * sx;
    ctx.fillStyle = p.css.ink;
    ctx.fillRect(lx - 2.5 * sx, (y - 10) * sy, 5 * sx, (hh + 20) * sy);
    ctx.beginPath();
    ctx.arc(lx, (y + hh / 2) * sy, 22 * sx, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.css.paper;
    ctx.font = `700 ${16 * sx}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↔', lx, (y + hh / 2) * sy);

    // Read the placement back and line the slider up with the drawn card (DOM edit: next frame).
    const placed = canvas.getElementTransform(shown < 0.99 ? b : a);
    const host = wrap.parentElement!;
    const base = canvas.getBoundingClientRect().left - host.getBoundingClientRect().left - parseFloat(getComputedStyle(host).paddingLeft);
    const left = `${Math.round(base + placed.e)}px`, width = `${w}px`;
    if (wrap.style.marginLeft !== left) {
      wrap.style.maxWidth = 'none';
      wrap.style.marginLeft = left;
      wrap.style.width = width;
    }
    return shown !== split;
  });
  prefs.subscribe(() => loop.kick());
}
