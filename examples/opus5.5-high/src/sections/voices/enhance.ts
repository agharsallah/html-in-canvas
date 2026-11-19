/**
 * Voices · WebGPU.
 *
 * Every quote is a <figure drawable>, copied into its own GPUTexture with
 * device.queue.drawElementImageToTexture. Changing quotes runs a shader that
 * wipes from one texture to the other through growing discs.
 *
 * Geometry is manual, as in WebGL. The current quote gets a translate
 * canvasTransform. The others are un-drawn with clearElementGeometry (offscreen
 * for assistive tech) and taken offstage (hic/a11y.ts), so Tab and screen readers only reach the
 * quote you can see.
 *
 * No WebGPU adapter? The same canvas runs a 2D drawElementImage crossfade.
 */
import { setOffstage } from '../../hic/a11y';
import { PaintLoop } from '../../hic/loop';
import { observeGrid, type Grid } from '../../hic/sizing';
import { upgradeStage } from '../../hic/stage';
import type { Support } from '../../hic/support';
import { palette } from '../../lib/palette';
import { prefs } from '../../lib/prefs';
import { createRenderer, type QuoteRenderer } from './gpu';

const OUTSET = 64; // CSS px: the quote mark pokes 0.42em × 9rem above the card, and a 12px shadow

export async function enhanceVoices(root: HTMLElement, support: Support): Promise<void> {
  const stage = root.querySelector<HTMLElement>('[data-stage="voices"]');
  const quotes = Array.from(root.querySelectorAll<HTMLElement>('.quote'));
  const counter = root.querySelector<HTMLElement>('.voices-i');
  let current = 0;
  let previous = 0;
  let progress = 1;

  const setCurrent = (i: number) => {
    previous = current;
    current = (i + quotes.length) % quotes.length;
    progress = prefs.reducedMotion ? 1 : 0;
    quotes.forEach((q, j) => {
      q.classList.toggle('is-current', j === current);
      setOffstage(q, j !== current);
    });
    if (counter) counter.textContent = String(current + 1);
    live?.kick();
  };
  quotes.forEach((q, j) => setOffstage(q, j !== current)); // markup ships inert; add the rest
  root.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((b) =>
    b.addEventListener('click', () => setCurrent(current + Number(b.dataset.dir))),
  );
  root.querySelector('.voices-wrap')?.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (k === 'ArrowRight' || k === 'ArrowLeft') setCurrent(current + (k === 'ArrowRight' ? 1 : -1));
  });

  let live: PaintLoop | null = null;
  if (!stage || !support.html) return;

  const canvas = upgradeStage(stage);
  let gpu: QuoteRenderer | null = null;
  if (support.webgpu) {
    try { gpu = await createRenderer(canvas, quotes.length); } catch (err) { console.warn('[kiosk] WebGPU unavailable, using 2D', err); }
  }
  const ctx = gpu ? null : canvas.getContext('2d');
  if (!gpu && !(ctx && support.ctx2d)) return;
  root.dataset.renderer = gpu ? 'webgpu' : '2d';

  let grid: Grid | null = null;
  let dirty = true;
  observeGrid(canvas, (g) => { grid = g; dirty = true; }, { apply: true });
  const uploaded = new Set<number>();

  /** Where a quote's border box sits, centred, in canvas CSS px. */
  const place = (el: HTMLElement) => {
    const W = grid!.cssWidth, H = grid!.cssHeight;
    return { x: (W - el.offsetWidth) / 2, y: Math.max(OUTSET * 0.8, (H - el.offsetHeight) / 2) };
  };

  live = new PaintLoop(canvas, ({ dt, changed }) => {
    if (!grid) return false;
    // DOM edit in paint (lands next frame): the canvas is as tall as the tallest quote.
    const tallest = Math.max(...quotes.map((q) => q.offsetHeight));
    const want = `${Math.ceil(tallest + OUTSET * 1.6)}px`;
    if (canvas.style.height !== want) canvas.style.height = want;

    if (progress < 1) progress = Math.min(1, progress + dt / 1.1);
    const { scaleX: sx, scaleY: sy } = grid;
    const ease = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;

    if (gpu) {
      quotes.forEach((q, i) => {
        if (dirty || !uploaded.has(i) || changed.includes(q)) { gpu!.upload(i, q, OUTSET, sx); uploaded.add(i); }
      });
      dirty = false;
      const rect = (i: number) => {
        const q = quotes[i]!, p = place(q);
        return [(p.x - OUTSET) * sx, (p.y - OUTSET) * sy, (q.offsetWidth + 2 * OUTSET) * sx, (q.offsetHeight + 2 * OUTSET) * sy];
      };
      const pal = palette();
      gpu.render(previous, current, ease, [rect(previous), rect(current)], 46 * sx, pal.ink);
    } else if (ctx) {
      ctx.reset();
      for (const [i, alpha] of [[previous, 1 - ease], [current, ease]] as const) {
        if (alpha <= 0.001 || (i === previous && progress >= 1)) continue;
        const q = quotes[i]!, p = place(q);
        ctx.globalAlpha = alpha;
        // Decorative outgoing copy must not take geometry; the current quote's is set below.
        ctx.drawElementImage(q, -OUTSET, -OUTSET, q.offsetWidth + 2 * OUTSET, q.offsetHeight + 2 * OUTSET, (p.x - OUTSET) * sx, (p.y - OUTSET) * sy, { preserveElementGeometry: true });
      }
      ctx.globalAlpha = 1;
    }

    // Manual geometry: CSS px.
    quotes.forEach((q, i) => {
      if (i === current) {
        const p = place(q);
        canvas.updateElementGeometry(q, { canvasTransform: new DOMMatrix().translate(p.x, p.y) });
      } else {
        canvas.clearElementGeometry(q);
      }
    });
    return progress < 1;
  });
  prefs.subscribe(() => live?.kick());
}
