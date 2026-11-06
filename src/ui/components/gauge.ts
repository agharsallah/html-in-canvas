/**
 * Light meter: a needle gauge, like the exposure meter on an old camera.
 * Shows a single value in [0, 1] with a big number and a caption. Used for
 * progress toward the next rank.
 */
import { arcPath, polar, s } from '../charts/svg';
import { h } from '../dom';

export interface Gauge {
  readonly el: HTMLElement;
  update(value: number, number: string, caption: string): void;
}

const SWEEP = 200;

export function createGauge(label: string): Gauge {
  const needle = s('line', { x1: 60, y1: 62, x2: 60, y2: 18, class: 'gauge-needle' });
  const fill = s('path', { class: 'gauge-fill', fill: 'none' });
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = -SWEEP / 2 + (i / 10) * SWEEP;
    const [x1, y1] = polar(60, 62, 50, a);
    const [x2, y2] = polar(60, 62, i % 5 === 0 ? 42 : 46, a);
    return s('line', { x1, y1, x2, y2, class: 'gauge-tick' });
  });
  const svg = s('svg', { viewBox: '0 0 120 76', class: 'gauge-svg', 'aria-hidden': 'true' },
    s('path', { d: arcPath(60, 62, 54, -SWEEP / 2, SWEEP / 2), class: 'gauge-track', fill: 'none' }),
    fill, ...ticks, needle, s('circle', { cx: 60, cy: 62, r: 5, class: 'gauge-hub' }));
  const number = h('span', { class: 'gauge-number' });
  const caption = h('span', { class: 'gauge-caption' });
  const el = h('div', { class: 'ui-gauge', role: 'meter', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100' },
    svg, h('span', { class: 'gauge-text' }, number, caption));

  return {
    el,
    update(value, numberText, captionText) {
      const v = Math.min(1, Math.max(0, value));
      const angle = -SWEEP / 2 + v * SWEEP;
      needle.setAttribute('transform', `rotate(${angle} 60 62)`);
      fill.setAttribute('d', v <= 0.001 ? '' : arcPath(60, 62, 54, -SWEEP / 2, angle));
      number.textContent = numberText;
      caption.textContent = captionText;
      el.setAttribute('aria-valuenow', String(Math.round(v * 100)));
      el.setAttribute('aria-valuetext', `${numberText}, ${captionText}`);
    },
  };
}
