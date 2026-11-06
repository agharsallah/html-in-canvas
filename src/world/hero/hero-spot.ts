/**
 * The hero spot: the developer tray at the start of the wire, and the
 * opening shot of the site.
 *
 * First visit: the camera starts high above the tray and settles while the
 * hero card develops out of blank paper, drips rippling the chemistry.
 * Returning visit: the card is already developed and greets you by name;
 * the camera starts where your story is, and the tray is one step left.
 *
 * The tray is a stop on the camera track: walk left past the first print and
 * the camera tips down into the tray view; walk right and it rises back.
 */
import { Vector3, type Scene } from 'three';
import type { GameStore } from '../../game/store';
import { createHeroCard, HERO_CARD_SIZE } from '../../ui/hero-card';
import { prefersReducedMotion } from '../../ui/dom';
import type { CameraRig } from '../camera-rig';
import type { SurfaceBackend } from '../surfaces/surface';
import { DeveloperTray } from './developer-tray';

export const TRAY_X = -6.6;
const TRAY_POSITION = new Vector3(TRAY_X, -1.35, 1.9);
const VIEW = new Vector3(TRAY_X, 3.4, 4.9);
const LOOK = new Vector3(TRAY_X, -1.3, 1.75);
const INTRO_FROM = new Vector3(TRAY_X - 0.6, 8.5, 6.5);
/** The camera counts as "at the tray" left of this x. */
const TRAY_ZONE = TRAY_X + 1.6;

export interface HeroSpotOptions {
  scene: Scene;
  surfaces: SurfaceBackend;
  store: GameStore;
  rig: CameraRig;
  /** Where the story continues (x on the wire). */
  storyX(): number;
  /** Called when Begin sends the camera to the line. */
  onBegin(): void;
}

export class HeroSpot {
  private readonly tray: DeveloperTray;
  private readonly card: ReturnType<typeof createHeroCard>;
  private lineHint = '';
  private atTray = false;

  constructor(private readonly o: HeroSpotOptions) {
    this.card = createHeroCard(o.surfaces.mode === 'native');
    const state = o.store.getState();
    const returning = Object.keys(state.frames).length > 0 || state.unlockAll;

    this.tray = new DeveloperTray({
      surfaces: o.surfaces,
      element: this.card.el,
      elementSize: HERO_CARD_SIZE,
      colors: { paper: '#eef0ec', tint: '#2ee6c0', glint: '#ffb48a' },
    });
    this.tray.root.position.copy(TRAY_POSITION);
    o.scene.add(this.tray.root);
    this.tray.root.updateMatrixWorld(true);

    this.card.input.value = state.name;
    this.card.setReturning(state.name, returning);
    let nameTimer = 0;
    this.card.input.addEventListener('input', () => {
      clearTimeout(nameTimer);
      nameTimer = window.setTimeout(() => o.store.dispatch({ type: 'set-name', name: this.card.input.value }), 400);
    });
    this.card.el.addEventListener('focusin', () => o.rig.setTarget(TRAY_X));
    this.card.el.addEventListener('click', (event) => {
      if (!(event.target as Element).closest('[data-hero="begin"]')) return;
      this.tray.ripple(0.72, 0.18, 2.4);
      o.rig.setTarget(o.storyX());
      o.onBegin();
    });

    if (returning) {
      this.tray.setDeveloped();
    } else {
      // The opening shot: start high, settle over the tray as the print develops.
      o.rig.setTarget(TRAY_X, true);
      if (!prefersReducedMotion()) o.rig.jump(INTRO_FROM, LOOK);
      this.tray.developFromBlank();
      this.tray.ripple(0.5, 0.5, 2);
    }
  }

  update(dt: number, reducedMotion: boolean): void {
    const atTray = this.o.rig.trackX < TRAY_ZONE;
    // While a print is turned over the inspector owns the hint; catch up after.
    if (atTray !== this.atTray && !document.body.dataset.inspect) {
      this.atTray = atTray;
      this.o.rig.setAnchor(atTray ? VIEW : null, LOOK);
      document.body.dataset.spot = atTray ? 'tray' : 'line';
      // The hint under the scene says what you can do here.
      const hint = document.querySelector<HTMLElement>('.hud-hint');
      if (hint) {
        this.lineHint ||= hint.textContent ?? '';
        hint.textContent = atTray
          ? 'Stir the liquid, sign the paper, press X to see its HTML, or scroll to walk the line.'
          : this.lineHint;
      }
    }
    this.tray.update(dt, reducedMotion);
  }

  destroy(): void {
    this.card.destroy();
  }
}
