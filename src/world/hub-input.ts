/**
 * Hub input: walk the wire with wheel, drag or arrow keys; Tab into prints.
 *
 * Note what is NOT here: no raycasting. In native mode the browser hit-tests
 * the drawable cards itself (thanks to updateElementGeometry), so hover,
 * focus and click are ordinary DOM events on ordinary elements.
 */
import type { RollId } from '../story/rolls';
import type { CameraRig } from './camera-rig';
import type { Print } from './print';

export interface HubCard {
  card: HTMLElement;
  print: Print;
  x: number;
  roll: RollId;
}

export interface HubInputOptions {
  canvas: HTMLCanvasElement;
  rig: CameraRig;
  cards: HubCard[];
  onEnter(roll: RollId): void;
  onKeyboardReach(): void;
  onWind(amount: number): void;
}

export interface HubInput {
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

const DRAG_THRESHOLD = 6;

export function bindHubInput(options: HubInputOptions): HubInput {
  const { rig, cards } = options;
  let enabled = true;
  let lastInput: 'keyboard' | 'pointer' = 'pointer';
  let drag: { startX: number; lastX: number; moved: boolean } | null = null;
  const controller = new AbortController();
  const { signal } = controller;

  window.addEventListener('keydown', (event) => {
    lastInput = 'keyboard';
    if (!enabled) return;
    const onBody = event.target === document.body;
    if (onBody && event.key === 'ArrowRight') rig.pan(2.7);
    if (onBody && event.key === 'ArrowLeft') rig.pan(-2.7);
  }, { signal });

  window.addEventListener('wheel', (event) => {
    if (!enabled) return;
    rig.pan((Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * 0.006);
  }, { signal, passive: true });

  window.addEventListener('pointerdown', (event) => {
    lastInput = 'pointer';
    if (!enabled || (event.target as Element).closest('button, a, input, .hud, .chapter')) return;
    drag = { startX: event.clientX, lastX: event.clientX, moved: false };
  }, { signal });

  window.addEventListener('pointermove', (event) => {
    if (!enabled) return;
    rig.setLean((event.clientX / innerWidth) * 2 - 1, (event.clientY / innerHeight) * 2 - 1);
    options.onWind(event.movementX * 0.0004);
    if (!drag) return;
    const dx = event.clientX - drag.lastX;
    drag.lastX = event.clientX;
    if (Math.abs(event.clientX - drag.startX) > DRAG_THRESHOLD) drag.moved = true;
    if (drag.moved) rig.pan(-dx * 0.012);
  }, { signal });

  window.addEventListener('pointerup', () => (drag = null), { signal });

  for (const { card, print, x } of cards) {
    card.addEventListener('pointerenter', () => {
      print.hovered = true;
      print.push(0.25);
    }, { signal });
    card.addEventListener('pointerleave', () => (print.hovered = false), { signal });
    card.addEventListener('focusin', () => {
      rig.setTarget(x);
      print.push(0.4);
      if (lastInput === 'keyboard') options.onKeyboardReach();
    }, { signal });
  }

  // Delegated: the Enter button lives inside the canvas (native) or the
  // CSS3D layer (fallback). Either way it's a real button click.
  document.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-enter]');
    if (!enabled || !button) return;
    options.onEnter(button.dataset.enter as RollId);
  }, { signal });

  return {
    setEnabled(value) {
      enabled = value;
      drag = null;
    },
    dispose: () => controller.abort(),
  };
}
