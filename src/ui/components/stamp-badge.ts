/**
 * Rubber stamp: circular text around a glyph, pressed with a slight
 * rotation and an ink-bleed texture. Earned stamps "thunk" onto the page.
 */
import { s } from '../charts/svg';
import { h } from '../dom';
import { glyph, type GlyphName } from './glyphs';

let uid = 0;

export interface StampOptions {
  text: string;
  center: GlyphName;
  earned: boolean;
  size?: number;
  /** Animate the press when it appears. */
  press?: boolean;
}

export function stampBadge({ text, center, earned, size = 120, press = false }: StampOptions): HTMLElement {
  const id = `stamp-path-${uid++}`;
  const ringText = `${text} • `.repeat(Math.max(1, Math.round(28 / (text.length + 3))));
  const svg = s('svg', { viewBox: '0 0 120 120', width: size, height: size, class: 'stamp-svg', 'aria-hidden': 'true' },
    s('defs', {}, s('path', { id, d: 'M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0' })),
    s('circle', { cx: 60, cy: 60, r: 56, class: 'stamp-ring' }),
    s('circle', { cx: 60, cy: 60, r: 33, class: 'stamp-ring stamp-ring-inner' }),
    s('text', { class: 'stamp-text' }, s('textPath', { href: `#${id}`, startOffset: '0' }, ringText)));
  const core = h('span', { class: 'stamp-core' }, glyph(center, size * 0.28));
  return h('span', {
    class: 'stamp-badge', 'data-earned': String(earned), 'data-press': String(press),
    style: `--stamp-size: ${size}px; --stamp-tilt: ${(uid % 5) * 3 - 6}deg`,
  }, svg, core);
}
