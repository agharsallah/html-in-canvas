/**
 * The Practice frame: a row of exercise tabs and the active exercise.
 * Drafts survive switching tabs; solved results are saved in the game state.
 */
import type { GameStore } from '../../game/store';
import { h } from '../../ui/dom';
import type { Exercise } from './exercise';
import { mountExerciseView } from './exercise-view';

export interface PracticeOptions {
  exercises: Exercise[];
  store: GameStore;
  titleOf(conceptId: string): string | undefined;
  openConcept(id: string): void;
  say(text: string): void;
  /** Called once every exercise is solved; `byHand` is false if any was revealed. */
  onAllSolved(byHand: boolean): void;
}

export function mountPractice(host: HTMLElement, o: PracticeOptions): () => void {
  const drafts = new Map<string, string>();
  const view = h('div', { class: 'practice-view' });
  const solvedState = () => o.store.getState().exercises;
  let teardown = () => {};
  let active = Math.max(0, o.exercises.findIndex((ex) => !solvedState()[ex.id]));

  const tabs = o.exercises.map((ex, i) =>
    h('button', { type: 'button', class: 'practice-tab', role: 'tab', onclick: () => show(i) },
      h('span', { class: 'practice-tab-badge', 'aria-hidden': 'true' }), ex.title));
  const tabList = h('div', { class: 'practice-tabs', role: 'tablist', 'aria-label': 'Exercises' }, ...tabs);

  const refreshTabs = () => tabs.forEach((tab, i) => {
    const solved = !!solvedState()[o.exercises[i]!.id];
    tab.dataset.solved = String(solved);
    tab.querySelector('.practice-tab-badge')!.textContent = solved ? '✓' : String(i + 1);
    tab.setAttribute('aria-selected', String(i === active));
    tab.tabIndex = i === active ? 0 : -1;
  });

  tabList.addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    const next = (active + step + tabs.length) % tabs.length;
    show(next);
    tabs[next]!.focus();
  });

  const show = (index: number) => {
    teardown();
    active = index;
    refreshTabs();
    const exercise = o.exercises[index]!;
    teardown = mountExerciseView(view, {
      exercise,
      position: `Exercise ${index + 1} of ${o.exercises.length}`,
      draft: drafts.get(exercise.id),
      solved: !!solvedState()[exercise.id],
      conceptTitle: o.titleOf(exercise.seenIn),
      onDraft: (code) => drafts.set(exercise.id, code),
      onOpenConcept: o.openConcept,
      say: o.say,
      onNext: index < o.exercises.length - 1 ? () => show(index + 1) : undefined,
      onSolved: (revealed) => {
        o.store.dispatch({ type: 'solve-exercise', id: exercise.id, revealed });
        refreshTabs();
        const results = o.exercises.map((ex) => solvedState()[ex.id]);
        if (results.every(Boolean)) o.onAllSolved(results.every((r) => r === 'hand'));
      },
    });
  };

  host.append(tabList, view);
  show(active);
  return () => teardown();
}
