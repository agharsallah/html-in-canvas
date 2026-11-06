/**
 * Roll 05 diorama: the mirror maze reacts to each story line. The button and
 * its ghost (the hit area) drift apart and back together as the rules of
 * geometry are introduced.
 */
import { createMirrorMazeScene, type MazeMode } from '../../scenes/mirror-maze-scene';
import type { ChapterModule } from '../shared/chapter';
import { story } from './story';

const MODE_BY_CONCEPT: Record<string, MazeMode> = {
  'geometry': 'synced',
  'auto-sync': 'synced',
  'preserve-geometry': 'drift',
  'update-geometry': 'synced',
  'geometry-units': 'units',
  'get-transform': 'synced',
  'hit-order': 'stack',
  'canvas-clip': 'clip',
  'clear-geometry': 'cleared',
  'projective': 'tilt',
  'legacy-transform': 'tilt',
};

/** The scene mode for story line `index`. The foe’s threat shows the drift. */
export function modeForLine(index: number): MazeMode {
  const line = story[index];
  if (!line) return 'intro';
  if (line.speaker === 'foe') return 'drift';
  return line.concept ? MODE_BY_CONCEPT[line.concept.id] ?? 'synced' : index === 0 ? 'intro' : 'synced';
}

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createMirrorMazeScene(host, roll.process);
  return {
    onLine: (index) => scene.setMode(modeForLine(index)),
    destroy: () => scene.destroy(),
  };
};
