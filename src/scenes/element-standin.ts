/**
 * Element stand-in: the simulation's replacement for a real snapshot.
 *
 * Without HTML-in-Canvas a page cannot rasterise its own DOM, so simulated
 * labs paint a faithful sketch instead: the element's real layout (each
 * marked part's border box, measured live), its computed colours and fonts,
 * current field values and focus. Mark parts with `data-standin`:
 *
 *   text   — the element's text in its computed font and colour
 *   field  — a text input: box, border, value, caret when focused
 *   button — a filled, rounded box with centred text
 *   range  — an <input type=range>: track and thumb at its value
 *
 * The root itself paints its background and border.
 */
import { CanvasTexture, SRGBColorSpace } from 'three';

export interface StandIn {
  readonly canvas: HTMLCanvasElement;
  readonly texture: CanvasTexture;
  /** Repaint from the element's current state. Returns bytes in the bitmap. */
  paint(): number;
  dispose(): void;
}

export function createStandIn(root: HTMLElement, scale = Math.min(2, devicePixelRatio || 1)): StandIn {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  return {
    canvas,
    texture,
    paint() {
      const width = Math.max(1, root.offsetWidth);
      const height = Math.max(1, root.offsetHeight);
      const w = Math.ceil(width * scale);
      const h = Math.ceil(height * scale);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      paintElement(ctx, root, width, height);
      texture.needsUpdate = true;
      return w * h * 4;
    },
    dispose() {
      texture.dispose();
    },
  };
}

function paintElement(ctx: CanvasRenderingContext2D, root: HTMLElement, width: number, height: number): void {
  const rootStyle = getComputedStyle(root);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = rootStyle.backgroundColor;
  roundRect(ctx, 0, 0, width, height, parseFloat(rootStyle.borderTopLeftRadius) || 0);
  ctx.fill();
  const border = parseFloat(rootStyle.borderTopWidth) || 0;
  if (border) {
    ctx.strokeStyle = rootStyle.borderTopColor;
    ctx.lineWidth = border;
    ctx.stroke();
  }

  const origin = root.getBoundingClientRect();
  const sx = width / Math.max(1, origin.width);
  const sy = height / Math.max(1, origin.height);
  for (const el of root.querySelectorAll<HTMLElement>('[data-standin]')) {
    const r = el.getBoundingClientRect();
    const x = (r.left - origin.left) * sx;
    const y = (r.top - origin.top) * sy;
    const w = r.width * sx;
    const h = r.height * sy;
    const style = getComputedStyle(el);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.textBaseline = 'middle';
    const radius = parseFloat(style.borderTopLeftRadius) || 0;
    switch (el.dataset.standin) {
      case 'text':
        ctx.fillStyle = style.color;
        ctx.textAlign = 'left';
        ctx.fillText(el.textContent?.trim() ?? '', x, y + h / 2, w + 40);
        break;
      case 'field': {
        const input = el as HTMLInputElement;
        ctx.fillStyle = style.backgroundColor;
        roundRect(ctx, x, y, w, h, radius);
        ctx.fill();
        const focused = document.activeElement === el;
        ctx.strokeStyle = focused ? style.outlineColor || style.color : style.borderTopColor;
        ctx.lineWidth = focused ? 3 : parseFloat(style.borderTopWidth) || 1;
        ctx.stroke();
        ctx.fillStyle = style.color;
        ctx.textAlign = 'left';
        const pad = parseFloat(style.paddingLeft) || 6;
        ctx.fillText(input.value, x + pad, y + h / 2, w - pad * 2);
        if (focused) {
          const caretX = Math.min(x + w - pad, x + pad + ctx.measureText(input.value).width + 1);
          ctx.fillRect(caretX, y + h * 0.22, 1.5, h * 0.56);
        }
        break;
      }
      case 'button':
        ctx.fillStyle = style.backgroundColor;
        roundRect(ctx, x, y, w, h, radius);
        ctx.fill();
        if (document.activeElement === el || parseFloat(style.borderTopWidth) > 0) {
          const focused = document.activeElement === el;
          ctx.strokeStyle = focused ? style.outlineColor || style.color : style.borderTopColor;
          ctx.lineWidth = focused ? 3 : parseFloat(style.borderTopWidth);
          ctx.stroke();
        }
        ctx.fillStyle = style.color;
        ctx.textAlign = 'center';
        ctx.fillText(el.textContent?.trim() ?? '', x + w / 2, y + h / 2, w);
        break;
      case 'range': {
        const input = el as HTMLInputElement;
        const t = (Number(input.value) - Number(input.min || 0)) / Math.max(1, Number(input.max || 100) - Number(input.min || 0));
        ctx.fillStyle = style.backgroundColor;
        roundRect(ctx, x, y + h / 2 - 3, w, 6, 3);
        ctx.fill();
        ctx.fillStyle = style.color;
        roundRect(ctx, x, y + h / 2 - 3, w * t, 6, 3);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + w * t, y + h / 2, Math.min(10, h / 2), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}
