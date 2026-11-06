/**
 * Roll 09 diorama: the lighthouse beam sweeps over five canvas children.
 * Each story line changes who is heard, who has geometry, and where focus is.
 */
import { createLighthouseScene, type BeaconState } from '../../scenes/lighthouse-scene';
import type { ChapterModule } from '../shared/chapter';
import { story } from './story';

export const BEACON_CARDS = [
  { tag: '<h3>', sub: 'Harbour lights' },
  { tag: '<button>', sub: 'Sound the horn' },
  { tag: '<figcaption>', sub: 'A caption' },
  { tag: '<section>', sub: 'Yesterday’s view' },
  { tag: '<input>', sub: 'opacity: 0' },
];

const heard: BeaconState = { announced: true, geometry: 'bounds', tabbable: false };
const silent: BeaconState = { announced: false, geometry: 'bounds', tabbable: false };

/** The five cards' states after the story line with concept `id` (or the foe speaking). */
export function storyBeacons(index: number): BeaconState[] {
  const line = story[index];
  const id = line?.concept?.id;
  const all = (s: BeaconState) => BEACON_CARDS.map(() => ({ ...s }));
  if (index === 0 || (line?.speaker === 'foe' && index < 4)) return all(silent);
  const base = all(heard);
  base[1]!.tabbable = true;
  base[4]!.tabbable = true;
  switch (id) {
    case 'no-geometry': base[2]!.geometry = 'none'; break;
    case 'focus-painted': base[1]!.focused = true; break;
    case 'roles-tabindex': base[1]!.focused = true; break;
    case 'draw-focus': base[4]!.focused = true; break;
    case 'hide-stale': base[3] = { announced: false, geometry: 'stale', tabbable: false }; break;
    case 'invisible-input': base[3] = { announced: false, geometry: 'stale', tabbable: false }; base[4]!.focused = true; break;
    default: break;
  }
  // Silence's threat: an old view hidden with aria-hidden only. Silent, yet Tab lands on it.
  if (line?.speaker === 'foe') base[3] = { announced: false, geometry: 'stale', tabbable: true };
  return base;
}

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createLighthouseScene(host, BEACON_CARDS, roll.process);
  return {
    onLine: (index) => scene.setStates(storyBeacons(index)),
    destroy: () => scene.destroy(),
  };
};
