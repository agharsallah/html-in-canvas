/**
 * Opens and closes chapters in response to routes, choreographing the
 * camera fly-in to the print before the chapter appears.
 */
import type { Capabilities } from '../core/capabilities';
import type { GameStore } from '../game/store';
import { framesDone, FRAMES, isUnlocked, type FrameId } from '../game/state';
import { getRoll, type RollId } from '../story/rolls';
import { mountChapterShell, type ChapterShell } from '../chapters/shared/shell';
import { prefersReducedMotion } from '../ui/dom';
import type { Hub } from '../world/hub';
import { navigate, type Route } from './router';

export interface ChapterControllerOptions {
  root: HTMLElement;
  hub: Hub;
  store: GameStore;
  caps: Capabilities;
  /** The darkroom is visible (hub) or fully covered (chapter open). */
  onWorldVisible(visible: boolean): void;
  /** Leave everything and return to the main darkroom view. */
  onHome(): void;
}

const FLY_IN_MS = 750;

export function createChapterController({ root, hub, store, caps, onWorldVisible, onHome }: ChapterControllerOptions) {
  let open: { roll: RollId; shell: ChapterShell } | null = null;
  let token = 0;

  const close = () => {
    open?.shell.destroy();
    open = null;
    document.body.dataset.view = 'hub';
    onWorldVisible(true);
    hub.rig.release();
    hub.setActive(true);
  };

  const firstUnfinished = (roll: RollId): FrameId =>
    FRAMES.find((frame) => !framesDone(store.getState(), roll).includes(frame)) ?? 'story';

  async function show(route: Route): Promise<void> {
    const current = ++token;
    if (route.name === 'hub') return close();

    const roll = getRoll(route.roll);
    if (!roll?.load || !isUnlocked(store.getState(), roll.id)) {
      navigate({ name: 'hub' });
      return;
    }
    const frame = route.frame ?? firstUnfinished(roll.id);

    if (open?.roll === roll.id) {
      open.shell.showFrame(frame);
      return;
    }
    close();

    hub.setActive(false);
    const center = hub.printCenter(roll.id);
    if (center) hub.rig.focusOn(center);
    document.body.dataset.view = 'entering';

    const [{ default: module }] = await Promise.all([
      roll.load(),
      wait(prefersReducedMotion() ? 0 : FLY_IN_MS),
    ]);
    if (current !== token) return; // the route changed while loading

    document.body.dataset.view = 'chapter';
    onWorldVisible(false);
    open = {
      roll: roll.id,
      shell: mountChapterShell(root, {
        roll,
        module,
        caps,
        store,
        frame,
        onClose: () => navigate({ name: 'hub' }),
        onHome,
        onFrameChange: (next) => navigate({ name: 'roll', roll: roll.id, frame: next }),
      }),
    };
  }

  return { show };
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
