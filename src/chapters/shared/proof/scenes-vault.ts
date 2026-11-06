/**
 * The vault scene: a dossier drawn into the canvas, then read back. The
 * pixels are safe to read because nothing sensitive was painted: the
 * visited link is drawn as unvisited, spelling marks never appear.
 */
import { h } from '../../../ui/dom';
import type { Scene } from './kit';

const THEMES = [
  { paper: '#f4f4ee', ink: '#121212', mark: '#ff2e63' },
  { paper: '#121212', ink: '#e9ff70', mark: '#5ad1ff' },
];

export const vault: Scene<{ variant: 'readback' | 'theme' | 'export' }> = (kit, { variant }) => {
  const exportButton = h('button', { type: 'button', class: 'proof-button' }, 'Export the print');
  const card = kit.add(h('div', { class: 'proof-card proof-vault' },
    h('p', { class: 'proof-card-title' }, 'Dossier 10'),
    h('p', {}, 'A link you have visited: ', h('a', { href: location.href.split('#')[0] }, 'this page')),
    h('input', { class: 'ui-field', value: 'teh secrit', spellcheck: 'true', 'aria-label': 'A misspelt field' }),
    variant === 'export' ? exportButton : null));
  const swatch = h('span', { class: 'proof-swatch' });
  const thumb = h('img', { class: 'proof-export', alt: 'The exported print', hidden: true });
  kit.lab.root.append(swatch, thumb);
  let pointer: { x: number; y: number } | null = null;
  let theme = 0;

  if (variant === 'theme') {
    const timer = window.setInterval(() => {
      theme = (theme + 1) % THEMES.length;
      const next = THEMES[theme]!;
      card.style.setProperty('--vault-paper', next.paper);
      card.style.setProperty('--vault-ink', next.ink);
      card.style.setProperty('--vault-mark', next.mark);
      kit.lab.simulateChange(card);
    }, 2200);
    kit.onDestroy(() => clearInterval(timer));
  }
  exportButton.addEventListener('click', () => {
    kit.lab.canvas.toBlob((blob) => {
      if (!blob) return;
      const old = thumb.src;
      thumb.src = URL.createObjectURL(blob);
      thumb.hidden = false;
      if (old) URL.revokeObjectURL(old);
      kit.readout(`canvas.toBlob() → a ${(blob.size / 1024).toFixed(1)} kB PNG. No SecurityError: the canvas was never tainted.`);
    }, 'image/png');
  });
  kit.onDestroy(() => thumb.src && URL.revokeObjectURL(thumb.src));
  kit.lab.root.addEventListener('pointermove', (event) => {
    const r = kit.lab.canvas.getBoundingClientRect();
    pointer = { x: event.clientX - r.left, y: event.clientY - r.top };
  });
  kit.lab.root.addEventListener('pointerleave', () => (pointer = null));

  kit.animate(() => {
    const { width, height } = kit.size();
    kit.lab.drawElement(card, (width - card.offsetWidth) / 2, (height - card.offsetHeight) / 2);
    if (variant === 'export') {
      if (thumb.hidden) kit.readout('Press “Export the print”: the canvas becomes a PNG file.');
      return;
    }
    if (variant === 'theme') {
      kit.readout(`Theme ${theme + 1} of ${THEMES.length}: colours come from CSS custom properties, never from system colours.`);
      return;
    }
    if (!pointer) {
      kit.readout('Move the pointer over the canvas: getImageData reads the pixel under it.');
      swatch.hidden = true;
      return;
    }
    const s = kit.lab.scale();
    const [r, g, b] = kit.lab.ctx.getImageData(Math.round(pointer.x * s), Math.round(pointer.y * s), 1, 1).data;
    swatch.hidden = false;
    swatch.style.background = `rgb(${r} ${g} ${b})`;
    swatch.style.translate = `${pointer.x + 14}px ${pointer.y + 14}px`;
    kit.readout(`getImageData(${Math.round(pointer.x)}, ${Math.round(pointer.y)}) → rgb(${r}, ${g}, ${b}). The visited link reads as unvisited, and no squiggle sits under “teh”.`);
  }, 20);
};
