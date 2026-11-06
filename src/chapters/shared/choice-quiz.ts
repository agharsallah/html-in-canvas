/**
 * A reusable "predict the outcome" trial: one scenario at a time, pick an
 * answer card, read why it is right or wrong, retry until right.
 * Press A, B, C… to pick quickly. Mistakes are counted.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { append, h, rich } from '../../ui/dom';
import type { BeatContext } from './chapter';

export interface QuizOption {
  label: string;
  correct?: boolean;
  /** Why this answer is right or wrong. Always shown after picking it. */
  why: string;
}

export interface QuizScenario {
  prompt: string;
  /** Optional code shown with the prompt. */
  code?: string;
  options: QuizOption[];
}

export interface ChoiceQuizOptions {
  scenarios: QuizScenario[];
  /** Called with the mistake count when every scenario is answered. */
  onPass(mistakes: number): void;
}

const LETTERS = 'ABCDEF';

export function mountChoiceQuiz(host: HTMLElement, ctx: BeatContext, options: ChoiceQuizOptions): () => void {
  let index = 0;
  let mistakes = 0;
  let buttons: HTMLButtonElement[] = [];
  const card = h('div', { class: 'quiz' });
  host.append(card);

  const render = () => {
    const scenario = options.scenarios[index]!;
    const last = index === options.scenarios.length - 1;
    const feedback = h('div', { class: 'quiz-feedback', 'aria-live': 'polite' });
    const next = button({ label: last ? 'Finish the trial' : 'Next scenario', variant: 'primary', onClick: () => {
      if (last) return options.onPass(mistakes);
      index += 1;
      render();
    } });
    next.hidden = true;

    buttons = scenario.options.map((option, i) =>
      h('button', {
        type: 'button', class: 'ui-option',
        onclick: (event: Event) => {
          const picked = event.currentTarget as HTMLButtonElement;
          feedback.replaceChildren(callout({ kind: option.correct ? 'success' : 'error', title: option.correct ? 'Right' : 'Not quite', body: option.why }));
          if (option.correct) {
            picked.dataset.result = 'right';
            buttons.forEach((b) => (b.disabled = true));
            next.hidden = false;
            next.focus();
            ctx.say('That one rings true.');
          } else {
            mistakes += 1;
            picked.dataset.result = 'wrong';
            picked.disabled = true;
            ctx.say('Read why, then pick another.');
          }
        },
      }, h('span', { class: 'ui-option-key', 'aria-hidden': 'true' }, LETTERS[i]!), h('span', {}, rich(option.label))));

    const dots = h('div', { class: 'quiz-dots', 'aria-hidden': 'true' },
      ...options.scenarios.map((_, i) => h('span', { 'data-state': i < index ? 'done' : i === index ? 'current' : 'next' })));

    card.replaceChildren();
    append(card,
      h('div', { class: 'quiz-head' }, h('p', { class: 'quiz-progress' }, `Scenario ${index + 1} of ${options.scenarios.length}`), dots),
      h('p', { class: 'quiz-prompt' }, rich(scenario.prompt)),
      scenario.code ? h('pre', { class: 'code' }, h('code', {}, scenario.code)) : null,
      h('div', { class: 'quiz-options' }, ...buttons),
      feedback,
      next);
  };

  const onKey = (event: KeyboardEvent) => {
    const origin = event.target;
    if (origin instanceof Element && origin.closest('input, textarea, dialog[open]')) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;
    const i = LETTERS.indexOf(event.key.toUpperCase());
    const choice = buttons[i];
    if (i >= 0 && choice && !choice.disabled) choice.click();
  };
  window.addEventListener('keydown', onKey);

  render();
  return () => {
    window.removeEventListener('keydown', onKey);
    card.remove();
  };
}
