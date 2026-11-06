/**
 * The chapter shell: themed sheet with a frame stepper, the notebook drawer,
 * the active frame, and the bottom navigation bar. It owns rewards for frame
 * completion; chapters only provide content.
 */
import type { Capabilities } from '../../core/capabilities';
import type { GameStore } from '../../game/store';
import { framesDone, FRAMES, type FrameId } from '../../game/state';
import { nextRoll, type Roll } from '../../story/rolls';
import { button } from '../../ui/components/button';
import { createFilmstrip } from '../../ui/components/filmstrip';
import { stampBadge } from '../../ui/components/stamp-badge';
import { mountDialogue } from '../../ui/dialogue';
import { h, rich } from '../../ui/dom';
import { conceptsOf, FRAME_LABELS, type BeatContext, type ChapterModule } from './chapter';
import { createNotebook } from './notebook';
import { mountPractice } from './practice';
import { createShellNav } from './shell-nav';

export interface ShellOptions {
  roll: Roll;
  module: ChapterModule;
  caps: Capabilities;
  store: GameStore;
  frame: FrameId;
  onClose(): void;
  /** The wordmark was clicked: back to the main darkroom view. */
  onHome?(): void;
  onFrameChange(frame: FrameId): void;
}

export interface ChapterShell {
  showFrame(frame: FrameId): void;
  destroy(): void;
}

const ENTRY_REMARK: Record<FrameId, string> = {
  story: 'Read along. Each concept you meet is pinned to the notebook on the right.',
  lab: 'Experiment freely. Nothing in a lab can break. The goals tell you what to try.',
  practice: 'Time to write it yourself. Stuck? The notebook has every pattern you have seen.',
  trial: 'Show me what you know. Mistakes cost nothing but pride.',
};

