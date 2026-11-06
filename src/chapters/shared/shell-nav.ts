/**
 * The chapter's bottom bar: Caret's remark on the left; on the right, a cue
 * about what is left to do here and the Back / Continue buttons. Always
 * visible, so moving through a roll never needs a hunt for the next step.
 */
import { FRAMES, FRAME_SILVER, type FrameId } from '../../game/state';
import { button, setLabel, setVariant } from '../../ui/components/button';
import { createAvatar } from '../../ui/caret';
import { h, rich } from '../../ui/dom';
import { FRAME_LABELS, type Speaker } from './chapter';

const TODO: Record<FrameId, string> = {
  story: `Read to the end to earn ${FRAME_SILVER.story} silver.`,
  lab: `Meet every goal to earn ${FRAME_SILVER.lab} silver.`,
  practice: `Solve every exercise to earn ${FRAME_SILVER.practice} silver.`,
  trial: 'Pass the trial to develop the next print.',
};

export interface ShellNav {
  readonly el: HTMLElement;
  say(text: string, speaker?: Speaker): void;
  update(frame: FrameId, done: readonly FrameId[]): void;
}

export function createShellNav(go: (frame: FrameId) => void, exit: () => void): ShellNav {
  const remark = h('p', { class: 'chapter-remark-text', 'aria-live': 'polite' });
  const cue = h('p', { class: 'chapter-cue' });
  let current: FrameId = 'story';

  const offset = (delta: number): FrameId | undefined => FRAMES[FRAMES.indexOf(current) + delta];
  const back = button({ label: 'Back', variant: 'ghost', onClick: () => {
    const prev = offset(-1);
    if (prev) go(prev);
  } });
  const next = button({ label: 'Continue', variant: 'secondary', onClick: () => {
    const following = offset(1);
    if (following) go(following);
    else exit();
  } });

  const el = h('footer', { class: 'chapter-remark' },
    h('div', { class: 'chapter-remark-voice' }, createAvatar('caret'), remark),
    h('div', { class: 'chapter-nav' }, cue, h('div', { class: 'chapter-nav-buttons' }, back, next)));

  return {
    el,
    say(text, speaker = 'caret') {
      remark.dataset.speaker = speaker;
      remark.replaceChildren(rich(text));
    },
    update(frame, done) {
      current = frame;
      const isDone = done.includes(frame);
      const prev = offset(-1);
      const following = offset(1);
      back.hidden = !prev;
      if (prev) setLabel(back, `Back to ${FRAME_LABELS[prev]}`);
      setLabel(next, following ? `Continue to ${FRAME_LABELS[following]}` : 'Back to the darkroom');
      setVariant(next, isDone ? 'primary' : 'secondary');
      cue.dataset.done = String(isDone);
      cue.textContent = isDone ? `${FRAME_LABELS[frame]} developed.` : TODO[frame];
    },
  };
}
