/**
 * The exhibition gallery: every negative in the Album as a foil card.
 *
 * Native mode (WebGL upload available): the gallery's own WebGL canvas gets
 * `content="drawable"`, each HTML card becomes a drawable child, and its
 * snapshot is uploaded with `texElementSubImage2D` (ElementTexture) from the
 * `paint` event, only for cards listed in `changedElements`. The cards are
 * `aria-hidden`: the caption beside the canvas speaks for them.
 * Simulated mode: the same cards drawn with canvas 2D text.
 */
import type { Texture } from 'three';
import type { Capabilities } from '../../core/capabilities';
import type { GameState } from '../../game/state';
import { ElementTexture } from '../../hic/element-texture';
import { onPaint } from '../../hic/paint';
import { isDrawableCanvas, makeDrawableHost } from '../../hic/types';
import { createExhibitionScene } from '../../scenes/exhibition-scene';
import { NEGATIVES, type Negative } from '../../story/negatives';
import type { PrintProcess } from '../../story/rolls';
import { cardElement, cardTexture, faceFor } from './cards';

export interface Gallery {
  readonly native: boolean;
  readonly cards: readonly Negative[];
  readonly collected: ReadonlySet<string>;
  readonly index: number;
  turn(delta: number): number;
  setFoil(on: boolean): void;
  destroy(): void;
}

export function createGallery(host: HTMLElement, caps: Capabilities, process: PrintProcess, state: GameState | undefined): Gallery {
  const collected = new Set(state?.negatives ?? []);
  // Collected cards first, so the gallery opens on your own exhibition.
  const cards = [...NEGATIVES].sort((a, b) => Number(collected.has(b.id)) - Number(collected.has(a.id)));
  const scene = createExhibitionScene(host, {
    count: cards.length,
    label: 'Your exhibition: every negative as a holographic foil card',
    colors: process,
  });
  const textures: Texture[] = [];
  const elementTextures: ElementTexture[] = [];
  const cleanups: Array<() => void> = [];
  let native = false;

  if (caps.webgl) {
    try {
      const canvas = scene.stage.canvas;
      makeDrawableHost(canvas);
      cards.forEach((negative, i) => {
        const el = cardElement(faceFor(negative, collected.has(negative.id)));
        canvas.append(el);
        const tex = new ElementTexture(scene.stage.renderer, el);
        elementTextures.push(tex);
        scene.setTexture(i, tex.texture, collected.has(negative.id));
      });
      cleanups.push(onPaint(canvas, (changed) => {
        let uploaded = false;
        for (const tex of elementTextures) {
          if (tex.needsUpload || changed.includes(tex.element)) uploaded = tex.upload() || uploaded;
        }
        if (uploaded) scene.stage.invalidate();
      }));
      if (isDrawableCanvas(canvas)) canvas.requestPaint();
      native = true;
    } catch {
      native = false;
    }
  }
  if (!native) {
    elementTextures.forEach((t) => t.dispose());
    elementTextures.length = 0;
    cards.forEach((negative, i) => {
      const face = faceFor(negative, collected.has(negative.id));
      const tex = cardTexture(face);
      textures.push(tex);
      scene.setTexture(i, tex, face.developed);
    });
  }

  let index = 0;
  return {
    native,
    cards,
    collected,
    get index() {
      return index;
    },
    turn(delta) {
      index = Math.max(0, Math.min(cards.length - 1, index + delta));
      scene.turnTo(index);
      return index;
    },
    setFoil: (on) => scene.setFoil(on),
    destroy() {
      cleanups.forEach((c) => c());
      elementTextures.forEach((t) => t.dispose());
      textures.forEach((t) => t.dispose());
      scene.destroy();
    },
  };
}
