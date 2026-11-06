/**
 * Roll 03 diorama: the lens grinds the canvas grid. The ratio of canvas
 * grid px to device px follows the story: the docs' blurry 300 × 150 grid
 * (300 / 540), Blur's taunt, the fix at exactly 1, a zoom that knocks it
 * off again, and the observer that puts it back.
 */
import { createLensScene } from '../../scenes/lens-scene';
import type { ChapterModule } from '../shared/chapter';
import { story } from './story';

const WORKED_EXAMPLE = 300 / 540;

/** Canvas grid px per device px after story line `index`. */
export function storyRatio(index: number): number {
  const ids = story.slice(0, index + 1).map((line) => line.concept?.id);
  const line = story[index];
  if (line?.speaker === 'foe' && index < 5) return 0.4;
  if (line?.speaker === 'foe') return 0.8; // "Zoom the page…": the old grid on a new DPR
  if (ids.includes('dpcb-observer')) return 1;
  if (ids.includes('device-pixel-ratio')) return 1 / 1.25;
  if (ids.includes('match-device')) return 1;
  return WORKED_EXAMPLE;
}

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createLensScene(host, roll.process);
  return {
    onLine: (index) => scene.setRatio(storyRatio(index)),
    destroy: () => scene.destroy(),
  };
};
