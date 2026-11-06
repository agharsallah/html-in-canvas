/**
 * The "Hello from the DOM!" card from the Chrome docs' blurry-vs-crisp
 * figure. It exists twice: as a real drawable element (native mode), and as
 * a canvas-text stand-in with the same box, used by the simulation and by
 * the loupe's reference rendering.
 */
import { h } from '../../ui/dom';
import type { Size } from './rules';

/** The card's border box in CSS px (it is box-sizing: border-box). */
export const CARD: Size = { width: 240, height: 92 };
export const CARD_TITLE = 'Hello from the DOM!';
export const CARD_BODY = ['This card is HTML drawn', 'into a canvas.'];

export function createCardElement(): HTMLElement {
  return h('div', { class: 'lens-card', drawable: true, id: 'card' },
    h('strong', { class: 'lens-card-title' }, CARD_TITLE),
    h('span', { class: 'lens-card-body' }, CARD_BODY[0]!, h('br'), CARD_BODY[1]!));
}

export interface CardColors {
  paper: string;
  ink: string;
  accent: string;
}

/**
 * Draw the stand-in card at (x, y) canvas px, scaled by (sx, sy) canvas px
 * per CSS px. Mirrors `.lens-card` in lens.css.
 */
export function drawCardMock(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, colors: CardColors): void {
  ctx.save();
  ctx.setTransform(sx, 0, 0, sy, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD.width, CARD.height);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, 6, CARD.height);
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.75, 0.75, CARD.width - 1.5, CARD.height - 1.5);
  ctx.fillStyle = colors.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 17px "Bodoni Moda", serif';
  ctx.fillText(CARD_TITLE, 24, 30);
  ctx.font = '400 14px "Atkinson Hyperlegible Next", sans-serif';
  CARD_BODY.forEach((line, i) => ctx.fillText(line, 24, 51 + i * 18));
  ctx.restore();
}

/** Where the card's top-left sits when centred in a canvas of `css` size (CSS px). */
export function cardOrigin(css: Size): { x: number; y: number } {
  return { x: (css.width - CARD.width) / 2, y: (css.height - CARD.height) / 2 };
}
