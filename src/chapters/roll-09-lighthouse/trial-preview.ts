/**
 * What eyes see on the tide board: the pie, its labels, the jelly slider and
 * its readout. Purely visual (aria-hidden): the point of the trial is that
 * this picture is NOT what a screen reader or a keyboard meets.
 */
import { polar, s } from '../../ui/charts/svg';
import { h } from '../../ui/dom';

const WEDGES = [
  { name: 'Dawn', value: 0.45, color: '#1f7a9c' },
  { name: 'Noon', value: 0.35, color: '#e9b44c' },
  { name: 'Dusk', value: 0.2, color: '#e76f51' },
];

export function tidePreview(): HTMLElement {
  const cx = 110;
  const cy = 110;
  const r = 92;
  let angle = 0;
  const parts: SVGElement[] = [];
  for (const wedge of WEDGES) {
    const sweep = wedge.value * 360;
    const [x1, y1] = polar(cx, cy, r, angle);
    const [x2, y2] = polar(cx, cy, r, angle + sweep);
    const large = sweep > 180 ? 1 : 0;
    parts.push(s('path', { d: `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`, fill: wedge.color, class: 'tide-wedge' }));
    const [lx, ly] = polar(cx, cy, r * 0.6, angle + sweep / 2);
    parts.push(s('text', { x: lx.toFixed(1), y: (ly - 4).toFixed(1), 'text-anchor': 'middle', class: 'tide-val' }, `${Math.round(wedge.value * 100)}%`));
    parts.push(s('text', { x: lx.toFixed(1), y: (ly + 12).toFixed(1), 'text-anchor': 'middle', class: 'tide-name' }, wedge.name));
    angle += sweep;
  }
  const svg = s('svg', { viewBox: '0 0 420 230', class: 'tide-svg', 'aria-hidden': 'true' },
    ...parts,
    // The jelly slider, drawn by "the shader"; the real input sits on top at opacity 0.
    s('rect', { x: 240, y: 60, width: 160, height: 22, rx: 11, class: 'tide-track' }),
    s('rect', { x: 240, y: 60, width: 112, height: 22, rx: 11, class: 'tide-jelly' }),
    s('text', { x: 320, y: 112, 'text-anchor': 'middle', class: 'tide-readout' }, '70%'),
    s('text', { x: 320, y: 46, 'text-anchor': 'middle', class: 'tide-name' }, 'Tide height'),
    s('rect', { x: 240, y: 140, width: 160, height: 66, rx: 8, class: 'tide-ghost' }),
    s('text', { x: 320, y: 178, 'text-anchor': 'middle', class: 'tide-ghost-text' }, 'Yesterday: not drawn'));
  return h('div', { class: 'tide-preview' }, svg);
}
