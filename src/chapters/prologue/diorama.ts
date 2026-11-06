/**
 * Prologue diorama: the Smudge's pixel cloud comes into focus as Caret
 * explains HTML-in-Canvas, ending as a crisp sheet of letters.
 */
import { createSmudgeScene } from '../../scenes/smudge-scene';
import type { ChapterModule } from '../shared/chapter';

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createSmudgeScene(host, roll.process);
  return {
    // Chaos for the first lines; focus arrives once HTML-in-Canvas is named.
    onLine: (index, total) => scene.setClarity(index < 4 ? index * 0.04 : (index - 3) / (total - 4)),
    destroy: () => scene.destroy(),
  };
};
