/**
 * Trial: beat the Melt. Phase 1 sorts shader effects into colour-only and
 * hit-test-breaking; phase 2 fills two WebGPU orders with the guide's
 * texture recipe. Both are scored by the pure rules in rules.ts.
 */
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { mountConfig } from './trial-config';
import { mountSort } from './trial-sort';

export const trial: Beat = (host, ctx) => {
  const teardown: Array<() => void> = [];
  const say = (text: string, foe = false) => ctx.say(text, foe ? 'foe' : 'caret');
  const head = (n: number, title: string, help: string) =>
    h('header', { class: 'fdy-phase-head' }, h('p', { class: 'fdy-phase-n' }, `Phase ${n} of 2`), h('h3', {}, title), h('p', { class: 'panel-help' }, help));

  const phase1 = h('section', { class: 'fdy-phase' }, head(1, 'Safe or melt?', 'For each effect: does it only change colour, or does it move pixels away from the hit region you sent?'));
  const phase2 = h('section', { class: 'fdy-phase', hidden: true }, head(2, 'The WebGPU orders', 'Set up the texture and the upload exactly as the Chrome guide does. The code updates as you choose.'));
  host.append(h('div', { class: 'fdy-trial' }, phase1, phase2));

  teardown.push(mountSort(phase1, {
    say,
    onPass: (sortMistakes) => {
      say('Every effect sorted. Now cast the textures.');
      phase2.hidden = false;
      phase2.scrollIntoView({ behavior: 'smooth', block: 'start' });
      teardown.push(mountConfig(phase2, {
        say,
        onPass: (configMistakes) => {
          const mistakes = sortMistakes + configMistakes;
          say(mistakes === 0 ? 'Not one drip. The Melt cools into a harmless puddle of slag.' : 'The Melt cools. Your letters hold their shape.');
          ctx.completeTrial({ mistakes, stamps: mistakes === 0 ? ['cool-head'] : [] });
        },
      }));
    },
  }));

  return () => teardown.forEach((fn) => fn());
};
