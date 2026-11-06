/**
 * Trial: reassemble the clockwork. Phase 1, put the rendering-update gears
 * back in order (keyboard: move buttons on each gear). Phase 2, predict where
 * each scenario lands; every right answer is computed by the model in
 * rules.ts. Phase 3, name the selected design and why.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { h, rich } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { mountChoiceQuiz, type QuizScenario } from '../shared/choice-quiz';
import { stepInfo, type OptionId, type StepId } from './rules';
import { isCorrect, moveStep, predictions, scoreOrder, SELECTED, shuffledSteps } from './trial-rules';

const FINAL: Array<{ value: OptionId; label: string; why: string }> = [
  { value: 'A', label: 'Option A: at resize observer timing, so DOM edits in `paint` land this frame', why: 'It needs a loop, then either a costly synchronous Paint or placeholders, and placeholders deadlock WebGL calls that flush.' },
  { value: 'B', label: 'Option B: after Paint, looping until the DOM settles', why: 'No partial Paint, but even more steps re-run on each lap, and canvas code may run several times per update.' },
  { value: 'C', label: 'Option C: once, right after Paint, with the update locked in except the canvas drawing', why: 'The selected design: one `paint` per update, the complete display list is available, and DOM edits wait for the next update.' },
];

function quizScenarios(): QuizScenario[] {
  const predicted = predictions().map((p): QuizScenario => ({
    prompt: p.prompt,
    code: p.code,
    options: p.options.map((o) => ({ label: o.label, why: o.why, correct: isCorrect(p, o.value) })),
  }));
  return [...predicted, {
    prompt: 'The explainer chose one design for `paint` timing. Which one, and why?',
    options: FINAL.map((o) => ({ label: o.label, why: o.why, correct: o.value === SELECTED.option })),
  }];
}

export const trial: Beat = (host, ctx) => {
  let order: StepId[] = shuffledSteps(Date.now());
  let orderMistakes = 0;
  let stopQuiz = () => {};
  const root = h('div', { class: 'clock-trial' });
  host.append(root);

  const list = h('ol', { class: 'clock-order', 'aria-label': 'Rendering update steps, in your order' });
  const feedback = h('div', { class: 'clock-order-feedback', 'aria-live': 'polite' });

  const renderList = (focus?: { index: number; dir: 'up' | 'down' }) => {
    list.replaceChildren(...order.map((id, i) => {
      const info = stepInfo(id);
      const name = `${info.number ? `${info.number}. ` : ''}${info.label.replace(/`/g, '')}`;
      const up = h('button', { type: 'button', class: 'clock-move', 'aria-label': `Move “${name}” up`, disabled: i === 0, 'data-dir': 'up' }, '▲');
      const down = h('button', { type: 'button', class: 'clock-move', 'aria-label': `Move “${name}” down`, disabled: i === order.length - 1, 'data-dir': 'down' }, '▼');
      up.addEventListener('click', () => move(i, -1));
      down.addEventListener('click', () => move(i, 1));
      return h('li', { class: 'clock-gear-card', 'data-step': id },
        h('span', { class: 'clock-gear-glyph', 'aria-hidden': 'true' }, '⚙'),
        h('span', { class: 'clock-gear-name' }, info.number ? h('b', {}, `${info.number} `) : null, rich(info.label)),
        h('span', { class: 'clock-moves' }, up, down));
    }));
    if (focus) {
      const row = list.children[focus.index];
      const target = row?.querySelector<HTMLButtonElement>(`[data-dir="${focus.dir}"]:not([disabled])`) ?? row?.querySelector<HTMLButtonElement>('.clock-move:not([disabled])');
      target?.focus();
    }
  };

  const move = (index: number, delta: -1 | 1) => {
    order = moveStep(order, index, delta);
    renderList({ index: index + delta, dir: delta < 0 ? 'up' : 'down' });
  };

  const check = button({ label: 'Wind the clock', variant: 'primary', onClick: () => {
    const score = scoreOrder(order);
    if (score.solved) {
      feedback.replaceChildren(callout({ kind: 'success', title: 'It ticks', body: 'rAF, style and layout, resize observers, intersection, Paint, the `paint` event, commit.' }));
      ctx.say('Every gear in place. Now predict where things land.');
      startQuiz();
      return;
    }
    orderMistakes += 1;
    feedback.replaceChildren(callout({ kind: 'error', title: 'The gears grind', body: `${score.correctCount} of ${order.length} gears are in the right place.` }));
    ctx.say('Grind, grind. Leave it broken, apprentice.', 'foe');
  } });

  const startQuiz = () => {
    phase1.hidden = true;
    const quizHost = h('div', { class: 'clock-quiz' });
    root.append(h('p', { class: 'clock-phase' }, 'Phase 2 of 2 · Where does it land?'), quizHost);
    stopQuiz = mountChoiceQuiz(quizHost, ctx, {
      scenarios: quizScenarios(),
      onPass: (quizMistakes) => {
        const mistakes = orderMistakes + quizMistakes;
        ctx.say(mistakes === 0 ? 'Not a single slipped tooth. The Deadlock has nothing to hold on to.' : 'The clock runs true. The Deadlock lets go.');
        ctx.completeTrial({ mistakes, stamps: mistakes === 0 ? ['steady-hands'] : [] });
      },
    });
  };

  const phase1 = h('section', { class: 'clock-phase1' },
    h('p', { class: 'clock-phase' }, 'Phase 1 of 2 · Reassemble the clockwork'),
    h('p', { class: 'panel-help' }, rich('Put the steps of one rendering update in the order the selected design (Option C) runs them. Step numbers are as numbered in the explainer. Each wrong winding counts as a mistake.')),
    list, h('div', { class: 'panel-actions' }, check), feedback);
  root.append(phase1);
  renderList();

  return () => {
    stopQuiz();
    root.remove();
  };
};
