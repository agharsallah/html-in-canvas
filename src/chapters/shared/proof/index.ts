/**
 * "Your code, running": which proof scene acts out each exercise, and the
 * one sentence that ties the scene back to the code the learner wrote.
 */
import { button } from '../../../ui/components/button';
import { h, rich } from '../../../ui/dom';
import { mountScene, type MountedScene, type Scene } from './kit';
import { nested, project, rise } from './scenes-draw';
import { texture, train } from './scenes-gpu';
import { hit, voice } from './scenes-hit';
import { bell, lens } from './scenes-paint';
import { vault } from './scenes-vault';

interface Proof {
  scene: Scene<never>;
  params?: unknown;
  /** What the learner's code does, in the scene's terms. `backticks` = code. */
  says: string;
}

const p = <P>(scene: Scene<P>, params: P, says: string): Proof => ({ scene: scene as Scene<never>, params, says });

export const PROOFS: Record<string, Proof> = {
  'prologue-detect': p(rise, { detect: true }, 'Your check asked this browser the question, and this canvas took the path it answered.'),
  'fog-opt-in': p(rise, {}, 'With `content="drawable"` and a `drawable` child, the canvas can draw real HTML. The field below is live.'),
  'fog-fix-throw': p(rise, {}, 'Every drawn child is marked `drawable`, so nothing throws: the card rises out of the fog.'),
  'fog-nested': p(nested, undefined, 'Drawing the parent leaves a hole where the nested drawable sits. Your second draw fills it.'),
  'bells-handler': p(bell, {}, 'Your handler draws on every `paint`. Each tick of the clock changes the card, and the bell rings.'),
  'bells-loop': p(bell, { loop: true }, 'Calling `requestPaint()` inside `paint` asks for the next one: it rings every frame, with an empty list.'),
  'bells-changed': p(bell, {}, 'Only paints whose `changedElements` lists the card count as real changes. Type in it to ring it.'),
  'bells-coexist': p(bell, {}, 'Two listeners on one canvas both hear every bell: `addEventListener` doesn’t replace the other.'),
  'lens-observer': p(lens, {}, 'Sizing from `devicePixelContentBoxSize` gives one grid pixel per device pixel: the right card.'),
  'lens-center': p(lens, { center: true }, 'Centred by dividing grid size by the scale: the card sits on the cross, whatever the DPR.'),
  'lens-border-box': p(lens, {}, 'Drawn at the size you set, measured in the same unit: no stretch, no blur.'),
  'projector-stub': p(project, { variant: 'crop' }, 'The source rect crops the ticket: the stub tears off and back, live.'),
  'projector-fill': p(project, { variant: 'fill' }, 'A destination rect the size of the canvas stretches the ticket to fill the screen.'),
  'projector-tilt': p(project, { variant: 'tilt' }, 'Translate to the centre, rotate, draw at minus half the size: it turns around its middle.'),
  'mirrors-by-hand': p(hit, {}, 'With geometry synced to where it is drawn, the moving button is still the button you click.'),
  'mirrors-backdrop': p(hit, { wall: true }, 'The wall is drawn first and the button last, so the button sits on top and still hit-tests.'),
  'mirrors-webgl': p(hit, { spin: true }, 'A full transform, turning included, goes to `updateElementGeometry`: catch it mid-turn.'),
  'observatory-allocate': p(texture, { variant: 'spin' }, 'Storage reserved once, then refilled: the plane turns every frame without reallocating.'),
  'observatory-upload': p(texture, { variant: 'spin' }, 'Uploads happen only when `changedElements` lists the card. Watch the counter while it turns.'),
  'observatory-geometry': p(hit, { spin: true }, 'The projected matrix tells the DOM where the face landed, so clicks follow it.'),
  'foundry-texture': p(texture, { variant: 'spin' }, 'The snapshot lands in a texture; the shader turns the plane, the HTML stays the same.'),
  'foundry-draw': p(texture, { variant: 'melt' }, 'Your paint pours the snapshot in. A shader can then ripple and drip it, like this.'),
  'foundry-theme': p(texture, { variant: 'theme' }, 'The colour comes from CSS, read with `getComputedStyle`, and becomes a uniform.'),
  'railway-ship': p(train, undefined, 'Every capture is an `ElementImage`: a frozen snapshot you can send down the line.'),
  'railway-worker': p(train, undefined, 'The worker draws each image and calls `close()`: carriages leave and are let go.'),
  'railway-geometry': p(hit, {}, 'Geometry set off the main thread comes home, and the drawn button is clickable again.'),
  'lighthouse-pie-roles': p(voice, { variant: 'pie' }, 'A `role="list"` canvas with real labels: screen readers hear a list. Tab into it.'),
  'lighthouse-focus-ring': p(voice, { variant: 'pie' }, 'Tab to a label: `drawFocusIfNeeded` rings its wedge, only when focus should show.'),
  'lighthouse-flip-inert': p(voice, { variant: 'flip' }, 'The face turned away gets `inert`: out of the tab order and the accessibility tree.'),
  'vault-readback': p(vault, { variant: 'readback' }, 'Read the pixels back, anywhere: nothing sensitive was ever painted.'),
  'vault-theme': p(vault, { variant: 'theme' }, 'Your own colours, from CSS custom properties, instead of system colours that would leak.'),
  'vault-export': p(vault, { variant: 'export' }, 'An untainted canvas exports: press the button and get a real PNG.'),
  'clockwork-ticker': p(bell, {}, 'A DOM edit in `paint` lands in the next frame, so the clock ticks on without a request.'),
  'clockwork-resize': p(lens, {}, 'Resized before the bell rings: the grid matches the screen when `paint` draws.'),
  'clockwork-nested': p(nested, undefined, 'Inside out: the nested canvas paints first, so the parent finds it ready.'),
  'epilogue-detect': p(rise, { detect: true }, 'Detect first, draw second: this canvas took the path your check chose.'),
  'epilogue-probe': p(rise, { detect: true }, 'Probing the context told you which method to call. Here is the answer for this browser.'),
  'epilogue-hatch': p(rise, { detect: true }, 'With an escape hatch, every browser gets the card: drawn here, or plain HTML elsewhere.'),
};

/**
 * The panel under a solved exercise. It starts collapsed for exercises
 * solved before, and opens itself the moment one is solved.
 */
export function createProofPanel(exerciseId: string): { el: HTMLElement; open(): void; destroy(): void } {
  const proof = PROOFS[exerciseId];
  const el = h('section', { class: 'proof', hidden: true, 'aria-label': 'Your code, running' });
  let scene: MountedScene | null = null;
  if (!proof) return { el, open: () => {}, destroy: () => {} };

  const open = () => {
    if (scene) return;
    el.hidden = false;
    scene = mountScene(proof.scene, proof.params as never, 'Your code, running');
    el.replaceChildren(
      h('header', { class: 'proof-head' },
        h('h4', { class: 'proof-title' }, 'Your code, running'),
        h('p', { class: 'proof-says' }, rich(proof.says))),
      scene.el);
  };
  return {
    el,
    open,
    destroy: () => scene?.destroy(),
  };
}

/** A small button for exercises solved on an earlier visit. */
export function proofReplayButton(onClick: () => void): HTMLButtonElement {
  return button({ label: 'See your code run', variant: 'ghost', size: 'sm', onClick });
}
