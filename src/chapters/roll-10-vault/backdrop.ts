/**
 * Redacted photocopy: faint typed lines, toner grain, and black bars that
 * redact some lines as the photocopier's light bar sweeps past.
 *
 * Performance: one 2D canvas at CSS-pixel resolution, 12 fps. The grain is
 * a pre-rendered pattern tile, so a frame is a few dozen rects.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

const SWEEP_MS = 9000;
const LINE_GAP = 34;

interface Line { x: number; w: number; secret: boolean }

function grainTile(): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 96;
  const g = tile.getContext('2d')!;
  for (let i = 0; i < 520; i++) {
    g.fillStyle = `rgba(18,18,18,${(Math.random() * 0.22).toFixed(3)})`;
    g.fillRect(Math.random() * 96, Math.random() * 96, 1 + Math.random(), 1 + Math.random());
  }
  return tile;
}

export function vaultBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'vault-backdrop';
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const style = getComputedStyle(host);
  const ink = style.getPropertyValue('--ink').trim() || '#121212';
  const glow = style.getPropertyValue('--glow').trim() || '#e9ff70';
  const reduced = prefersReducedMotion();
  const pattern = ctx.createPattern(grainTile(), 'repeat');
  let lines: Line[] = [];
  const start = performance.now();

  const layout = (width: number, height: number) => {
    lines = Array.from({ length: Math.ceil(height / LINE_GAP) }, (_, i) => {
      const x = 24 + ((i * 53) % 90);
      return { x, w: Math.min(width - x - 24, width * (0.35 + ((i * 37) % 50) / 100)), secret: i % 3 === 1 || i % 7 === 4 };
    });
  };

  const draw = (now: number) => {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const sweep = reduced ? height * 2 : (((now - start) % SWEEP_MS) / SWEEP_MS) * (height + 200) - 100;
    lines.forEach((line, i) => {
      const y = 40 + i * LINE_GAP;
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = ink;
      ctx.fillRect(line.x, y, line.w, 3);
      ctx.fillRect(line.x, y + 8, line.w * 0.7, 3);
      if (line.secret) {
        // Bars grow once the light bar has passed their line.
        const grown = reduced ? 1 : Math.max(0, Math.min(1, (sweep - y) / 120));
        ctx.globalAlpha = 0.11;
        ctx.fillRect(line.x - 4, y - 5, (line.w + 8) * grown, 20);
      }
    });
    if (!reduced) {
      const band = ctx.createLinearGradient(0, sweep - 60, 0, sweep + 60);
      band.addColorStop(0, 'transparent');
      band.addColorStop(0.5, glow);
      band.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = band;
      ctx.fillRect(0, sweep - 60, width, 120);
    }
    if (pattern) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.globalAlpha = 1;
  };

  const stopSize = observeCanvasSize(canvas, ({ device }) => {
    layout(device.width, device.height);
    draw(performance.now());
  }, { maxScale: 1 });
  if (reduced) return () => (stopSize(), canvas.remove());
  const stopLoop = throttledLoop(12, draw);
  return () => {
    stopLoop();
    stopSize();
    canvas.remove();
  };
}
