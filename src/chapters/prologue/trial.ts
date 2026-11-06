/**
 * Trial: sort the claims. Which problems does HTML-in-Canvas set out to fix?
 * The decoys foreshadow later rolls (privacy, real DOM).
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { createToggle } from '../../ui/components/toggle';
import { h, rich } from '../../ui/dom';
import type { Beat } from '../shared/chapter';

interface Claim {
  text: string;
  fixes: boolean;
  why: string;
}

export const CLAIMS: readonly Claim[] = [
  { text: 'Chart legends and axes with real styled, wrapped text', fixes: true, why: 'Styled, laid-out content is the first use case.' },
  { text: 'Screen readers understanding what the canvas shows', fixes: true, why: 'Drawable content stays in the accessibility tree.' },
  { text: 'Running WebGL shaders over a real HTML form', fixes: true, why: 'Composing HTML with effects is a named use case.' },
  { text: 'A working menu on a surface inside a 3D game', fixes: true, why: 'HTML in a 3D context is a named use case.' },
  { text: 'Exporting a styled HTML card as an image or video', fixes: true, why: 'Media export is a named use case.' },
  { text: 'Reading the pixels of a cross-origin image through the canvas', fixes: false, why: 'Cross-origin content is left out of snapshots on purpose. That is the Vault, roll 10.' },
  { text: 'Finding out which links the user has visited', fixes: false, why: 'Visited-link styling is sensitive and never painted into snapshots.' },
  { text: 'Laying out HTML without any DOM elements', fixes: false, why: 'Drawable content is real DOM: children of the canvas element.' },
];

export const trial: Beat = (host, ctx) => {
  let mistakes = 0;
  const toggles = CLAIMS.map((claim) => createToggle({ kind: 'checkbox', label: claim.text }));
  const notes = CLAIMS.map(() => h('p', { class: 'claim-why' }));
  const result = h('div', { class: 'claims-result', 'aria-live': 'polite' });
  const counter = h('p', { class: 'claims-count' });
  const updateCount = () => {
    const picked = toggles.filter((t) => t.checked).length;
    counter.textContent = `${picked} ticked`;
  };
  toggles.forEach((t) => t.el.addEventListener('click', updateCount));
  updateCount();

  const check = button({ label: 'Check my sort', variant: 'primary', onClick: () => {
    let wrong = 0;
    CLAIMS.forEach((claim, i) => {
      const right = toggles[i]!.checked === claim.fixes;
      notes[i]!.closest('li')!.dataset.result = right ? 'right' : 'wrong';
      notes[i]!.replaceChildren(right ? '' : rich(claim.why));
      if (!right) wrong += 1;
    });
    if (wrong === 0) {
      ctx.say('Five real problems, three traps avoided. The Smudge flinches.');
      ctx.completeTrial({ mistakes });
      return;
    }
    mistakes += wrong;
    result.replaceChildren(callout({ kind: 'error', title: `${wrong} ${wrong === 1 ? 'card is' : 'cards are'} in the wrong pile`, body: 'The notes under each one explain why. Change them and check again.' }));
    ctx.say('Not yet. Read the notes, then sort again.');
  } });

  host.append(h('div', { class: 'claims' },
    h('ul', { class: 'claim-list' }, ...CLAIMS.map((_, i) => h('li', { class: 'claim' }, toggles[i]!.el, notes[i]!))),
    h('div', { class: 'claims-actions' }, check, counter),
    result));
  return () => {};
};
