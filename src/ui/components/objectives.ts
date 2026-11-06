/**
 * Goals: a small checklist that tells you what to try in a lab and ticks
 * itself off as you do it. Fires once when every goal is met.
 */
import { h, rich } from '../dom';

export interface Objective {
  id: string;
  text: string;
}

export interface Objectives {
  readonly el: HTMLElement;
  complete(id: string): void;
  isDone(id: string): boolean;
  readonly allDone: boolean;
}

export function createObjectives(items: Objective[], onAllDone: () => void): Objectives {
  const done = new Set<string>();
  const count = h('p', { class: 'ui-objectives-count', 'aria-live': 'polite' });
  const rows = new Map(items.map((item) => [item.id,
    h('li', { class: 'ui-objective', 'data-done': 'false' },
      h('span', { class: 'ui-objective-box', 'aria-hidden': 'true' }),
      h('span', {}, rich(item.text)))]));

  const el = h('section', { class: 'ui-objectives', 'aria-label': 'Goals' },
    h('div', { class: 'ui-objectives-head' }, h('h3', {}, 'Goals'), count),
    h('ul', {}, ...rows.values()));

  const render = () => {
    count.textContent = `${done.size} of ${items.length} done`;
  };
  render();

  return {
    el,
    complete(id) {
      const row = rows.get(id);
      if (!row || done.has(id)) return;
      done.add(id);
      row.dataset.done = 'true';
      row.querySelector('.ui-objective-box')?.setAttribute('aria-label', 'done');
      render();
      if (done.size === items.length) onAllDone();
    },
    isDone: (id) => done.has(id),
    get allDone() {
      return done.size === items.length;
    },
  };
}
