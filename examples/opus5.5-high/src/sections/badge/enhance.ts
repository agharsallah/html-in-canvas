/**
 * Your badge · 2D, exportable.
 *
 *  - Typing your name changes the DOM. The canvas gets a `paint` event on its
 *    own, with no requestPaint or wiring.
 *  - The badge is fitted into the preview with the 5-argument drawElementImage.
 *  - The name is a nested drawable. It's left out of the badge's snapshot and
 *    drawn twice more: an off-register plate (decorative, preserveElementGeometry)
 *    and the real one (its geometry is what assistive tech gets).
 *  - Read-back-allowed rendering: snapshots never carry cross-origin or private
 *    data, and every font and shape here is same-origin, so the canvas is never
 *    tainted and toBlob() exports a PNG.
 */
import { PaintLoop } from '../../hic/loop';
import { observeGrid, type Grid } from '../../hic/sizing';
import { upgradeStage } from '../../hic/stage';
import type { Support } from '../../hic/support';
import { palette } from '../../lib/palette';
import { prefs } from '../../lib/prefs';

export function enhanceBadge(root: HTMLElement, support: Support): void {
  const id = root.id;
  const card = root.querySelector<HTMLElement>('.badge');
  const name = root.querySelector<HTMLElement>('.badge-name');
  const role = root.querySelector<HTMLElement>('.badge-role');
  const nameInput = root.querySelector<HTMLInputElement>(`#${id}-name`);
  const roleSelect = root.querySelector<HTMLSelectElement>(`#${id}-role`);
  const download = root.querySelector<HTMLButtonElement>(`#${id}-download`);
  const note = root.querySelector<HTMLElement>('.badge-note');
  if (!card || !name || !role || !nameInput || !roleSelect || !download || !note) return;
  const fallbackName = name.textContent ?? '';

  // Plain DOM wiring: the same in every browser.
  nameInput.addEventListener('input', () => (name.textContent = nameInput.value.trim() || fallbackName));
  roleSelect.addEventListener('change', () => (role.textContent = roleSelect.value));
  root.querySelectorAll<HTMLInputElement>('input[name="ink"]').forEach((r) =>
    r.addEventListener('change', () => {
      card.className = card.className.replace(/badge--\w+/, `badge--${r.value}`);
    }),
  );

  const stage = root.querySelector<HTMLElement>('[data-stage="badge"]');
  if (!stage || !support.ctx2d) {
    download.disabled = true;
    note.textContent = 'PNG export needs HTML-in-Canvas (Chrome 157+). Everything else works.';
    return;
  }

  const canvas = upgradeStage(stage);
  const ctx = canvas.getContext('2d')!;
  let grid: Grid | null = null;
  observeGrid(canvas, (g) => (grid = g));

  new PaintLoop(canvas, () => {
    if (!grid) return false;
    const { scaleX: s, cssWidth: W, cssHeight: H } = grid;
    const bw = card.offsetWidth, bh = card.offsetHeight;
    const fit = Math.min(1.25, (W * 0.78) / bw, (H * 0.8) / bh);
    const p = palette();
    const tilt = prefs.reducedMotion ? 0 : -0.05;

    ctx.reset();
    ctx.fillStyle = p.css.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // A lanyard from the top edge to the badge's slot.
    const cx = (W / 2) * s, top = (H - bh * fit) / 2 + 8;
    ctx.strokeStyle = p.css.red;
    ctx.lineWidth = 10 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 90 * s, 0);
    ctx.lineTo(cx - 12 * s, (top + 18 * fit) * s);
    ctx.moveTo(cx + 90 * s, 0);
    ctx.lineTo(cx + 12 * s, (top + 18 * fit) * s);
    ctx.stroke();

    ctx.translate(cx, (top + (bh * fit) / 2) * s);
    ctx.rotate(tilt);
    const dw = bw * fit * s, dh = bh * fit * s;
    // Hard shadow.
    ctx.fillStyle = p.css.ink;
    ctx.beginPath();
    ctx.roundRect(-dw / 2 + 12 * s, -dh / 2 + 12 * s, dw, dh, 22 * fit * s);
    ctx.fill();
    // (element, dx, dy, dw, dh): the badge, fitted to the preview.
    ctx.drawElementImage(card, -dw / 2, -dh / 2, dw, dh);

    // The nested name: two plates, slightly off register.
    let nx = 0, ny = 0;
    for (let n: HTMLElement | null = name; n && n !== card; n = n.offsetParent as HTMLElement | null) { nx += n.offsetLeft; ny += n.offsetTop; }
    const x = -dw / 2 + nx * fit * s, y = -dh / 2 + ny * fit * s;
    const w = name.offsetWidth * fit * s, h = name.offsetHeight * fit * s;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = 'hue-rotate(200deg) saturate(1.4)';
    ctx.globalAlpha = 0.8;
    ctx.drawElementImage(name, x + 3.5 * fit * s, y + 2.5 * fit * s, w, h, { preserveElementGeometry: true });
    ctx.restore();
    ctx.drawElementImage(name, x, y, w, h);
    return false;
  });
  prefs.subscribe(() => canvas.requestPaint());

  download.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (!blob) { note.textContent = 'Export failed. Try again?'; return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(nameInput.value.trim() || 'badge').toLowerCase().replace(/\W+/g, '-')}-plaza-badge.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      note.textContent = `Saved ${a.download}`;
    }, 'image/png');
  });
}