export function mountChapterShell(root: HTMLElement, options: ShellOptions): ChapterShell {
  const { roll, module, store } = options;
  let teardownBeat: () => void = () => {};
  let current: FrameId = options.frame;

  const backdrop = h('div', { class: 'chapter-backdrop', 'aria-hidden': 'true' });
  const stage = h('div', { class: 'chapter-stage' });
  const section = h('section', { class: 'chapter', 'data-roll': roll.id, 'aria-labelledby': 'chapter-title' }, backdrop);
  for (const [key, value] of Object.entries(roll.process)) section.style.setProperty(`--${key}`, value);
  // The drawer lives inside the section so it inherits the roll's colours.
  const notebook = createNotebook(section, conceptsOf(module));
  const stepper = createFilmstrip(FRAMES.map((id) => ({ id, label: FRAME_LABELS[id] })), 'Frames of this roll', (id) => options.onFrameChange(id as FrameId));
  const nav = createShellNav((frame) => options.onFrameChange(frame), options.onClose);

  section.append(
    h('header', { class: 'chapter-head' },
      h('div', { class: 'chapter-heading' },
        h('a', {
          class: 'chapter-wordmark', href: '#/', 'aria-label': 'Drawable: back to the darkroom',
          onclick: (e: Event) => {
            const event = e as MouseEvent;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            (options.onHome ?? options.onClose)();
          },
        }, 'Drawable'),
        h('p', { class: 'chapter-edge' }, `Frame ${roll.frame}`, h('span', {}, roll.process.name)),
        h('h1', { id: 'chapter-title', class: 'chapter-title' }, roll.title)),
      stepper.el,
      h('div', { class: 'chapter-tools' }, notebook.trigger,
        button({ label: 'Leave roll', variant: 'ghost', size: 'sm', onClick: options.onClose }))),
    stage,
    nav.el);
  root.append(section);
  const teardownBackdrop = module.backdrop?.(backdrop) ?? (() => {});

  const complete = (frame: FrameId) => store.dispatch({ type: 'complete-frame', roll: roll.id, frame });
  const refresh = () => {
    const done = framesDone(store.getState(), roll.id);
    stepper.update(current, done);
    nav.update(current, done);
  };
  const unsubscribe = store.onChange(refresh);

  const ctx: BeatContext = {
    caps: options.caps,
    roll,
    say: nav.say,
    stamp: (id) => store.dispatch({ type: 'earn-stamp', id }),
    collect: (id) => store.dispatch({ type: 'collect-negative', id }),
    completeLab: () => complete('lab'),
    completeTrial: (result) => {
      complete('trial');
      if (result.mistakes === 0) ctx.stamp('clean-exposure');
      result.stamps?.forEach(ctx.stamp);
      showFinale();
    },
    openConcept: (id) => notebook.open(id),
    progress: () => store.getState(),
  };

  const brief = (text: string) => h('p', { class: 'beat-brief', tabindex: '-1' }, rich(text));

  const mountBeat = (frame: FrameId, host: HTMLElement): (() => void) => {
    if (frame === 'story') {
      return mountDialogue(host, {
        lines: module.story,
        foeName: roll.foe,
        diorama: module.diorama ? (sceneHost) => module.diorama!(sceneHost, roll) : undefined,
        onFinish: () => {
          complete('story');
          options.onFrameChange('lab');
        },
      });
    }
    const intro = brief(frame === 'lab' ? module.labBrief : frame === 'practice' ? module.practiceBrief : module.trialBrief);
    const mount = h('div', { class: 'beat-mount' });
    host.append(intro, mount);
    queueMicrotask(() => intro.focus({ preventScroll: true }));
    if (frame === 'practice') {
      return mountPractice(mount, {
        exercises: module.exercises,
        store,
        titleOf: notebook.titleOf,
        openConcept: (id) => notebook.open(id),
        say: nav.say,
        onAllSolved: (byHand) => {
          complete('practice');
          if (byHand) ctx.stamp('hand-written');
          nav.say('Every exercise developed. The trial is waiting.');
        },
      });
    }
    return (frame === 'lab' ? module.lab : module.trial)(mount, ctx);
  };

  const showFrame = (frame: FrameId) => {
    teardownBeat();
    current = frame;
    stage.replaceChildren();
    stage.scrollTop = 0;
    section.dataset.frame = frame;
    const host = h('div', { class: 'beat', 'data-beat': frame });
    stage.append(host);
    nav.say(ENTRY_REMARK[frame]);
    teardownBeat = mountBeat(frame, host);
    refresh();
  };

  const showFinale = () => {
    teardownBeat();
    teardownBeat = () => {};
    const next = nextRoll(roll.id);
    const state = store.getState();
    const solved = module.exercises.filter((ex) => state.exercises[ex.id]);
    const byHand = solved.filter((ex) => state.exercises[ex.id] === 'hand').length;
    const back = button({ label: 'Back to the darkroom', variant: 'primary', onClick: options.onClose });
    const stat = (value: string, label: string) => h('div', { class: 'finale-stat' }, h('strong', {}, value), h('span', {}, label));
    stage.replaceChildren(h('div', { class: 'finale' },
      stampBadge({ text: `Developed ${roll.title}`, center: 'check', earned: true, size: 168, press: true }),
      h('p', { class: 'finale-kicker' }, 'Roll developed'),
      h('h2', { class: 'finale-title' }, roll.title),
      h('div', { class: 'finale-stats' },
        stat(`${framesDone(state, roll.id).length}/${FRAMES.length}`, 'frames developed'),
        stat(`${byHand}/${module.exercises.length}`, 'exercises by hand'),
        stat(String(state.silver), 'silver in total')),
      h('p', {}, next ? `A new print is developing on the wire: “${next.title}”.` : 'That was the last roll. For now.'),
      back));
    back.focus();
    nav.say(`You beat ${roll.foe}. Go and watch the next print develop.`);
  };

  showFrame(options.frame);

  return {
    showFrame,
    destroy() {
      teardownBeat();
      teardownBackdrop();
      unsubscribe();
      notebook.destroy();
      section.remove();
    },
  };
}
