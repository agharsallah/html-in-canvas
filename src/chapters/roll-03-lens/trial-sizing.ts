/**
 * Boss fight, phase two: the grinding wheel. Five puzzles from the docs:
 * three grids to size for a crisp print, two cards to centre in grid px.
 * Every answer is checked by rounds.ts.
 */
import { createGridsChart } from '../../ui/charts/lens-grids';
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { h, rich } from '../../ui/dom';
import type { PhaseHooks } from './trial-ledger';
import { checkCenter, checkGrid, ROUNDS, type CenterRound, type GridRound, type RoundResult } from './rounds';

function numberField(label: string, value: string): { el: HTMLElement; input: HTMLInputElement } {
  const input = h('input', { type: 'number', class: 'ui-field lens-number', inputmode: 'decimal', step: 'any', value, 'aria-label': label });
  return { el: h('label', { class: 'lens-field' }, h('span', {}, label), input), input };
}

function cardCss(round: CenterRound): string {
  const { width, height, padding, border, boxSizing } = round.card;
  return [
    '#card {',
    boxSizing === 'border-box' ? '  box-sizing: border-box;' : null,
    `  width: ${width}px;`,
    `  height: ${height}px;`,
    `  padding: ${padding}px;`,
    border ? `  border: ${border}px solid;` : null,
    '}',
  ].filter(Boolean).join('\n');
}

export function mountSizing(host: HTMLElement, hooks: PhaseHooks): () => void {
  let index = 0;
  const wrap = h('div', { class: 'lens-sizing' });
  host.append(wrap);

  const render = () => {
    const round = ROUNDS[index]!;
    const feedback = h('div', { class: 'quiz-feedback', 'aria-live': 'polite' });
    const next = button({ label: index === ROUNDS.length - 1 ? 'Finish Blur' : 'Next puzzle', variant: 'primary', onClick: () => {
      if (index === ROUNDS.length - 1) return hooks.onDone();
      index += 1;
      render();
    } });
    next.hidden = true;
    const settle = (result: RoundResult, submit: HTMLButtonElement) => {
      feedback.replaceChildren(callout({ kind: result.ok ? 'success' : 'error', title: result.ok ? 'Sharp' : 'Still soft', body: result.message }));
      if (!result.ok) return hooks.onMiss();
      submit.disabled = true;
      hooks.onHit();
      next.hidden = false;
      next.focus();
    };

    const body = round.kind === 'grid' ? gridBody(round, settle) : centerBody(round, settle);
    wrap.replaceChildren(
      h('p', { class: 'quiz-progress' }, `Puzzle ${index + 1} of ${ROUNDS.length}`),
      h('p', { class: 'quiz-prompt' }, rich(round.prompt)),
      body, feedback, next);
    wrap.querySelector('input')?.focus();
  };

  render();
  return () => wrap.remove();
}

type Settle = (result: RoundResult, submit: HTMLButtonElement) => void;

function gridBody(round: GridRound, settle: Settle): HTMLElement {
  const w = numberField('canvas.width', String(round.start.width));
  const hgt = numberField('canvas.height', String(round.start.height));
  const chart = createGridsChart();
  const score = h('p', { class: 'lens-score' });
  const facts = h('ul', { class: 'lens-facts' },
    h('li', {}, `CSS size: ${round.css.width} × ${round.css.height} px`),
    h('li', {}, `devicePixelRatio: ${round.dpr}`),
    h('li', {}, `Grid now: ${round.start.width} × ${round.start.height}`));
  const submit = button({ label: 'Grind the grid', variant: 'primary', onClick: () => {
    const result = checkGrid(round, { width: Number(w.input.value), height: Number(hgt.input.value) });
    if (result.report) {
      chart.update(result.report);
      score.textContent = `Sharpness ${result.report.sharpness} / 100: ${result.report.verdict}, ${result.report.blends} blend${result.report.blends > 1 ? 's' : ''}.`;
    }
    settle(result, submit);
  } });
  const form = h('form', { class: 'lens-form', onsubmit: (e: Event) => (e.preventDefault(), submit.click()) }, w.el, hgt.el, submit);
  return h('div', { class: 'lens-round' }, h('div', {}, facts, form, score), chart.el);
}

function centerBody(round: CenterRound, settle: Settle): HTMLElement {
  const x = numberField('x (grid px)', '');
  const y = numberField('y (grid px)', '');
  const grid = { width: Math.round(round.css.width * round.dpr), height: Math.round(round.css.height * round.dpr) };
  const facts = h('ul', { class: 'lens-facts' },
    h('li', {}, `Canvas: ${round.css.width} × ${round.css.height} CSS px, DPR ${round.dpr}`),
    h('li', {}, `canvas.width × canvas.height: ${grid.width} × ${grid.height}`),
    h('li', {}, 'Your draw call: ', h('code', {}, 'ctx.drawElementImage(card, x, y)')));
  const submit = button({ label: 'Project', variant: 'primary', onClick: () => {
    settle(checkCenter(round, Number(x.input.value), Number(y.input.value)), submit);
  } });
  const form = h('form', { class: 'lens-form', onsubmit: (e: Event) => (e.preventDefault(), submit.click()) }, x.el, y.el, submit);
  return h('div', { class: 'lens-round' }, h('div', {}, facts, form), h('pre', { class: 'code' }, h('code', {}, cardCss(round))));
}
