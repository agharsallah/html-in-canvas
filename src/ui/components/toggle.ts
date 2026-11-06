/**
 * Toggles: one implementation, three looks.
 *
 *  switch   — on/off settings ("spin the gear"). role="switch".
 *  checkbox — pick-many answers, drawn as a card row. role="checkbox".
 *  chip     — an attribute you can add to code ("drawable"). aria-pressed.
 *
 * Each is a single <button>, so it is focusable, labelled by its own text,
 * and toggles with Space or Enter. No native inputs to restyle.
 */
import { h } from '../dom';

export type ToggleKind = 'switch' | 'checkbox' | 'chip';

export interface ToggleOptions {
  label: string | Node;
  kind?: ToggleKind;
  checked?: boolean;
  /** Secondary line under the label (checkbox kind). */
  description?: string | Node;
  onChange?: (checked: boolean) => void;
  id?: string;
}

export interface Toggle {
  readonly el: HTMLButtonElement;
  readonly checked: boolean;
  set(checked: boolean, silent?: boolean): void;
  setDisabled(disabled: boolean): void;
}

export function createToggle({ label, kind = 'switch', checked = false, description, onChange, id }: ToggleOptions): Toggle {
  const state = { checked };
  const stateAttr = kind === 'chip' ? 'aria-pressed' : 'aria-checked';
  const role = kind === 'chip' ? null : kind;

  const indicator = kind === 'switch'
    ? h('span', { class: 'ui-switch-track', 'aria-hidden': 'true' }, h('span', { class: 'ui-switch-thumb' }))
    : h('span', { class: `ui-${kind}-box`, 'aria-hidden': 'true' });

  const text = h('span', { class: 'ui-toggle-text' },
    h('span', { class: 'ui-toggle-label' }, label),
    description ? h('span', { class: 'ui-toggle-description' }, description) : null);

  const el = h('button', { type: 'button', class: `ui-toggle ui-${kind}`, role, id, [stateAttr]: String(checked) },
    indicator, text);

  const apply = () => el.setAttribute(stateAttr, String(state.checked));

  el.addEventListener('click', () => {
    state.checked = !state.checked;
    apply();
    onChange?.(state.checked);
  });

  return {
    el,
    get checked() {
      return state.checked;
    },
    set(value, silent = false) {
      if (value === state.checked) return;
      state.checked = value;
      apply();
      if (!silent) onChange?.(value);
    },
    setDisabled(disabled) {
      el.disabled = disabled;
    },
  };
}
