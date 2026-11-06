/**
 * Trial: the dispatch puzzle. Three timetables of growing length. Place
 * capture, post, draw, close and geometry steps between the fixed station
 * signs so every image is shipped, the newest is drawn, nothing is left
 * open, and the form's position is read only once its geometry is home.
 * Outcomes come from the pure rules in rules.ts; each failed dispatch is a
 * mistake.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { LEVELS } from './levels';
import { checkTimetable } from './rules';
import { createDispatchBoard, type DispatchBoard } from './trial-board';

export const trial: Beat = (host, ctx) => {
  let level = 0;
  let mistakes = 0;
  let board: DispatchBoard | null = null;
  let wonTimer = 0;

  const heading = h('h3', { class: 'rail-level-title', tabindex: '-1' });
  const brief = h('p', { class: 'rail-level-brief' });
  const dots = h('div', { class: 'quiz-dots', 'aria-hidden': 'true' });
  const boardSlot = h('div', { class: 'rail-board-slot' });
  const feedback = h('div', { class: 'rail-feedback', 'aria-live': 'polite' });
  const actions = h('div', { class: 'panel-actions' });

  const dispatch = button({ label: 'Dispatch the trains', variant: 'primary', onClick: () => run() });
  const next = button({ label: 'Next timetable', variant: 'primary', onClick: () => {
    level += 1;
    mount();
  } });

  const mount = () => {
    const current = LEVELS[level]!;
    heading.textContent = `Timetable ${level + 1} of ${LEVELS.length}: ${current.title}`;
    brief.textContent = current.brief;
    dots.replaceChildren(...LEVELS.map((_, i) => h('span', { 'data-state': i < level ? 'done' : i === level ? 'current' : 'next' })));
    board = createDispatchBoard(current.skeleton, current.tray, () => {
      board?.mark(new Set());
      feedback.replaceChildren();
    });
    boardSlot.replaceChildren(board.el);
    feedback.replaceChildren();
    actions.replaceChildren(dispatch);
    if (level > 0) heading.focus();
  };

  const run = () => {
    if (!board) return;
    const current = LEVELS[level]!;
    const result = checkTimetable(board.order(), current.skeleton);
    if (!result.ok) {
      mistakes += 1;
      board.mark(new Set(result.violations.map((v) => v.index).filter((i) => i >= 0)));
      const shown = result.violations.slice(0, 4);
      feedback.replaceChildren(callout({
        kind: 'error',
        title: `Signal red: ${result.violations.length} ${result.violations.length === 1 ? 'problem' : 'problems'}`,
        body: h('ul', { class: 'rail-problems' }, ...shown.map((v) => h('li', {}, v.index >= 0 ? `Row ${v.index + 1}: ${v.message}` : v.message)),
          result.violations.length > shown.length ? h('li', {}, `…and ${result.violations.length - shown.length} more.`) : null),
      }));
      ctx.say(result.violations[0]!.message, 'foe');
      return;
    }
    board.lock(true);
    boardSlot.dataset.won = 'true';
    const last = level === LEVELS.length - 1;
    feedback.replaceChildren(callout({
      kind: 'success',
      title: 'All trains on time',
      body: `Drawn: ${result.drawn.map((n) => `#${n}`).join(', ')}. Closed: ${result.closed.map((n) => `#${n}`).join(', ')}. Nothing left in the yard.`,
    }));
    if (last) {
      actions.replaceChildren();
      ctx.say(mistakes === 0 ? 'Not one red signal. The Late Train has nothing left to carry.' : 'Every train arrives on time now.');
      ctx.completeTrial({ mistakes, stamps: mistakes === 0 ? ['on-time'] : [] });
    } else {
      actions.replaceChildren(next);
      next.focus();
      ctx.say('Green signal. On to the next timetable.');
    }
    wonTimer = window.setTimeout(() => (boardSlot.dataset.won = 'false'), 1600);
  };

  const root = h('div', { class: 'rail-trial' },
    h('div', { class: 'quiz-head' }, heading, dots),
    brief, boardSlot, feedback, actions);
  host.append(root);
  mount();
  return () => {
    clearTimeout(wonTimer);
    root.remove();
  };
};
