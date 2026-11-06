/**
 * Roll 04 diorama: the projector re-frames the ticket on every story line:
 * whole, cropped to the stub, outset to catch the glow, stretched, tilted.
 */
import { createProjectorScene, type ProjectorFrame } from '../../scenes/projector-scene';
import type { ChapterModule } from '../shared/chapter';
import { story } from './story';

const WHOLE: ProjectorFrame = { src: { x: 0, y: 0, w: 1, h: 1 }, dest: { x: 0.25, y: 0.2, w: 0.5, h: 0.6 }, rotate: 0 };

/** The framing shown after story line `index`. */
export function storyFrame(index: number): ProjectorFrame {
  const line = story[index];
  if (line?.speaker === 'foe') return { src: { x: 0, y: 0, w: 1, h: 1 }, dest: { x: 0.05, y: 0.45, w: 0.25, h: 0.3 }, rotate: -9 };
  switch (line?.concept?.id) {
    case 'source-dest-units': return { ...WHOLE, dest: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } };
    case 'source-rect': return { ...WHOLE, src: { x: -0.1, y: -0.1, w: 1.2, h: 1.2 }, dest: { x: 0.2, y: 0.1, w: 0.6, h: 0.8 } };
    case 'dest-rect': return { ...WHOLE, dest: { x: 0.03, y: 0.35, w: 0.94, h: 0.3 } };
    case 'ctx-transforms': return { ...WHOLE, dest: { x: 0.3, y: -0.05, w: 0.5, h: 0.6 }, rotate: 15 };
    case 'pie-labels': return { ...WHOLE, dest: { x: 0.55, y: 0.55, w: 0.3, h: 0.3 } };
    case 'nested-canvases': return { src: { x: 0.7, y: 0, w: 0.3, h: 1 }, dest: { x: 0.4, y: 0.1, w: 0.2, h: 0.8 }, rotate: 0 };
    case 'draw-overloads': return { ...WHOLE, src: { x: 0, y: 0, w: 0.7, h: 0.4 }, dest: { x: 0.1, y: 0.25, w: 0.8, h: 0.5 } };
    default: return WHOLE;
  }
}

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createProjectorScene(host, roll.process);
  return {
    onLine: (index) => scene.set(storyFrame(index)),
    destroy: () => scene.destroy(),
  };
};
