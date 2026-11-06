/**
 * The clockwork lab's control panel: pick the paint timing option, Option
 * A's sub-option, and the events to inject into frame 1.
 */
import { createSegmented } from '../../ui/components/segmented';
import { createToggle } from '../../ui/components/toggle';
import { h, rich } from '../../ui/dom';
import type { AMode, InjectId, OptionId } from './rules';

export const INJECT_LABELS: Record<InjectId, string> = {
  'raf-edit': 'A `requestAnimationFrame` callback edits #card',
  resize: 'The canvas is resized: a `ResizeObserver` resizes the grid and calls `requestPaint()`',
  'draw-in-paint': '`drawElementImage(card)` inside `paint`',
  'dom-edit-in-paint': 'A DOM edit inside `paint` (once)',
  'request-in-paint': '`requestPaint()` inside `paint`',
  'gl-flush': '`gl.getError()` inside `paint` (WebGL needs a flush)',
  echo: 'Echo: edit the DOM on every `paint`',
};

/** Short names for ledger flags. */
export const INJECT_SHORT: Record<InjectId, string> = {
  'raf-edit': 'rAF edit',
  resize: 'resize',
  'draw-in-paint': 'canvas draw',
  'dom-edit-in-paint': 'DOM edit',
  'request-in-paint': 'requestPaint',
  'gl-flush': 'getError()',
  echo: 'echo',
};

export interface LabSettings {
  option: OptionId;
  aMode: AMode;
  inject: InjectId[];
  nested: boolean;
}

export interface LabControls {
  readonly el: HTMLElement;
  readonly settings: LabSettings;
}

export function createLabControls(initial: LabSettings, onChange: (settings: LabSettings) => void): LabControls {
  const settings: LabSettings = { ...initial, inject: [...initial.inject] };
  const emit = () => onChange({ ...settings, inject: [...settings.inject] });

  const aRow = h('div', { class: 'clock-amode' });
  const option = createSegmented<OptionId>({
    label: 'When paint fires',
    value: settings.option,
    options: [
      { value: 'A', label: 'A · at resize observers' },
      { value: 'B', label: 'B · after Paint, loop' },
      { value: 'C', label: 'C · after Paint, once' },
    ],
    onChange: (value) => {
      settings.option = value;
      aRow.hidden = value !== 'A';
      emit();
    },
  });
  const aMode = createSegmented<AMode>({
    label: 'Option A sub-option',
    value: settings.aMode,
    options: [
      { value: 'placeholders', label: 'Placeholders' },
      { value: 'sync-paint', label: 'Synchronous Paint' },
    ],
    onChange: (value) => {
      settings.aMode = value;
      emit();
    },
  });
  aRow.append(h('p', { class: 'panel-help' }, 'Option A has no snapshot yet. How does it fake one?'), aMode.el);
  aRow.hidden = settings.option !== 'A';

  const chips = (Object.keys(INJECT_LABELS) as InjectId[]).map((id) => createToggle({
    kind: 'switch',
    label: h('span', {}, rich(INJECT_LABELS[id])),
    checked: settings.inject.includes(id),
    onChange: (on) => {
      settings.inject = on ? [...settings.inject, id] : settings.inject.filter((x) => x !== id);
      emit();
    },
  }).el);
  const nested = createToggle({
    kind: 'switch',
    label: 'Nest a drawable canvas inside the lab canvas',
    checked: settings.nested,
    onChange: (on) => {
      settings.nested = on;
      emit();
    },
  });

  const el = h('div', { class: 'panel clock-controls' },
    h('h3', { class: 'panel-title' }, 'Where the bell is wired'),
    option.el, aRow,
    h('h3', { class: 'panel-title' }, 'Inject into frame 1'),
    h('p', { class: 'panel-help' }, rich('The lab calls `requestPaint()` once before frame 1, so your handler runs at least once.')),
    h('div', { class: 'clock-injects' }, ...chips, nested.el));
  return { el, settings };
}
