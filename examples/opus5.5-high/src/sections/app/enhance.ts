/**
 * The pocket app · nested canvases.
 *
 * Outer <canvas content="drawable"> → <div class="phone" drawable> → inner
 * <canvas content="drawable"> → <div class="app-ui" drawable>.
 *
 * `paint` fires in reverse tree order: the inner canvas (the screen) paints
 * first, so when the outer canvas draws the phone, its snapshot already has
 * the fresh screen. The clock ticking every second, a star being toggled, or
 * the list scrolling repaint the screen, then the phone, in the same frame.
 * Clicks go through both canvases: outer geometry → inner canvas → inner geometry.
 */
import { PaintLoop } from '../../hic/loop';
import { observeGrid, type Grid } from '../../hic/sizing';
import { upgradeStage } from '../../hic/stage';
import type { Support } from '../../hic/support';
import { palette } from '../../lib/palette';
import { prefs } from '../../lib/prefs';

export function enhanceApp(root: HTMLElement, support: Support): void {
  const ui = root.querySelector<HTMLElement>('.app-ui');
  if (ui) wireApp(ui);
  const outerStage = root.querySelector<HTMLElement>('[data-stage="app-outer"]');
  if (!outerStage || !ui || !support.ctx2d) return;

  const outer = upgradeStage(outerStage);
  const innerStage = outer.querySelector<HTMLElement>('[data-stage="app-inner"]')!;
  const inner = upgradeStage(innerStage);
  const phone = outer.querySelector<HTMLElement>('.phone')!;
  const octx = outer.getContext('2d')!;
  const ictx = inner.getContext('2d')!;

  // ── Inner canvas: the screen, with its own scroll position.
  let igrid: Grid | null = null;
  let scroll = 0;
  observeGrid(inner, (g) => (igrid = g));
  const maxScroll = () => Math.max(0, ui.offsetHeight - (igrid?.cssHeight ?? 0));
  const scrollTo = (y: number) => {
    const next = Math.max(0, Math.min(maxScroll(), y));
    if (next !== scroll) { scroll = next; inner.requestPaint(); }
  };
  inner.addEventListener('wheel', (e) => {
    const before = scroll;
    scrollTo(scroll + e.deltaY);
    if (scroll !== before) e.preventDefault(); // only trap the wheel while the list can still scroll
  }, { passive: false });
  let dragY: number | null = null;
  inner.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') dragY = e.clientY; });
  inner.addEventListener('pointermove', (e) => { if (dragY != null) { scrollTo(scroll - (e.clientY - dragY)); dragY = e.clientY; } });
  inner.addEventListener('pointerup', () => (dragY = null));
  // Keyboard: keep the focused row in view.
  inner.addEventListener('focusin', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.app-item, .app-bar') ?? (e.target as HTMLElement);
    let top = 0;
    for (let n: HTMLElement | null = el; n && n !== ui; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
    const h = igrid?.cssHeight ?? 0;
    if (top < scroll + 8) scrollTo(top - 8);
    else if (top + el.offsetHeight > scroll + h - 8) scrollTo(top + el.offsetHeight - h + 8);
  });
  inner.addEventListener('paint', () => {
    if (!igrid) return;
    ictx.reset();
    // (element, dx, dy): natural size, scrolled. Geometry follows, so hidden rows can't be clicked.
    ictx.drawElementImage(ui, 0, -scroll * igrid.scaleY);
  });

  // ── Outer canvas: the phone, leaning toward the pointer, over a big disc.
  let ogrid: Grid | null = null;
  observeGrid(outer, (g) => (ogrid = g));
  const lean = { a: -0.06, ta: -0.06, y: 0, ty: 0 };
  root.addEventListener('pointermove', (e) => {
    if (prefs.reducedMotion) return;
    const r = outer.getBoundingClientRect();
    lean.ta = -0.06 + ((e.clientX - r.left) / r.width - 0.5) * 0.08;
    lean.ty = ((e.clientY - r.top) / r.height - 0.5) * -14;
    loop.kick();
  });
  const loop = new PaintLoop(outer, ({ dt }) => {
    if (!ogrid) return false;
    const k = prefs.reducedMotion ? 1 : Math.min(1, dt * 5);
    lean.a += (lean.ta - lean.a) * k;
    lean.y += (lean.ty - lean.y) * k;
    const { scaleX: sx, scaleY: sy, cssWidth: W, cssHeight: H } = ogrid;
    const p = palette();
    octx.reset();
    // The disc behind the phone.
    octx.fillStyle = p.css.blue;
    octx.beginPath();
    octx.arc(W * 0.56 * sx, H * 0.46 * sy, Math.min(W, H) * 0.4 * sx, 0, Math.PI * 2);
    octx.fill();
    octx.translate((W / 2) * sx, (H / 2 + lean.y) * sy);
    octx.rotate(lean.a);
    const pw = phone.offsetWidth * sx, ph = phone.offsetHeight * sy;
    // Hard shadow, then the phone at its natural size.
    octx.fillStyle = p.css.ink;
    octx.beginPath();
    octx.roundRect(-pw / 2 + 14 * sx, -ph / 2 + 14 * sy, pw, ph, 52 * sx);
    octx.fill();
    octx.drawElementImage(phone, -pw / 2, -ph / 2);
    return Math.abs(lean.ta - lean.a) + Math.abs(lean.ty - lean.y) > 0.001;
  });
  prefs.subscribe(() => loop.kick());
}

/** The app's own behaviour (works with or without canvas). */
function wireApp(ui: HTMLElement): void {
  const clock = ui.querySelector<HTMLElement>('.app-clock');
  const count = ui.querySelector<HTMLElement>('.app-count');
  const bar = ui.querySelector<HTMLElement>('.app-progress');
  const tick = () => {
    const now = new Date();
    // A text change is all it takes: the inner canvas gets a paint event, then the outer one.
    if (clock) clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    bar?.style.setProperty('--p', `${(now.getSeconds() / 59) * 100}%`);
  };
  tick();
  setInterval(tick, 1000);
  ui.addEventListener('click', (e) => {
    const star = (e.target as Element).closest<HTMLButtonElement>('.app-star');
    if (!star) return;
    star.setAttribute('aria-pressed', String(star.getAttribute('aria-pressed') !== 'true'));
    if (count) count.textContent = String(ui.querySelectorAll('.app-star[aria-pressed="true"]').length);
  });
}
