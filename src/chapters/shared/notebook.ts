/**
 * The notebook drawer: every concept of the roll, reachable from any frame.
 * A modal <dialog> gives focus containment and Escape-to-close for free.
 */
import { button } from '../../ui/components/button';
import { renderConcept } from '../../ui/concept-card';
import { GUIDE } from '../../guide/meta';
import { h } from '../../ui/dom';
import type { ConceptCard } from './chapter';

export interface Notebook {
  readonly trigger: HTMLButtonElement;
  open(conceptId?: string): void;
  titleOf(conceptId: string): string | undefined;
  destroy(): void;
}

export function createNotebook(root: HTMLElement, concepts: ConceptCard[]): Notebook {
  const list = h('div', { class: 'drawer-list' }, ...concepts.map((c) => renderConcept(c, 'h4')));
  const dialog = h('dialog', { class: 'drawer', 'aria-labelledby': 'notebook-title' },
    h('header', { class: 'drawer-head' },
      h('h3', { id: 'notebook-title' }, 'Notebook'),
      h('p', { class: 'drawer-sub' }, `${concepts.length} concepts in this roll. `,
        // A reference to keep beside the story, so it opens beside it.
        h('a', { class: 'drawer-guide', href: GUIDE.href, target: '_blank', rel: 'noopener' },
          `All ${GUIDE.concepts} in the ${GUIDE.name.toLowerCase()}`,
          h('span', { 'aria-hidden': 'true' }, ' ↗'),
          h('span', { class: 'visually-hidden' }, ' (opens in a new tab)'))),
      button({ label: 'Close', variant: 'ghost', size: 'sm', onClick: () => dialog.close() })),
    list);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // click on the backdrop
  });
  root.append(dialog);

  const trigger = button({
    label: `Notebook (${concepts.length})`, variant: 'secondary', size: 'sm',
    attrs: { 'aria-haspopup': 'dialog' },
    onClick: () => open(),
  });

  const open = (conceptId?: string) => {
    dialog.showModal();
    const target = conceptId ? list.querySelector<HTMLElement>(`#concept-${CSS.escape(conceptId)}`) : null;
    list.querySelectorAll('[data-highlight]').forEach((el) => el.removeAttribute('data-highlight'));
    if (target) {
      target.dataset.highlight = 'true';
      target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
    }
  };

  return {
    trigger,
    open,
    titleOf: (id) => concepts.find((c) => c.id === id)?.title,
    destroy: () => dialog.remove(),
  };
}
