/**
 * "Your code, running": the panel under a solved exercise. The scenes are
 * loaded on demand (their own chunk), the first time a panel opens.
 */
import { button } from '../../../ui/components/button';
import { h, rich } from '../../../ui/dom';
import type { MountedScene } from './kit';

/** Exercises with a proof scene. Kept in sync with registry.ts by a test. */
export const PROOF_IDS: readonly string[] = [
  'prologue-detect',
  'fog-opt-in',
  'fog-fix-throw',
  'fog-nested',
  'bells-handler',
  'bells-loop',
  'bells-changed',
  'bells-coexist',
  'lens-observer',
  'lens-center',
  'lens-border-box',
  'projector-stub',
  'projector-fill',
  'projector-tilt',
  'mirrors-by-hand',
  'mirrors-backdrop',
  'mirrors-webgl',
  'observatory-allocate',
  'observatory-upload',
  'observatory-geometry',
  'foundry-texture',
  'foundry-draw',
  'foundry-theme',
  'railway-ship',
  'railway-worker',
  'railway-geometry',
  'lighthouse-pie-roles',
  'lighthouse-focus-ring',
  'lighthouse-flip-inert',
  'vault-readback',
  'vault-theme',
  'vault-export',
  'clockwork-ticker',
  'clockwork-resize',
  'clockwork-nested',
  'epilogue-detect',
  'epilogue-probe',
  'epilogue-hatch',
];

export function hasProof(id: string): boolean {
  return PROOF_IDS.includes(id);
}

/** The panel: hidden until opened, which happens the moment an exercise is solved. */
export function createProofPanel(exerciseId: string): { el: HTMLElement; open(): void; destroy(): void } {
  const el = h('section', { class: 'proof', hidden: true, 'aria-label': 'Your code, running' });
  let scene: MountedScene | null = null;
  let opening = false;
  let destroyed = false;

  const open = () => {
    if (scene || opening || !hasProof(exerciseId)) return;
    opening = true;
    void Promise.all([import('./registry'), import('./kit')]).then(([{ PROOFS }, { mountScene }]) => {
      const proof = PROOFS[exerciseId];
      if (destroyed || !proof) return;
      scene = mountScene(proof.scene, proof.params as never, 'Your code, running');
      el.hidden = false;
      el.replaceChildren(
        h('header', { class: 'proof-head' },
          h('h4', { class: 'proof-title' }, 'Your code, running'),
          h('p', { class: 'proof-says' }, rich(proof.says))),
        scene.el);
    });
  };
  return {
    el,
    open,
    destroy: () => {
      destroyed = true;
      scene?.destroy();
    },
  };
}

/** A small button for exercises solved on an earlier visit. */
export function proofReplayButton(onClick: () => void): HTMLButtonElement {
  return button({ label: 'See your code run', variant: 'ghost', size: 'sm', onClick });
}
