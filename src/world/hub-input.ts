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
  /** Turn a print over (click on its paper, or its Notes button). */
  onTurn(roll: RollId, viaKeyboard: boolean): void;
  /** A print is turned over: the line holds still. */
  isInspecting(): boolean;
  /** Click on the wall while a print is turned over. */
  onCloseInspect(): void;
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
  /** The click that ends a drag must not turn a print over. */
  let dragged = false;
  const controller = new AbortController();
  const { signal } = controller;

  window.addEventListener('keydown', (event) => {
    lastInput = 'keyboard';
    if (!enabled || options.isInspecting()) return;
    const onBody = event.target === document.body;
    if (onBody && event.key === 'ArrowRight') rig.pan(2.7);
    if (onBody && event.key === 'ArrowLeft') rig.pan(-2.7);
  }, { signal });

  window.addEventListener('wheel', (event) => {
    if (!enabled || options.isInspecting()) return;
    rig.pan((Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * 0.006);
  }, { signal, passive: true });

  window.addEventListener('pointerdown', (event) => {
    lastInput = 'pointer';
    dragged = false;
    if (!enabled || options.isInspecting() || (event.target as Element).closest('button, a, input, .hud, .chapter')) return;
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

  window.addEventListener('pointerup', () => {
    dragged = drag?.moved ?? false;
    drag = null;
  }, { signal });

  for (const { card, print, x } of cards) {
    card.addEventListener('pointerenter', () => {
      print.hovered = true;
      print.push(0.25);
    }, { signal });
    // The safelight loupe follows the pointer in the print's own pixels.
    card.addEventListener('pointermove', (event) => {
      const [px, py] = cardPoint(card, event);
      print.peek(px / card.offsetWidth, 1 - py / card.offsetHeight);
    }, { signal });
    card.addEventListener('pointerleave', () => (print.hovered = false), { signal });
    card.addEventListener('focusin', () => {
      rig.setTarget(x);
      print.push(0.4);
      if (lastInput === 'keyboard') options.onKeyboardReach();
    }, { signal });
  }

  // Delegated: the buttons live inside the canvas (native) or the CSS3D
  // layer (fallback). Either way these are real button clicks.
  document.addEventListener('click', (event) => {
    if (!enabled) return;
    const target = event.target as Element;
    const enter = target.closest<HTMLElement>('[data-enter]');
    if (enter) return options.onEnter(enter.dataset.enter as RollId);
    if (dragged) return;
    const keyboard = event.detail === 0; // a click from Enter or Space
    const turn = target.closest<HTMLElement>('[data-turn]');
    if (turn) return options.onTurn(turn.dataset.turn as RollId, keyboard);
    if (target.closest('.print-verso, .hud, .chapter, dialog, .hero-card, .xray-tip')) return;
    const card = target.closest<HTMLElement>('.print-card');
    if (card) return options.onTurn(card.dataset.roll as RollId, false);
    if (options.isInspecting()) options.onCloseInspect();
  }, { signal });

  return {
    setEnabled(value) {
      enabled = value;
      drag = null;
    },
    dispose: () => controller.abort(),
  };
}

/**
 * Pointer position in the card's own CSS pixels. `offsetX` is relative to
 * the event target, so walk up to the card. In native mode the browser has
 * already inverted the 3D transform: these are the element's own pixels.
 */
function cardPoint(card: HTMLElement, event: PointerEvent): [number, number] {
  let x = event.offsetX;
  let y = event.offsetY;
  let node: Element | null = event.target as Element;
  while (node && node !== card && node instanceof HTMLElement) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return [x, y];
}
