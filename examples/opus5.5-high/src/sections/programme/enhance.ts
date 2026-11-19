/**
 * Programme · 2D canvas with a loupe.
 *
 *  - The timetable (an <ol drawable>) is drawn at its natural size with the
 *    3-argument drawElementImage: crisp, and its geometry is set automatically.
 *  - The loupe draws a magnified copy with the 9-argument form and
 *    { preserveElementGeometry: true }, so the copy never moves the real list's
 *    hit-test geometry. Clicks always reach the real rows.
 *  - Inside paint we mark the row under the loupe (data-lensed) and size the
 *    canvas to the list. Both are DOM edits, which land in the next frame.
 */
import { PaintLoop } from '../../hic/loop';
import { observeGrid, type Grid } from '../../hic/sizing';
import { upgradeStage } from '../../hic/stage';
import type { Support } from '../../hic/support';
import { palette } from '../../lib/palette';
import { prefs } from '../../lib/prefs';
import { site, type ProgrammeSection } from '../../site.config';

const PAD = 24; // CSS px around the list
const RADIUS = 86; // loupe radius, CSS px
const ZOOM = 1.7;

export function enhanceProgramme(root: HTMLElement, support: Support): void {
  const config = site.sections.find((s): s is ProgrammeSection => s.type === 'programme' && s.id === root.id);
  wireTabs(root);
  wireCalendar(root, config);
  const stage = root.querySelector<HTMLElement>('[data-stage="programme"]');
  if (!stage || !support.ctx2d) return;

  const canvas = upgradeStage(stage);
  const ctx = canvas.getContext('2d')!;
  let grid: Grid | null = null;
  observeGrid(canvas, (g) => (grid = g));

  // Loupe state, CSS px relative to the canvas.
  const lens = { x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0 };
  /** At rest the loupe parks over the second row's time, so people discover it. */
  const park = () => {
    const list = canvas.querySelector<HTMLElement>('.prog-list:not([hidden])');
    const row = list?.querySelectorAll<HTMLElement>('.sess')[1];
    if (!row) return;
    lens.tx = PAD + 64;
    lens.ty = PAD + row.offsetTop + row.offsetHeight / 2;
    lens.ta = 1;
    if (lens.a === 0) { lens.x = lens.tx; lens.y = lens.ty; }
    loop.kick();
  };
  const show = (x: number, y: number) => {
    lens.tx = x;
    lens.ty = y;
    lens.ta = 1;
    if (lens.a === 0 || prefs.reducedMotion) { lens.x = x; lens.y = y; }
    loop.kick();
  };
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    show(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('pointerleave', () => {
    if (!canvas.contains(document.activeElement)) park();
  });
  // Keyboard: the loupe follows focus.
  canvas.addEventListener('focusin', (e) => {
    const row = (e.target as Element).closest<HTMLElement>('.sess');
    if (!row) return;
    const list = row.parentElement!;
    show(PAD + list.offsetWidth * 0.32, PAD + row.offsetTop + row.offsetHeight / 2);
  });
  canvas.addEventListener('focusout', () => {
    requestAnimationFrame(() => { if (!canvas.contains(document.activeElement)) park(); });
  });

  const loop = new PaintLoop(canvas, ({ dt }) => {
    if (!grid) return false;
    const list = canvas.querySelector<HTMLElement>('.prog-list:not([hidden])');
    if (!list) return false;
    const { scaleX: sx, scaleY: sy } = grid;

    // DOM edit inside paint: the canvas follows the list's height. Applies next frame,
    // then the ResizeObserver resizes the grid and requests another paint.
    const want = `${list.offsetHeight + PAD * 2}px`;
    if (canvas.style.height !== want) canvas.style.height = want;

    const k = prefs.reducedMotion ? 1 : Math.min(1, dt * 14);
    lens.x += (lens.tx - lens.x) * k;
    lens.y += (lens.ty - lens.y) * k;
    lens.a += (lens.ta - lens.a) * Math.min(1, dt * 10);
    if (Math.abs(lens.a - lens.ta) < 0.01) lens.a = lens.ta;

    ctx.reset();
    // (element, dx, dy): natural size, grid px. Geometry follows automatically.
    ctx.drawElementImage(list, PAD * sx, PAD * sy);

    // Which row is under the loupe? Mark it (another DOM edit in paint, next frame).
    const ly = lens.y - PAD;
    const rows = Array.from(list.querySelectorAll<HTMLElement>('.sess'));
    rows.forEach((row, i) => {
      // offsetTop is rounded: use the next row's top as the boundary so there are no 1px gaps.
      const end = rows[i + 1]?.offsetTop ?? row.offsetTop + row.offsetHeight;
      const hit = lens.a > 0.5 && ly >= row.offsetTop && ly < end;
      if (hit !== row.hasAttribute('data-lensed')) row.toggleAttribute('data-lensed', hit);
    });

    if (lens.a > 0.01) {
      const p = palette();
      const r = RADIUS * (0.6 + 0.4 * lens.a);
      const cx = lens.x * sx, cy = lens.y * sy, rr = r * sx;
      // Source rect around the pointer in the list's own CSS px; destination: the loupe, grid px.
      const sw = (2 * r) / ZOOM;
      const srcX = lens.x - PAD - sw / 2, srcY = lens.y - PAD - sw / 2;
      ctx.save();
      ctx.globalAlpha = lens.a;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fillStyle = p.css.paper;
      ctx.fill();
      ctx.clip();
      ctx.drawElementImage(list, srcX, srcY, sw, sw, cx - rr, cy - rr, rr * 2, rr * 2, { preserveElementGeometry: true });
      ctx.restore();
      // The loupe's rim: an ink ring with a red tick, Bauhaus-style.
      ctx.save();
      ctx.globalAlpha = lens.a;
      ctx.lineWidth = 5 * sx;
      ctx.strokeStyle = p.css.ink;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 9 * sx;
      ctx.strokeStyle = p.css.red;
      ctx.beginPath();
      ctx.arc(cx, cy, rr + 7 * sx, -2.4, -1.3);
      ctx.stroke();
      ctx.restore();
    }
    return Math.abs(lens.tx - lens.x) + Math.abs(lens.ty - lens.y) > 0.3 || lens.a !== lens.ta;
  });
  prefs.subscribe(() => loop.kick());
  root.querySelectorAll('[role="tab"]').forEach((t) => t.addEventListener('click', () => requestAnimationFrame(park)));
  requestAnimationFrame(park);
}

/** WAI-ARIA tabs: arrow keys move between days, only the active panel is in the DOM flow. */
function wireTabs(root: HTMLElement): void {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const select = (i: number, focus = false) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      // Hidden panels are out of layout and out of the accessibility tree: nothing stale is left in the canvas.
      document.getElementById(t.getAttribute('aria-controls')!)?.toggleAttribute('hidden', !on);
    });
    if (focus) tabs[i]?.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (to >= 0) { e.preventDefault(); select(to, true); }
    });
  });
}

