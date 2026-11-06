/**
 * Segmented control: pick exactly one of a few values. Implements the ARIA
 * radio group pattern with a roving tabindex and arrow-key navigation.
 */
import { h } from '../dom';

export interface SegmentOption<T extends string> {
  value: T;
  label: string | Node;
}

export interface SegmentedOptions<T extends string> {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange?: (value: T) => void;
}

export interface Segmented<T extends string> {
  readonly el: HTMLElement;
  readonly value: T;
  set(value: T, silent?: boolean): void;
}

export function createSegmented<T extends string>({ label, options, value, onChange }: SegmentedOptions<T>): Segmented<T> {
  let current = value;
  const buttons = options.map((option) =>
    h('button', { type: 'button', role: 'radio', class: 'ui-segment', 'data-value': option.value }, option.label));
  const el = h('div', { class: 'ui-segmented', role: 'radiogroup', 'aria-label': label }, ...buttons);

  const sync = () => buttons.forEach((b) => {
    const selected = b.dataset.value === current;
    b.setAttribute('aria-checked', String(selected));
    b.tabIndex = selected ? 0 : -1;
  });

  const select = (next: T, focus: boolean, silent = false) => {
    const changed = next !== current;
    current = next;
    sync();
    if (focus) buttons.find((b) => b.dataset.value === next)?.focus();
    if (changed && !silent) onChange?.(next);
  };

  buttons.forEach((b, i) => {
    b.addEventListener('click', () => select(b.dataset.value as T, false));
    b.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = buttons[(i + step + buttons.length) % buttons.length]!;
      select(next.dataset.value as T, true);
    });
  });
  sync();

  return {
    el,
    get value() {
      return current;
    },
    set: (next, silent = false) => select(next, false, silent),
  };
}
