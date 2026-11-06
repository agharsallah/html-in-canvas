/**
 * Roll 12 diorama: the endless reel. Every roll of the journey hangs as a
 * holographic foil card; each story line walks the reel forward. The future
 * dulls the foil when it speaks; the auto-updating line makes the bands race,
 * like content replayed on every scroll update.
 */
import { CanvasTexture } from 'three';
import { createExhibitionScene } from '../../scenes/exhibition-scene';
import { ROLLS } from '../../story/rolls';
import type { ChapterModule } from '../shared/chapter';
import { cardTexture } from './cards';
import { story } from './story';

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createExhibitionScene(host, {
    count: ROLLS.length,
    label: 'The endless reel: every roll of the journey as a holographic card',
    colors: roll.process,
    className: 'scene-exhibition scene-reel',
  });
  const textures: CanvasTexture[] = ROLLS.map((r, i) => {
    const tex = cardTexture({ name: r.title, meta: `Roll ${r.frame} · ${r.process.name}`, text: `Foe: ${r.foe}. ${r.logline}`, code: r.concepts.join(' · '), developed: true });
    scene.setTexture(i, tex, true);
    return tex;
  });
  return {
    onLine: (index, total) => {
      const line = story[index];
      scene.turnTo(Math.round((index / Math.max(1, total - 1)) * (ROLLS.length - 1)));
      scene.setFoil(line?.speaker !== 'foe');
      scene.setShimmer(line?.concept?.id === 'epilogue-auto-updating' || line?.concept?.id === 'epilogue-threaded' ? 6 : 1);
    },
    destroy: () => {
      textures.forEach((t) => t.dispose());
      scene.destroy();
    },
  };
};
