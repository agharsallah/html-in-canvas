/**
 * Roll 07 diorama: the crucible pours letters into a mould. Allocation lines
 * show the empty mould, upload lines pour, the Melt's lines sag the letters
 * out of their hit frame, and the colour-only rule makes them burn through
 * colours while staying put.
 */
import { createFoundryScene, type FoundryStage } from '../../scenes/foundry-scene';
import type { ChapterModule } from '../shared/chapter';
import { story } from './story';

const BY_CONCEPT: Record<string, FoundryStage> = {
  'gpu-texture-create': 'mould',
  'colour-only': 'glow',
  'jelly-pattern': 'glow',
  'theme-js': 'glow',
};

export function stageFor(index: number): FoundryStage {
  const line = story[index];
  if (!line || index < 2) return 'idle';
  if (line.speaker === 'foe') return 'melt';
  if (line.speaker === 'narrator') return 'glow';
  return BY_CONCEPT[line.concept?.id ?? ''] ?? 'pour';
}

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createFoundryScene(host, roll.process);
  return {
    onLine: (index) => scene.setStage(stageFor(index)),
    destroy: () => scene.destroy(),
  };
};
