/**
 * Buttons. Flat paper with a hard offset shadow that "lifts" on hover and
 * presses flat on click. Three variants, one size scale, used everywhere.
 */
import { h } from '../dom';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonOptions {
  label: string | Node;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  /** Small trailing hint such as a keyboard shortcut. */
  kbd?: string;
  onClick?: (event: MouseEvent) => void;
  attrs?: Record<string, string>;
}

export function button({ label, variant = 'secondary', size = 'md', kbd, onClick, attrs = {} }: ButtonOptions): HTMLButtonElement {
  const el = h('button', { type: 'button', class: `ui-button`, 'data-variant': variant, 'data-size': size, ...attrs },
    h('span', { class: 'ui-button-label' }, label),
    kbd ? h('kbd', { class: 'ui-kbd', 'aria-hidden': 'true' }, kbd) : null);
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

/** Swap a button's visual weight, e.g. when the next step becomes the obvious one. */
export function setVariant(el: HTMLButtonElement, variant: ButtonVariant): void {
  el.dataset.variant = variant;
}

export function setLabel(el: HTMLButtonElement, label: string): void {
  const slot = el.querySelector('.ui-button-label');
  if (slot) slot.textContent = label;
}
