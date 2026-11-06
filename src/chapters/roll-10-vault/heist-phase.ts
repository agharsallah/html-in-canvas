/**
 * Trial phase 2: the heist. The Leak tries six schemes. For each, call the
 * outcome (blocked, or the spy learns it) and the channel it uses
 * (painting or invalidation). Both must be right. Three strikes and the
 * heists start over.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { createSegmented } from '../../ui/components/segmented';
import { h, rich } from '../../ui/dom';
import type { BeatContext } from '../shared/chapter';
import { channelOf, heistOutcome, HEISTS, itemById, judgeHeist, type Channel, type HeistOutcome } from './rules';

export const HEIST_STRIKES = 3;

export function mountHeistPhase(host: HTMLElement, ctx: BeatContext, onDone: (mistakes: number) => void): () => void {
  let index = 0;
  let strikes = 0;
  let mistakes = 0;
  const root = h('div', { class: 'vault-heist' });
  host.append(root);

  const render = () => {
    const heist = HEISTS[index]!;
    let outcome: HeistOutcome | undefined;
    let channel: Channel | undefined;
    const outcomePick = createSegmented<'blocked' | 'learns' | ''>({ label: 'Outcome', value: '',
      options: [{ value: 'blocked', label: 'Blocked' }, { value: 'learns', label: 'The spy learns it' }],
      onChange: (v) => (outcome = v || undefined) });
    const channelPick = createSegmented<Channel | ''>({ label: 'Channel', value: '',
      options: [{ value: 'painting', label: 'Painting' }, { value: 'invalidation', label: 'Invalidation' }],
      onChange: (v) => (channel = v || undefined) });
    const feedback = h('div', { class: 'vault-feedback', 'aria-live': 'polite' });
    const next = button({ label: index === HEISTS.length - 1 ? 'Seal the vault' : 'Next heist', variant: 'primary', onClick: () => {
      if (index === HEISTS.length - 1) return onDone(mistakes);
      index += 1;
      render();
    } });
    next.hidden = true;

    const run = button({ label: 'Run the heist', variant: 'primary', onClick: () => {
      if (!outcome || !channel) {
        feedback.replaceChildren(callout({ kind: 'hint', body: 'Pick an outcome and a channel first.' }));
        return;
      }
      const verdict = judgeHeist(heist, { outcome, channel });
      const target = itemById(heist.target)!;
      const truth = `${heistOutcome(heist.target) === 'blocked' ? 'Blocked' : 'The spy learns it'}, through ${channelOf(heist.method)}. ${target.why}`;
      if (verdict.correct) {
        feedback.replaceChildren(callout({ kind: 'success', title: 'Called it', body: truth }));
        run.disabled = true;
        next.hidden = false;
        next.focus();
        ctx.say(heistOutcome(heist.target) === 'blocked' ? 'The bars hold.' : 'Let it look. That one was never a secret.');
        return;
      }
      mistakes += 1;
      strikes += 1;
      const wrongPart = !verdict.outcome && !verdict.channel ? 'Both the outcome and the channel are off.' : !verdict.outcome ? 'The channel is right; the outcome is not.' : 'The outcome is right; the channel is not.';
      if (strikes >= HEIST_STRIKES) {
        ctx.say('Three slips. The Leak regroups and starts the heists over.', 'foe');
        index = 0;
        strikes = 0;
        render();
        return;
      }
      feedback.replaceChildren(callout({ kind: 'error', title: 'The Leak grins', body: `${wrongPart} Painting means pixel read-back or timing; invalidation means the paint event.` }));
    } });

    root.replaceChildren(
      h('div', { class: 'vault-copier-head' },
        h('p', { class: 'vault-counter' }, `Heist ${index + 1} of ${HEISTS.length}`),
        h('div', { class: 'vault-strikes', role: 'img', 'aria-label': `${strikes} of ${HEIST_STRIKES} strikes` },
          ...Array.from({ length: HEIST_STRIKES }, (_, i) => h('span', { 'data-hit': String(i < strikes) })))),
      h('div', { class: 'vault-card vault-plan' }, h('p', { class: 'vault-plan-who' }, 'The spy script…'), h('p', {}, rich(heist.plan))),
      h('div', { class: 'vault-heist-picks' },
        h('div', {}, h('h3', { class: 'panel-title' }, 'Outcome'), outcomePick.el),
        h('div', {}, h('h3', { class: 'panel-title' }, 'Channel'), channelPick.el)),
      h('div', { class: 'panel-actions' }, run, next),
      feedback);
  };

  render();
  return () => root.remove();
}
