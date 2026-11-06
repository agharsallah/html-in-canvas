/**
 * Roll 01 diorama: three canvas children adrift in the fog. As the story
 * introduces each rule they get laid out, drawn, and one even throws.
 *
 * The scene follows the story by *concept*, not by line number, so editing
 * or reordering dialogue lines can never desynchronise it.
 */
import { createFogScene } from '../../scenes/fog-scene';
import type { ChapterModule, StoryLine } from '../shared/chapter';
import type { ElementState } from './rules';
import { story } from './story';

export const FOG_CARDS = [
  { tag: '<h3>', sub: 'Roses are red' },
  { tag: '<input>', sub: 'violets are blue' },
  { tag: '<p>', sub: 'Sugar is sweet' },
];

/** Which state each card is in after story line `index`. */
export function storyStates(index: number, lines: readonly StoryLine[] = story): ElementState[] {
  const seen = new Set(lines.slice(0, index + 1).flatMap((l) => (l.concept ? [l.concept.id] : [])));
  const here = lines[index]?.concept?.id;
  if (seen.has('nested')) return ['drawn', 'drawn', 'drawn'];
  if (here === 'draw-throws') return ['drawn', 'error', 'drawn'];
  if (seen.has('draw-basic') || seen.has('draw-throws')) return ['drawn', 'laid-out', 'drawn'];
  // The line that introduces `content` is still in the fog; the next one opts in.
  if (seen.has('content-attr') && here !== 'content-attr') return ['laid-out', 'laid-out', 'laid-out'];
  return ['fog', 'fog', 'fog'];
}

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createFogScene(host, FOG_CARDS, roll.process);
  return {
    onLine: (index) => storyStates(index).forEach((state, i) => scene.setState(i, state)),
    destroy: () => scene.destroy(),
  };
};
