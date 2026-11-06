/**
 * Exhibition cards: one per negative. In native mode the HTML card is a
 * `drawable` child of the gallery's WebGL canvas and its snapshot becomes the
 * texture. Otherwise the same layout is drawn with canvas 2D text, labelled
 * as simulated in the lab.
 */
import { CanvasTexture } from 'three';
import type { Negative } from '../../story/negatives';
import { ROLLS } from '../../story/rolls';
import { h } from '../../ui/dom';

export const CARD_CSS_W = 280;
export const CARD_CSS_H = 400;

const rollTitle = (id: string) => ROLLS.find((r) => r.id === id);

export interface CardFace {
  name: string;
  meta: string;
  text: string;
  code?: string;
  developed: boolean;
}

export function faceFor(negative: Negative, collected: boolean): CardFace {
  const roll = rollTitle(negative.roll);
  const hidden = !collected && negative.rarity === 'secret';
  return {
    name: hidden ? 'Secret' : negative.name,
    meta: `${roll ? `${roll.frame} · ${roll.title}` : negative.roll} · ${negative.rarity}`,
    text: collected ? negative.text : hidden ? 'Found by exploring. Keep looking.' : 'Undeveloped. Finish its frame to develop it.',
    code: collected ? negative.code : undefined,
    developed: collected,
  };
}

/** The HTML card, as drawn by the browser in native mode. */
export function cardElement(face: CardFace): HTMLElement {
  return h('article', { class: 'foil-card', drawable: true, 'aria-hidden': 'true', 'data-developed': String(face.developed) },
    h('p', { class: 'foil-card-meta' }, face.meta),
    h('h3', { class: 'foil-card-name' }, face.name),
    h('p', { class: 'foil-card-text' }, face.text),
    face.code ? h('code', { class: 'foil-card-code' }, face.code) : null);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

/** The simulated twin: the same card laid out by hand in canvas 2D. */
export function cardTexture(face: CardFace, scale = 2): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_CSS_W * scale;
  canvas.height = CARD_CSS_H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = face.developed ? '#f4f2ff' : '#1d1b2c';
  ctx.fillRect(0, 0, CARD_CSS_W, CARD_CSS_H);
  ctx.strokeStyle = face.developed ? '#1b1e2b' : '#7b61ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(9, 9, CARD_CSS_W - 18, CARD_CSS_H - 18);
  const ink = face.developed ? '#1b1e2b' : '#c9c3ff';
  ctx.fillStyle = ink;
  ctx.font = '600 11px "Atkinson Hyperlegible Mono", monospace';
  ctx.fillText(face.meta.toUpperCase(), 24, 40, CARD_CSS_W - 48);
  ctx.font = '700 26px "Bodoni Moda", serif';
  let y = wrap(ctx, face.name, 24, 84, CARD_CSS_W - 48, 30);
  ctx.font = '400 15px "Atkinson Hyperlegible Next", sans-serif';
  y = wrap(ctx, face.text, 24, y + 12, CARD_CSS_W - 48, 21);
  if (face.code) {
    ctx.font = '400 12px "Atkinson Hyperlegible Mono", monospace';
    wrap(ctx, face.code, 24, y + 14, CARD_CSS_W - 48, 17);
  }
  return new CanvasTexture(canvas);
}
