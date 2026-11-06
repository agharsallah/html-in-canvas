/**
 * Dial: a rotary knob, like the focus ring on an enlarger lens.
 * ARIA slider: arrow keys step, Page keys jump, Home/End go to the ends,
 * and you can drag around the knob with a pointer.
 */
import { s, arcPath, polar } from '../charts/svg';
import { h } from '../dom';

export interface DialOptions {
  label: string;
  min: number;
  max: number;
  value: number;
  step?: number;
  unit?: string;
  onInput?: (value: number) => void;
}

export interface Dial {
  readonly el: HTMLElement;
  readonly value: number;
  set(value: number): void;
}

const SWEEP = 270; // degrees of travel, from -135 to +135

export function createDial({ label, min, max, value, step = 1, unit = '', onInput }: DialOptions): Dial {
  let current = value;
  const toAngle = (v: number) => -SWEEP / 2 + ((v - min) / (max - min)) * SWEEP;

  const ticks = Array.from({ length: 19 }, (_, i) => {
    const a = -SWEEP / 2 + (i / 18) * SWEEP;
    const [x1, y1] = polar(50, 50, 44, a);
    const [x2, y2] = polar(50, 50, i % 3 === 0 ? 38 : 41, a);
    return s('line', { x1, y1, x2, y2, class: 'dial-tick' });
  });
  const fill = s('path', { class: 'dial-fill', fill: 'none' });
  const indicator = s('line', { x1: 50, y1: 50, x2: 50, y2: 22, class: 'dial-indicator' });
  const knob = s('g', { class: 'dial-knob' }, s('circle', { cx: 50, cy: 50, r: 30 }), indicator);
  const svg = s('svg', { viewBox: '0 0 100 100', class: 'dial-svg', 'aria-hidden': 'true' },
    ...ticks, s('path', { d: arcPath(50, 50, 47, -SWEEP / 2, SWEEP / 2), class: 'dial-track', fill: 'none' }), fill, knob);
  const readout = h('span', { class: 'dial-readout' });

  const control = h('div', {
    class: 'dial-control', role: 'slider', tabindex: '0', 'aria-label': label,
    'aria-valuemin': String(min), 'aria-valuemax': String(max),
  }, svg);
  const el = h('div', { class: 'ui-dial' }, control, h('div', { class: 'dial-text' }, h('span', { class: 'dial-label' }, label), readout));

  const render = () => {
    const angle = toAngle(current);
    knob.setAttribute('transform', `rotate(${angle} 50 50)`);
    fill.setAttribute('d', current === min ? '' : arcPath(50, 50, 47, -SWEEP / 2, angle));
    readout.textContent = `${current}${unit}`;
    control.setAttribute('aria-valuenow', String(current));
    control.setAttribute('aria-valuetext', `${current}${unit}`);
  };

  const decimals = (String(step).split('.')[1] ?? '').length;
  const set = (next: number, emit = true) => {
    // Round to the step's decimals: 48 * 0.05 is 2.4000000000000004.
    const snapped = Number((Math.round(Math.min(max, Math.max(min, next)) / step) * step).toFixed(decimals));
    if (snapped === current) return;
    current = snapped;
    render();
    if (emit) onInput?.(current);
  };

  control.addEventListener('keydown', (event) => {
    const big = (max - min) / 10;
    const delta = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big }[event.key];
    if (delta !== undefined) set(current + delta);
    else if (event.key === 'Home') set(min);
    else if (event.key === 'End') set(max);
    else return;
    event.preventDefault();
  });

  const fromPointer = (event: PointerEvent) => {
    const rect = svg.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 at top, clockwise
    const clamped = Math.max(-SWEEP / 2, Math.min(SWEEP / 2, angle));
    set(min + ((clamped + SWEEP / 2) / SWEEP) * (max - min));
  };
  control.addEventListener('pointerdown', (event) => {
    control.setPointerCapture(event.pointerId);
    control.focus();
    fromPointer(event);
  });
  control.addEventListener('pointermove', (event) => {
    if (control.hasPointerCapture(event.pointerId)) fromPointer(event);
  });

  render();
  return {
    el,
    get value() {
      return current;
    },
    set: (next) => set(next, false),
  };
}
