/**
 * Glyphs: our own small line icons, drawn on a 24px grid with a 1.75 stroke
 * so they match the 1.5px ink lines of the components.
 */
import { s } from '../charts/svg';

const PATHS: Record<string, string[]> = {
  // frames
  story: ['M5 5h14v10H10l-4 4v-4H5z', 'M8.5 9h7', 'M8.5 12h4.5'],
  lab: ['M9 3h6', 'M10 3v6l-5 9.5A1.5 1.5 0 0 0 6.3 21h11.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3', 'M7.5 15h9'],
  practice: ['M8 7l-5 5 5 5', 'M16 7l5 5-5 5', 'M13.5 4.5l-3 15'],
  trial: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18', 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9', 'M12 11.2v1.6'],
  // concept kinds
  attribute: ['M4 7h7l9 9-4 4-9-9z', 'M7.5 10.5h.01'],
  event: ['M13 2 5 13h6l-1 9 8-11h-6z'],
  method: ['M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3', 'M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3'],
  property: ['M4 6h16', 'M4 12h10', 'M4 18h13'],
  idea: ['M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z'],
  rule: ['M4 19h16', 'M6 19V9', 'M12 19V9', 'M18 19V9', 'M3 9l9-5 9 5z'],
  // misc
  silver: ['M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z'],
  album: ['M4 5h16v14H4z', 'M4 9h16', 'M7 5v4', 'M11 5v4', 'M15 5v4', 'M9 13h6'],
  lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
};

export type GlyphName = keyof typeof PATHS;

export function glyph(name: GlyphName | string, size = 20, label?: string): SVGSVGElement {
  return s('svg', {
    viewBox: '0 0 24 24', width: size, height: size, class: `glyph glyph-${name}`,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    role: label ? 'img' : null, 'aria-label': label ?? null, 'aria-hidden': label ? null : 'true',
  }, ...(PATHS[name] ?? []).map((d) => s('path', { d })));
}
