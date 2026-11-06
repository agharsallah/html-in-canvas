/**
 * Feedback effects: one place that listens for good news and bad news and
 * answers with sound and HTML-in-Canvas confetti.
 *
 * It watches the UI instead of being called from every chapter:
 *  - a lab goal ticked off (`.ui-objective[data-done=true]`): chime, small burst;
 *  - a success callout appearing (quiz answers, trials, exercises): arpeggio, burst;
 *  - an error callout appearing: a soft low nudge;
 *  - a frame completed (from the game store): fanfare, big burst.
 * Controls inside chapters tick quietly. Feedback that is merely re-rendered
 * when a frame opens (revisiting a solved exercise) is ignored.
 */
import type { GameStore } from '../../game/store';
import type { GameState } from '../../game/state';
import { mountConfetti, type Palette } from './confetti';
import { play } from './sound';

const QUIET_AFTER_NAVIGATION_MS = 700;

export function mountFeedbackFx(root: HTMLElement, store: GameStore): void {
  const confetti = mountConfetti();
  let navigatedAt = performance.now();
  let bigAt = -Infinity;
  window.addEventListener('hashchange', () => (navigatedAt = performance.now()));
  const settling = () => performance.now() - navigatedAt < QUIET_AFTER_NAVIGATION_MS;

  const palette = (from: Element): Palette => {
    const cs = getComputedStyle(from.closest('.chapter') ?? document.documentElement);
    const read = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
    return { a: read('--accent', '#ff5a36'), b: read('--second', '#2ee6c0'), c: read('--glow', '#ffb547') };
  };
  const burstFrom = (el: Element, power: number, at: 'left' | 'center' = 'center') => {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    confetti.burst(at === 'left' ? r.left + 24 : r.left + r.width / 2, r.top + Math.min(24, r.height / 2), power, palette(el));
  };

  const onCallout = (el: Element) => {
    const kind = el.getAttribute('data-kind');
    if (kind === 'success') {
      play('correct');
      burstFrom(el, 1, 'left');
    } else if (kind === 'error') {
      play('wrong');
    }
  };

  const onGoal = (row: HTMLElement) => {
    const list = row.closest('.ui-objectives');
    const allDone = !!list && [...list.querySelectorAll<HTMLElement>('.ui-objective')].every((r) => r.dataset.done === 'true');
    // The frame-complete fanfare (from the store) already played for the last goal.
    if (performance.now() - bigAt > 250) play('goal');
    burstFrom(row.querySelector('.ui-objective-box') ?? row, allDone ? 0.7 : 0.45);
  };

  new MutationObserver((records) => {
    if (settling()) return;
    for (const record of records) {
      if (record.type === 'attributes') {
        const el = record.target as HTMLElement;
        if (el.classList.contains('ui-objective') && el.dataset.done === 'true' && record.oldValue !== 'true') onGoal(el);
        continue;
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('.ui-callout')) onCallout(node);
        else node.querySelectorAll('.ui-callout[data-kind="success"], .ui-callout[data-kind="error"]').forEach(onCallout);
      }
    }
  }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-done'], attributeOldValue: true });

  // A whole frame developed: the biggest cheer, from the bottom of the screen.
  const framesOf = (state: GameState) => Object.values(state.frames).reduce((n, list) => n + list.length, 0);
  let frames = framesOf(store.getState());
  store.onChange((state) => {
    const next = framesOf(state);
    if (next > frames && !settling()) {
      bigAt = performance.now();
      play('complete');
      const chapter = document.querySelector('.chapter') ?? document.documentElement;
      confetti.burst(innerWidth * 0.3, innerHeight - 40, 1.6, palette(chapter));
      setTimeout(() => confetti.burst(innerWidth * 0.7, innerHeight - 40, 1.6, palette(chapter)), 140);
    }
    frames = next;
  });

  // Controls inside a chapter tick, so a lab feels like a machine.
  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (target.closest('.chapter-stage') && target.closest('button, [role="switch"], [role="radio"], [role="tab"]')) play('tick');
  }, true);
  root.addEventListener('keydown', (event) => {
    if (event.key.startsWith('Arrow') && (event.target as Element).closest?.('.chapter-stage [role="slider"]')) play('tick');
  }, true);
}
