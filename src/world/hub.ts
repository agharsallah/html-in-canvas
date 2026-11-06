/**
 * The hub: every roll hangs on the wire as a print. Locked rolls are blank
 * paper with a faint latent image; unlocking develops them.
 */
import { Vector3 } from 'three';
import type { GameStore } from '../game/store';
import { framesDone, isComplete, isUnlocked, type GameState } from '../game/state';
import { ROLLS, type Roll, type RollId } from '../story/rolls';
import { createPrintCard, renderPrintCard, PRINT_CARD_SIZE, type PrintStatus } from '../ui/print-card';
import { CameraRig } from './camera-rig';
import { DarkroomSet, SAFELIGHT, wireY, type WireShape } from './darkroom-set';
import { Print } from './print';
import type { Stage } from './stage';
import type { SurfaceBackend } from './surfaces/surface';
import { bindHubInput, type HubInput } from './hub-input';
import { HeroSpot, TRAY_X } from './hero/hero-spot';

export const SPACING = 2.7;
const PLANE = { width: 1.7, height: (1.7 * PRINT_CARD_SIZE.height) / PRINT_CARD_SIZE.width };

interface Hanging {
  roll: Roll;
  print: Print;
  card: HTMLElement;
  x: number;
}

export interface HubOptions {
  stage: Stage;
  surfaces: SurfaceBackend;
  store: GameStore;
  onEnter(roll: RollId): void;
  onKeyboardReach(): void;
}

export class Hub {
  readonly rig: CameraRig;
  private readonly set: DarkroomSet;
  private readonly hanging: Hanging[] = [];
  private readonly input: HubInput;
  private readonly hero: HeroSpot;
  private wind = 0;

  constructor(options: HubOptions) {
    const { stage, surfaces, store } = options;
    const wire: WireShape = { start: -8, end: (ROLLS.length - 1) * SPACING + 8, height: 2.3, sag: 0.8 };
    this.set = new DarkroomSet(wire);
    stage.scene.add(this.set.root);
    this.rig = new CameraRig(stage.camera, { minX: TRAY_X, maxX: (ROLLS.length - 1) * SPACING });

    ROLLS.forEach((roll, index) => {
      const x = index * SPACING;
      const print = new Print({ plane: PLANE, paper: roll.process.paper, light: SAFELIGHT, seed: index + 1 });
      print.pivot.position.set(x, wireY(wire, x), 0);
      stage.scene.add(print.pivot);
      print.pivot.updateMatrixWorld(true);

      const card = createPrintCard(roll);
      print.bind(surfaces.attach({ element: card, mesh: print.paper, plane: PLANE, elementSize: PRINT_CARD_SIZE }));
      this.hanging.push({ roll, print, card, x });
    });

    this.sync(store.getState(), true);
    store.onChange((state) => this.sync(state, false));
    this.rig.setTarget(this.currentX(store.getState()), true);

    // The developer tray at the start of the line: the opening shot.
    this.hero = new HeroSpot({
      scene: stage.scene,
      surfaces,
      store,
      rig: this.rig,
      storyX: () => this.currentX(store.getState()),
      onBegin: () => {
        const next = nextRollToPlay(store.getState());
        this.hanging.find((h) => h.roll.id === next)?.print.push(1.2);
      },
    });

    this.input = bindHubInput({
      canvas: stage.canvas,
      rig: this.rig,
      cards: this.hanging.map(({ card, print, x, roll }) => ({ card, print, x, roll: roll.id })),
      onEnter: options.onEnter,
      onKeyboardReach: options.onKeyboardReach,
      onWind: (amount) => (this.wind += amount),
    });
  }

  /** World-space centre of a roll's print (for camera fly-ins). */
  printCenter(roll: RollId): Vector3 | null {
    const hanging = this.hanging.find((item) => item.roll.id === roll);
    return hanging ? hanging.print.paper.getWorldPosition(new Vector3()) : null;
  }

  /** Back to the main view: release any fly-in and walk to where the story is. */
  goHome(state: GameState): void {
    this.rig.release();
    this.rig.setTarget(this.currentX(state));
  }

  setActive(active: boolean): void {
    this.input.setEnabled(active);
  }

  update(dt: number, time: number, reducedMotion: boolean): void {
    this.wind *= Math.exp(-dt * 3);
    this.rig.update(dt, reducedMotion);
    this.set.update(dt, reducedMotion, this.rig.focusX);
    this.hero.update(dt, reducedMotion);
    for (const { print } of this.hanging) print.update(dt, time, this.wind, reducedMotion);
  }

  private sync(state: GameState, instant: boolean): void {
    const next = nextRollToPlay(state);
    this.hanging.forEach(({ roll, print, card }, index) => {
      const status = statusOf(state, roll);
      renderPrintCard(card, roll, {
        status,
        frames: framesDone(state, roll.id),
        current: roll.id === next,
        previousTitle: ROLLS[index - 1]?.title,
      });
      print.setDevelopTarget(status === 'locked' ? 0.14 : 1, instant);
    });
  }

  /** Where the story is: the first playable roll not yet complete. */
  private currentX(state: GameState): number {
    const id = nextRollToPlay(state);
    return this.hanging.find(({ roll }) => roll.id === id)?.x ?? 0;
  }
}

function statusOf(state: GameState, roll: Roll): PrintStatus {
  if (!isUnlocked(state, roll.id)) return 'locked';
  return roll.load ? 'open' : 'sealed';
}

function nextRollToPlay(state: GameState): RollId | undefined {
  return ROLLS.find((roll) => roll.load && isUnlocked(state, roll.id) && !isComplete(state, roll.id))?.id;
}
