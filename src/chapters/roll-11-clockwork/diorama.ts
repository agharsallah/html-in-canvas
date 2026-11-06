/**
 * Roll 11 diorama: the gear train follows the story. It ticks through a
 * whole update, lights Paint and the paint gear, slides the paint gear to
 * Option A's slot, flashes the loops, and jams on the WebGL flush.
 */
import { createClockworkScene, type GearLabel } from '../../scenes/clockwork-scene';
import type { ChapterModule } from '../shared/chapter';
import { STEPS, type OptionId, type StepId } from './rules';
import { story } from './story';

export const GEAR_LABELS: GearLabel[] = STEPS.map((s) => ({
  id: s.id,
  text: s.short,
  sub: s.number ? `step ${s.number}` : s.id === 'paint-event' ? 'new event' : 'unnamed step',
}));

interface Pose {
  option: OptionId;
  active: StepId | 'cycle' | null;
  loop?: boolean;
  jam?: boolean;
}

const BY_CONCEPT: Record<string, Pose> = {
  'clock-update-rendering': { option: 'C', active: 'cycle' },
  'clock-two-paints': { option: 'C', active: 'paint' },
  'clock-option-c': { option: 'C', active: 'paint-event' },
  'clock-option-a': { option: 'A', active: 'paint-event', loop: true },
  'clock-webgl-flush': { option: 'A', active: 'paint-event', jam: true },
  'clock-option-b': { option: 'B', active: 'paint-event', loop: true },
  'clock-resize-first': { option: 'C', active: 'resize' },
  'clock-reverse-order': { option: 'C', active: 'paint-event' },
  'clock-worker-road': { option: 'C', active: 'commit' },
};

/** Pose for story line `index`. Foe lines push toward the rejected options. */
export function poseFor(index: number): Pose {
  const line = story[index];
  if (!line) return { option: 'C', active: null };
  if (line.concept) return BY_CONCEPT[line.concept.id] ?? { option: 'C', active: null };
  if (line.speaker === 'foe') {
    const before = story.slice(0, index).filter((l) => l.speaker === 'foe').length;
    return before === 0 ? { option: 'A', active: 'paint-event' } : { option: 'B', active: 'paint-event' };
  }
  return { option: 'C', active: index === story.length - 1 ? 'cycle' : null };
}

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createClockworkScene(host, GEAR_LABELS, roll.process);
  let timer = 0;
  return {
    onLine(index) {
      clearInterval(timer);
      const pose = poseFor(index);
      scene.setOption(pose.option);
      scene.setJammed(!!pose.jam);
      if (pose.loop) scene.loop();
      if (pose.active === 'cycle') {
        let i = 0;
        const order = STEPS.map((s) => s.id);
        scene.setActive(order[0]!);
        timer = window.setInterval(() => scene.setActive(order[++i % order.length]!), 700);
      } else scene.setActive(pose.active);
    },
    destroy() {
      clearInterval(timer);
      scene.destroy();
    },
  };
};
