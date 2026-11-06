/**
 * The boss rush: one question from every roll, then the escape-hatch round.
 * Three lives (film canisters). A wrong answer costs one and stays on the
 * question; lose them all and the reel snaps: a fresh set is dealt.
 * The future's health bar is the questions left. Press A, B, C… to answer.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { append, h, rich } from '../../ui/dom';
import { ROLLS } from '../../story/rolls';
import type { BeatContext } from '../shared/chapter';
import { BANK_EARLY } from './bank-early';
import { BANK_LATE } from './bank-late';
import { answerRush, hatchQuestions, isCorrect, LIVES, pickRush, startRush, type Rush, type RushQuestion } from './rules';

export const BANK: readonly RushQuestion[] = [...BANK_EARLY, ...BANK_LATE];
const HATCH = hatchQuestions();
const ALL = new Map([...BANK, ...HATCH].map((q) => [q.id, q]));
const LETTERS = 'ABCDEFGH';

function shuffledIndices(n: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function dealRun(random: () => number = Math.random): string[] {
  return [...pickRush(BANK, ROLLS.map((r) => r.id), random), ...HATCH.map((q) => q.id)];
}

export function mountRush(host: HTMLElement, ctx: BeatContext, onWin: (mistakes: number) => void): () => void {
  let rush: Rush = startRush(dealRun());
  let totalMistakes = 0;
  let buttons: HTMLButtonElement[] = [];
  const root = h('div', { class: 'rush' });
  host.append(root);

  const render = () => {
    const question = ALL.get(rush.order[rush.index]!)!;
    const roll = ROLLS.find((r) => r.id === question.roll);
    const hatch = question.id.startsWith('hatch-');
    const left = rush.order.length - rush.index;
    const feedback = h('div', { class: 'rush-feedback', 'aria-live': 'polite' });
    const next = button({ label: rush.index === rush.order.length - 1 ? 'Defeat the future' : 'Next', variant: 'primary', onClick: () => {
      if (rush.status === 'won') return onWin(totalMistakes);
      render();
    } });
    next.hidden = true;

    // Banks list the right answer first; the screen never does.
    const order = hatch ? question.options.map((_, i) => i) : shuffledIndices(question.options.length);
    buttons = order.map((i) => [question.options[i]!, i] as const).map(([option, i], shown) => h('button', {
      type: 'button', class: 'ui-option',
      onclick: (event: Event) => {
        const picked = event.currentTarget as HTMLButtonElement;
        const correct = isCorrect(question, i);
        rush = answerRush(rush, correct);
        feedback.replaceChildren(callout({ kind: correct ? 'success' : 'error', title: correct ? 'Hit' : 'The future strikes back', body: `${option.why} (${question.source})` }));
        if (correct) {
          picked.dataset.result = 'right';
          buttons.forEach((b) => (b.disabled = true));
          next.hidden = false;
          next.focus();
          return;
        }
        totalMistakes += 1;
        picked.dataset.result = 'wrong';
        picked.disabled = true;
        lives.replaceChildren(...canisters());
        if (rush.status === 'lost') {
          ctx.say('The reel snapped. A fresh reel is threading through the projector.', 'foe');
          buttons.forEach((b) => (b.disabled = true));
          const again = button({ label: 'Thread a new reel', variant: 'primary', onClick: () => {
            rush = startRush(dealRun());
            render();
          } });
          feedback.append(again);
          again.focus();
        }
      },
    }, h('span', { class: 'ui-option-key', 'aria-hidden': 'true' }, LETTERS[shown]!), h('span', {}, rich(option.label))));

    const canisters = () => Array.from({ length: LIVES }, (_, i) => h('span', { class: 'rush-life', 'data-lost': String(i >= rush.lives) }));
    const lives = h('div', { class: 'rush-lives', role: 'img', 'aria-label': `${rush.lives} of ${LIVES} lives` }, ...canisters());
    const hp = h('div', { class: 'rush-hp', role: 'meter', 'aria-label': 'The future’s strength', 'aria-valuemin': '0', 'aria-valuemax': String(rush.order.length), 'aria-valuenow': String(left) },
      h('span', { style: `width:${(left / rush.order.length) * 100}%` }));

    root.replaceChildren();
    append(root,
      h('div', { class: 'rush-head' },
        h('div', { class: 'rush-boss' }, h('p', { class: 'rush-boss-name' }, 'The future'), hp),
        lives),
      h('p', { class: 'rush-round' }, hatch ? `Escape hatch · ${left} left` : `Roll ${roll?.frame ?? ''} · ${roll?.title ?? ''} · ${left} left`),
      h('p', { class: 'quiz-prompt' }, rich(question.prompt)),
      h('div', { class: `quiz-options${hatch ? ' rush-hatch-options' : ''}` }, ...buttons),
      feedback,
      next);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.target instanceof Element && event.target.closest('input, textarea, dialog[open]')) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;
    const choice = buttons[LETTERS.indexOf(event.key.toUpperCase())];
    if (choice && !choice.disabled) choice.click();
  };
  window.addEventListener('keydown', onKey);
  render();
  return () => {
    window.removeEventListener('keydown', onKey);
    root.remove();
  };
}