/** "+ Calendar": builds a real .ics file from site.config. */
function wireCalendar(root: HTMLElement, config: ProgrammeSection | undefined): void {
  root.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('.sess-add');
    if (!btn || !config) return;
    const day = config.days[Number(btn.dataset.day)];
    const s = day?.sessions[Number(btn.dataset.i)];
    if (!day || !s) return;
    const start = `${day.date.replaceAll('-', '')}T${s.time.replace(':', '')}00`;
    const [h, m] = s.time.split(':').map(Number) as [number, number];
    const endMin = h * 60 + m + s.minutes;
    const end = `${day.date.replaceAll('-', '')}T${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}${String(endMin % 60).padStart(2, '0')}00`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kiosk//EN', 'BEGIN:VEVENT',
      `UID:${start}-${s.title.replace(/\W+/g, '-')}@kiosk`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, '')}`,
      `DTSTART;TZID=${site.event.timezone}:${start}`, `DTEND;TZID=${site.event.timezone}:${end}`,
      `SUMMARY:${s.title} (${site.brand.name})`, `LOCATION:${s.room}, ${site.event.city}`, `DESCRIPTION:${s.speaker}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `${s.title.toLowerCase().replace(/\W+/g, '-')}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    btn.textContent = '✓ Added';
  });
}
