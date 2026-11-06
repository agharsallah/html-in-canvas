/**
 * Trial: launch the satellite. Phase 1 assembles the WebGL upload pipeline;
 * phase 2 aims clicks at a tilted card through the projective matrix. Both
 * are scored by the pure rules in rules.ts.
 */
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { mountAim } from './trial-aim';
import { mountPipeline } from './trial-pipeline';

export const trial: Beat = (host, ctx) => {
  let teardown: Array<() => void> = [];
  const say = (text: string, foe = false) => ctx.say(text, foe ? 'foe' : 'caret');
  const step = (n: number, title: string, help: string) =>
    h('header', { class: 'obs-phase-head' }, h('p', { class: 'obs-phase-n' }, `Phase ${n} of 2`), h('h3', {}, title), h('p', { class: 'panel-help' }, help));

  const phase1 = h('section', { class: 'obs-phase' }, step(1, 'Build the upload pipeline', 'Put each part in Setup or in the paint handler, in order. Leave the decoys in the bin.'));
  const phase2 = h('section', { class: 'obs-phase', hidden: true }, step(2, 'Orbit aim', 'The card tilts each round. Click the named button where it is drawn, not where the dashed flat box says.'));
  host.append(h('div', { class: 'obs-trial' }, phase1, phase2));

  teardown.push(mountPipeline(phase1, {
    say,
    onPass: (pipelineMistakes) => {
      phase2.hidden = false;
      phase2.scrollIntoView({ behavior: 'smooth', block: 'start' });
      teardown.push(mountAim(phase2, {
        colors: ctx.roll.process,
        say,
        onPass: (aimMistakes) => {
          const mistakes = pipelineMistakes + aimMistakes;
          say(mistakes === 0 ? 'Not one flat click. The Flat Earth Society has left the building.' : 'The satellite flies. The Society grumbles off into the fog.');
          ctx.completeTrial({ mistakes, stamps: mistakes === 0 ? ['round-earth'] : [] });
        },
      }));
    },
  }));

  return () => {
    teardown.forEach((fn) => fn());
    teardown = [];
  };
};
