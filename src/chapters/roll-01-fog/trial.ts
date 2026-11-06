/**
 * Trial: rescue the poem. Configure the markup and the paint handler so the
 * print shows the poem, a sparkling "you", and no advert. Outcomes come from
 * the pure rules in rules.ts.
 */
import { button } from '../../ui/components/button';
import { createToggle } from '../../ui/components/toggle';
import { append, h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { exposePoem, POEM_PARTS, type PoemConfig, type PoemOutcome, type PoemPart } from './rules';

const LABEL: Record<PoemPart, string> = { poem: 'poem', you: 'you', advert: 'advert' };

export const trial: Beat = (host, ctx) => {
  let mistakes = 0;
  const config: PoemConfig = {
    content: 'fallback',
    drawable: { poem: false, you: false, advert: false },
    draw: { poem: false, you: false, advert: false },
  };

  const chip = (label: string, write: (v: boolean) => void) =>
    createToggle({ kind: 'chip', label, onChange: write }).el;

  const contentChip = chip('content="drawable"', (v) => (config.content = v ? 'drawable' : 'fallback'));
  const drawableChip = (part: PoemPart) => chip('drawable', (v) => (config.drawable[part] = v));
  const t = (text: string) => h('code', {}, text);

  const markup = h('div', { class: 'code-tree', role: 'group', 'aria-label': 'Markup: toggle attributes' },
    h('div', { class: 'tree-line' }, t('<canvas'), contentChip, t('>')),
    h('div', { class: 'tree-line indent-1' }, t('<div id="poem"'), drawableChip('poem'), t('>')),
    h('div', { class: 'tree-line indent-2' }, t('Roses are red… and so are')),
    h('div', { class: 'tree-line indent-2' }, t('<span id="you"'), drawableChip('you'), t('>you</span>')),
    h('div', { class: 'tree-line indent-1' }, t('</div>')),
    h('div', { class: 'tree-line indent-1' }, t('<aside id="advert"'), drawableChip('advert'), t('>Buy more pixels!</aside>')),
    h('div', { class: 'tree-line' }, t('</canvas>')));

  const handler = h('div', { class: 'code-tree', role: 'group', 'aria-label': 'Paint handler: toggle draw calls' },
    h('div', { class: 'tree-line' }, t("canvas.addEventListener('paint', () => {")),
    ...POEM_PARTS.map((part) => h('div', { class: 'tree-line indent-1' },
      chip(`ctx.drawElementImage(${LABEL[part]}, …)`, (v) => (config.draw[part] = v)))),
    h('div', { class: 'tree-line' }, t('});')));

  const result = h('div', { class: 'poem-print', 'aria-live': 'polite' });
  const errors = h('ol', { class: 'console', 'aria-label': 'Console' });
  const expose = button({ label: 'Expose the print', variant: 'primary', onClick: () => {
    const outcome = exposePoem(config);
    renderOutcome(result, outcome);
    errors.replaceChildren(...outcome.errors.map((e) => h('li', {}, e)));
    ctx.say(outcome.hint, outcome.solved ? 'caret' : 'foe');
    if (outcome.solved) ctx.completeTrial({ mistakes });
    else mistakes += 1;
  } });

  host.append(h('div', { class: 'poem-trial' },
    h('div', { class: 'poem-build' },
      h('h3', { class: 'panel-title' }, 'Markup'), markup,
      h('h3', { class: 'panel-title' }, 'Paint handler'), handler,
      h('div', { class: 'panel-actions' }, expose)),
    h('div', { class: 'poem-prints' },
      h('figure', {}, renderGoal(), h('figcaption', {}, 'The goal')),
      h('figure', {}, result, h('figcaption', {}, 'Your print')),
      errors)));
  renderOutcome(result, null);
  return () => {};
};

function renderGoal(): HTMLElement {
  const print = h('div', { class: 'poem-print', 'data-goal': 'true' });
  renderOutcome(print, { errors: [], poemShown: true, you: 'separate', sparkles: true, advertShown: false, solved: true, hint: '' });
  return print;
}

function renderOutcome(target: HTMLElement, outcome: PoemOutcome | null): void {
  target.replaceChildren();
  if (!outcome || (!outcome.poemShown && outcome.you === 'missing' && !outcome.advertShown)) {
    target.append(h('p', { class: 'poem-empty' }, 'Blank paper'));
    return;
  }
  const you = h('span', { class: 'poem-you', 'data-state': outcome.you, 'data-sparkle': String(outcome.sparkles) },
    outcome.you === 'missing' ? '   ' : 'you');
  append(target,
    outcome.poemShown
      ? h('div', { class: 'poem-lines' }, h('p', {}, 'Roses are red,'), h('p', {}, 'violets are blue,'), h('p', {}, 'sugar is sweet,'), h('p', {}, 'and so are ', you, '.'))
      : h('div', { class: 'poem-lines' }, h('p', {}, you)),
    outcome.advertShown ? h('p', { class: 'poem-advert' }, 'Buy more pixels!') : null);
}
