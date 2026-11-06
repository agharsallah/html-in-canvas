/**
 * Trial: fix the crooked reel. Six framings to reproduce on a 600 × 300 grid
 * (2 grid px per CSS px). Each round starts from the Crooked Reel's broken
 * call. Pick the overload, fix the numbers, and project. Scoring is the pure
 * judge() in rules.ts; every failed projection counts as a mistake.
 */
import { button, setLabel } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { createDial } from '../../ui/components/dial';
import { createSegmented } from '../../ui/components/segmented';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { formatCall, judge, project, ROUNDS, SCALE, TICKET, usesSize, usesSource, type ArgCount, type DrawCall } from './rules';
import { createScreenView, ticketBlueprint } from './trial-view';

type Field = 'sx' | 'sy' | 'sw' | 'sh' | 'dx' | 'dy' | 'dw' | 'dh';
const SOURCE_FIELDS: Field[] = ['sx', 'sy', 'sw', 'sh'];
const DEST_FIELDS: Field[] = ['dx', 'dy', 'dw', 'dh'];

export const trial: Beat = (host, ctx) => {
  let index = 0;
  let mistakes = 0;
  let attempt: DrawCall = { ...ROUNDS[0]!.crooked };

  const view = createScreenView();
  const readout = h('code');
  const feedback = h('div', { class: 'tk-feedback', 'aria-live': 'polite' });
  const heading = h('h3', { class: 'panel-title' });
  const brief = h('p', { class: 'tk-brief' });
  const dots = h('div', { class: 'quiz-dots', 'aria-hidden': 'true' });

  const inputs = new Map<Field, HTMLInputElement>();
  const fieldEls = new Map<Field, HTMLElement>();
  const makeField = (name: Field) => {
    const input = h('input', { type: 'number', class: 'ui-field tk-input', step: '1', inputmode: 'numeric', id: `tk-${name}` });
    input.addEventListener('input', () => {
      const value = Number(input.value);
      if (Number.isFinite(value)) attempt = { ...attempt, [name]: value };
      sync(false);
    });
    inputs.set(name, input);
    const unit = name.startsWith('s') ? 'CSS px' : 'grid px';
    const el = h('label', { class: 'tk-field', for: `tk-${name}` },
      h('span', { class: 'tk-field-name' }, name), input, h('span', { class: name.startsWith('s') ? 'pj-css' : 'pj-grid' }, unit));
    fieldEls.set(name, el);
    return el;
  };

  const overload = createSegmented<`${ArgCount}`>({
    label: 'Overload',
    value: '3',
    options: [
      { value: '3', label: '3 args' },
      { value: '5', label: '5 args' },
      { value: '7', label: '7 args' },
      { value: '9', label: '9 args' },
    ],
    onChange: (v) => {
      attempt = { ...attempt, args: Number(v) as ArgCount };
      sync(false);
    },
  });
  const dial = createDial({ label: 'ctx.rotate', min: -45, max: 45, step: 5, value: 0, unit: '°', onInput: (v) => {
    attempt = { ...attempt, rotate: v };
    sync(false);
  } });

  /** Reflect `attempt` into the controls; `fill` also rewrites the inputs. */
  const sync = (fill: boolean) => {
    const round = ROUNDS[index]!;
    for (const name of [...SOURCE_FIELDS, ...DEST_FIELDS]) {
      const shown = SOURCE_FIELDS.includes(name) ? usesSource(attempt.args) : name === 'dw' || name === 'dh' ? usesSize(attempt.args) : true;
      fieldEls.get(name)!.hidden = !shown;
      if (fill) inputs.get(name)!.value = String(attempt[name]);
    }
    if (fill) {
      overload.set(`${attempt.args}`, true);
      dial.set(attempt.rotate);
    }
    dial.el.hidden = !round.rotates;
    readout.textContent = formatCall(attempt);
  };

  const startRound = () => {
    const round = ROUNDS[index]!;
    attempt = { ...round.crooked };
    heading.textContent = `Round ${index + 1} of ${ROUNDS.length}: ${round.title}`;
    brief.textContent = round.brief;
    dots.replaceChildren(...ROUNDS.map((_, i) => h('span', { 'data-state': i < index ? 'done' : i === index ? 'current' : 'next' })));
    feedback.replaceChildren();
    view.show(project(round.target, TICKET, SCALE), null, false);
    sync(true);
    ctx.say(`My reel says: ${formatCall(round.crooked).replace('\n', ' ')} Fix it, if you can.`, 'foe');
  };

  const next = button({ label: 'Next round', variant: 'primary', onClick: () => {
    next.hidden = true;
    if (index === ROUNDS.length - 1) {
      ctx.say(mistakes === 0 ? 'Six perfect frames. The Crooked Reel runs straight at last.' : 'Every frame aligned. The reel runs true.');
      ctx.completeTrial({ mistakes, stamps: mistakes === 0 ? ['steady-reel'] : [] });
      return;
    }
    index += 1;
    startRound();
  } });
  next.hidden = true;

  const projectBtn = button({ label: 'Project', variant: 'primary', kbd: 'Enter', onClick: () => {
    const round = ROUNDS[index]!;
    const verdict = judge(attempt, round.target, TICKET, SCALE);
    view.show(project(round.target, TICKET, SCALE), project(attempt, TICKET, SCALE), verdict.matches);
    feedback.replaceChildren(callout({ kind: verdict.matches ? 'success' : 'error', title: verdict.matches ? 'In frame' : 'Still crooked', body: verdict.hint }));
    if (verdict.matches) {
      next.hidden = false;
      setLabel(next, index === ROUNDS.length - 1 ? 'Finish the trial' : 'Next round');
      next.focus();
      ctx.say('Straight and true.');
    } else {
      mistakes += 1;
      ctx.say(verdict.hint, 'foe');
    }
  } });

  const form = h('form', { class: 'tk-form', 'aria-label': 'Your draw call' },
    h('div', { class: 'tk-row' }, h('span', { class: 'tk-label' }, 'Form'), overload.el),
    h('div', { class: 'tk-fields' }, ...SOURCE_FIELDS.map(makeField)),
    h('div', { class: 'tk-fields' }, ...DEST_FIELDS.map(makeField)),
    dial.el,
    h('pre', { class: 'code tk-readout', 'aria-label': 'Your call' }, readout),
    h('div', { class: 'panel-actions' }, projectBtn, next));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (next.hidden) projectBtn.click();
  });
  // Enter in a number field submits the form; give it a hidden submit target.
  form.append(h('button', { type: 'submit', hidden: true, tabindex: '-1' }, 'Project'));

  host.append(h('div', { class: 'tk-trial' },
    h('div', { class: 'tk-stage' },
      h('div', { class: 'quiz-head' }, heading, dots),
      brief,
      view.el,
      h('p', { class: 'tk-legend' }, 'Canvas: 300 × 150 CSS px, grid 600 × 300 (2 grid px per CSS px). Dashed: the target. Solid: your projection.')),
    h('div', { class: 'panel tk-panel' }, ticketBlueprint(), form, feedback)));

  startRound();
  return () => {};
};
