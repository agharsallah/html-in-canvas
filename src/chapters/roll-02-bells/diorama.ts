/**
 * Roll 02 diorama: the bronze bell rings on every story line. The
 * requestPaint() line rings in the second colour: a paint with no change.
 */
import { createBellScene } from '../../scenes/bell-scene';
import type { ChapterModule } from '../shared/chapter';
import { story } from './story';

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createBellScene(host, roll.process);
  return {
    onLine: (index) => scene.ring(story[index]?.concept?.id === 'request-paint' ? 'request' : 'change'),
    destroy: () => scene.destroy(),
  };
};
