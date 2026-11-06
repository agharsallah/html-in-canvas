/**
 * The story frame: dialogue on the left, a growing notebook of concept cards
 * on the right. Typewriter text (skipped under reduced motion). Back and Next
 * buttons, plus the arrow keys, move through the lines at your own pace.
 */
import type { Diorama, StoryLine } from '../chapters/shared/chapter';
import { createAvatar, speakerName } from './caret';
import { button, setLabel, setVariant } from './components/button';
import { renderConcept } from './concept-card';
import { h, prefersReducedMotion, rich } from './dom';

export interface DialogueOptions {
  lines: StoryLine[];
  foeName: string;
  /** Builds the chapter's 3D scene into the stage, if it has one. */
  diorama?: (host: HTMLElement) => Diorama;
  onFinish(): void;
}

export function mountDialogue(host: HTMLElement, { lines, foeName, diorama, onFinish }: DialogueOptions): () => void {
  let index = 0;
  let typing: number | null = null;
  const pinned = new Set<number>();

  const avatarSlot = h('div', { class: 'dialogue-avatar' });
  const name = h('p', { class: 'dialogue-name' });
  const text = h('p', { class: 'dialogue-text', 'aria-live': 'polite' });
  const progress = h('div', { class: 'dialogue-progress', 'aria-hidden': 'true' },
    ...lines.map(() => h('span')));
  const counter = h('p', { class: 'dialogue-counter' });
  const notebook = h('div', { class: 'notebook', 'aria-label': 'Concepts so far' },
    h('p', { class: 'notebook-empty' }, 'Concepts appear here as the story introduces them.'));

  const back = button({ label: 'Back', variant: 'ghost', onClick: () => go(-1) });
  const next = button({ label: 'Next', variant: 'primary', kbd: '→', onClick: () => go(1) });

  const sceneHost = h('div', { class: 'story-scene' });
  host.append(h('div', { class: 'story', 'data-has-scene': String(!!diorama) },
    h('div', { class: 'story-stage' },
      diorama ? sceneHost : null,
      h('div', { class: 'dialogue' }, avatarSlot,
        h('div', { class: 'dialogue-body' }, name, text,
          h('div', { class: 'dialogue-controls' }, back, next, counter), progress))),
    notebook));
  const scene = diorama?.(sceneHost);

  const finishTyping = (full: string) => {
    if (typing !== null) cancelAnimationFrame(typing);
    typing = null;
    text.replaceChildren(rich(full));
  };

  const type = (full: string) => {
    if (prefersReducedMotion()) return finishTyping(full);
    const started = performance.now();
    const step = () => {
      const count = Math.floor((performance.now() - started) / 16);
      if (count >= full.length) return finishTyping(full);
      text.textContent = full.slice(0, count);
      typing = requestAnimationFrame(step);
    };
    typing = requestAnimationFrame(step);
  };

  const show = () => {
    const line = lines[index]!;
    avatarSlot.replaceChildren(createAvatar(line.speaker, foeName));
    name.textContent = speakerName(line.speaker, foeName);
    text.dataset.speaker = line.speaker;
    counter.textContent = `${index + 1} of ${lines.length}`;
    [...progress.children].forEach((dot, i) => ((dot as HTMLElement).dataset.state = i < index ? 'seen' : i === index ? 'current' : 'next'));
    back.hidden = index === 0;
    const last = index === lines.length - 1;
    setLabel(next, last ? 'Finish the story' : 'Next');
    setVariant(next, 'primary');
    if (line.concept && !pinned.has(index)) {
      pinned.add(index);
      notebook.querySelector('.notebook-empty')?.remove();
      const card = renderConcept(line.concept);
      card.dataset.fresh = 'true';
      notebook.querySelectorAll('[data-fresh]').forEach((c) => c.removeAttribute('data-fresh'));
      notebook.prepend(card);
    }
    type(line.text);
    scene?.onLine?.(index, lines.length);
  };

  const go = (delta: number) => {
    if (delta > 0 && typing !== null) return finishTyping(lines[index]!.text);
    if (delta > 0 && index === lines.length - 1) return onFinish();
    index = Math.min(lines.length - 1, Math.max(0, index + delta));
    show();
  };

  const onKey = (event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, [contenteditable], dialog[open]')) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'ArrowRight') go(1);
    if (event.key === 'ArrowLeft') go(-1);
  };
  window.addEventListener('keydown', onKey);

  show();
  next.focus({ preventScroll: true });
  return () => {
    window.removeEventListener('keydown', onKey);
    if (typing !== null) cancelAnimationFrame(typing);
    scene?.destroy();
  };
}
