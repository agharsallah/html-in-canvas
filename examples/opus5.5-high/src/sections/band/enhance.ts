/**
 * Lineup tape · OffscreenCanvas in a worker.
 *
 * The canvas is transferred to a worker. On each `paint`, the main thread
 * captures an ElementImage for every tape that changed (changedElements) and
 * transfers it; the worker draws it over and over as scrolling tape at its own
 * pace. One copy per tape is drawn without preserveElementGeometry, so its
 * geometry follows it and the "Meet the voices" link stays clickable while it
 * moves. Worker geometry arrives in batches: `elementgeometryupdate`.
 */
import { observeGrid } from '../../hic/sizing';
import { upgradeStage } from '../../hic/stage';
import type { Support } from '../../hic/support';
import { palette } from '../../lib/palette';
import { prefs } from '../../lib/prefs';

export function enhanceBand(root: HTMLElement, support: Support): void {
  const stage = root.querySelector<HTMLElement>('[data-stage="band"]');
  const pauseBtn = root.querySelector<HTMLButtonElement>('.band-pause');
  const status = root.querySelector<HTMLElement>('.band-status');
  if (!stage || !support.worker) return;

  const canvas = upgradeStage(stage);
  const tapes = Array.from(canvas.querySelectorAll<HTMLElement>('.tape'));
  const offscreen = canvas.transferControlToOffscreen();
  const worker = new Worker(new URL('../../workers/tape.worker.ts', import.meta.url), { type: 'module' });
  worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);

  const sendColors = () => {
    const p = palette();
    worker.postMessage({ type: 'colors', ink: p.css.ink, paper: p.css.paper });
  };
  sendColors();
  prefs.subscribe(() => {
    sendColors();
    setPaused(userPaused || prefs.reducedMotion);
  });

  // Main-thread side of sizing: the worker owns the bitmap, we only measure.
  observeGrid(canvas, (g) => worker.postMessage({ type: 'size', width: g.width, height: g.height, scale: g.scaleX }), { apply: false });

  canvas.addEventListener('paint', (event) => {
    // The very first paint lists every drawable; later ones only what changed.
    for (const el of event.changedElements) {
      const i = tapes.indexOf(el as HTMLElement);
      if (i < 0) continue;
      const image = canvas.captureElementImage(el);
      // Where the tape's link sits inside it (CSS px), so the worker can give geometry to the right copy.
      const link = el.querySelector<HTMLElement>('a');
      const linkX = link ? link.offsetLeft + link.offsetWidth / 2 : (el as HTMLElement).offsetWidth / 2;
      worker.postMessage({ type: 'image', index: i, image, linkX }, [image]); // transferred: we no longer own it
    }
  });

  let batches = 0;
  canvas.addEventListener('elementgeometryupdate', (event) => {
    batches++;
    if (event.elements.length && root.dataset.ready !== 'true') root.dataset.ready = 'true'; // drawn and clickable
    if (status && batches % 15 === 1) status.textContent = `Drawn off the main thread · ${batches} geometry batches`;
  });

  // Moving targets are hard to hit: pause on hover and focus, and on demand (WCAG 2.2.2).
  let userPaused = prefs.reducedMotion;
  let hover = false;
  const setPaused = (p: boolean) => worker.postMessage({ type: 'pause', paused: p || hover });
  canvas.addEventListener('pointerover', () => { hover = true; setPaused(userPaused); });
  // The copy whose link is nearest the pointer carries the geometry: the link you reach for is the live one.
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    worker.postMessage({ type: 'aim', x: e.clientX - r.left });
  });
  canvas.addEventListener('pointerleave', () => worker.postMessage({ type: 'aim', x: null }));
  canvas.addEventListener('pointerout', () => { hover = false; setPaused(userPaused || prefs.reducedMotion); });
  canvas.addEventListener('focusin', () => { hover = true; setPaused(true); });
  canvas.addEventListener('focusout', () => { hover = false; setPaused(userPaused); });
  const syncBtn = () => {
    if (!pauseBtn) return;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.textContent = userPaused ? 'Play the tape' : 'Pause the tape';
  };
  pauseBtn?.addEventListener('click', () => {
    userPaused = !userPaused;
    syncBtn();
    setPaused(userPaused);
  });
  syncBtn();
  setPaused(userPaused);
  new IntersectionObserver(([e]) => worker.postMessage({ type: 'visible', visible: !!e?.isIntersecting })).observe(canvas);
}
