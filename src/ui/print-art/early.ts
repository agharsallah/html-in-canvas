/**
 * Pictures for the first half of the line: the canvas, the fog, the bell,
 * the lens, the projector and the mirror maze.
 */
import { s } from '../charts/svg';
import { blur, fill, ground, H, line, linear, picture, radial, rng, uiCard, W } from './kit';

/** The blank canvas: crisp HTML on the left, the same letters smeared to pixels on the right. */
export function prologue(): SVGSVGElement {
  const r = rng(7);
  const cells: SVGElement[] = [];
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 13; x++) {
      const cx = 172 + x * 8.4;
      const cy = 34 + y * 9;
      // An "A"-ish blob: dense in the middle, crumbling at the edges.
      const d = Math.hypot((x - 6) / 6, (y - 4) / 4.6);
      const keep = 1 - d + (r() - 0.5) * 0.6;
      if (keep < 0.12) continue;
      cells.push(s('rect', { x: cx, y: cy, width: 7.4, height: 8, style: fill(r() > 0.75 ? 'second' : 'glow', Math.min(0.95, keep + 0.15)) }));
    }
  }
  return picture('Crisp letters on one side, the same letters smeared into pixels on the other.',
    ...ground('pro', [0.3, 0.4]),
    s('defs', {}, blur('pro-smudge', 3.2)),
    s('text', { x: 34, y: 104, style: `${fill('paper')};font:italic 600 76px var(--font-display)` }, 'Aa'),
    s('rect', { x: 34, y: 116, width: 96, height: 3, rx: 1.5, style: fill('second') }),
    s('text', { x: 34, y: 24, style: `${fill('paper', 0.7)};font:10px var(--font-mono)` }, '<p> readable'),
    s('path', { d: 'M140 76 h18 m-6 -6 l6 6 -6 6', style: line('paper', 1.6, 0.6) }),
    s('g', { filter: 'url(#pro-smudge)' }, s('ellipse', { cx: 226, cy: 74, rx: 56, ry: 38, style: fill('accent', 0.45) })),
    ...cells,
    s('text', { x: 206, y: 142, style: `${fill('paper', 0.55)};font:10px var(--font-mono)` }, 'canvas pixels'));
}

/** Elements rising out of fog banks, the nearest already clear. */
export function fog(): SVGSVGElement {
  const bank = (y: number, amp: number, opacity: number) =>
    s('path', {
      d: `M0 ${y} C 50 ${y - amp}, 90 ${y + amp}, 146 ${y} S 240 ${y - amp}, ${W} ${y} V ${H} H 0 Z`,
      style: fill('glow', opacity),
    });
  return picture('Three interface cards emerging from banks of fog.',
    ...ground('fog', [0.7, 0.2]),
    s('defs', {}, blur('fog-soft', 4)),
    uiCard(196, 22, 70, 50, 'paper', 'second'),
    bank(70, 10, 0.22),
    uiCard(108, 40, 80, 58, 'paper', 'accent'),
    s('g', { filter: 'url(#fog-soft)' }, bank(96, 12, 0.3)),
    uiCard(22, 58, 90, 66, 'paper', 'accent'),
    bank(128, 8, 0.28),
    s('rect', { x: 18, y: 54, width: 98, height: 74, rx: 5, style: line('second', 1.4, 0.9, 'stroke-dasharray:4 3') }));
}

/** A bell ringing paint events: rings of sound, ticks on a timeline. */
export function bells(): SVGSVGElement {
  const rings = [30, 46, 62, 78].map((r, i) => s('circle', { cx: 146, cy: 66, r, style: line(i % 2 ? 'second' : 'glow', 1.6, 0.75 - i * 0.16) }));
  // A paint timeline, clear of the caption: tall ticks are the bell ringing.
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const on = [1, 2, 6, 7, 9].includes(i);
    return s('rect', { x: 166 + i * 11, y: on ? 120 : 128, width: 6, height: on ? 18 : 6, rx: 1.5, style: fill(on ? 'accent' : 'paper', on ? 1 : 0.25) });
  });
  return picture('A bell with rings of sound above a timeline of paint events.',
    ...ground('bel', [0.5, 0.42]),
    s('defs', {}, linear('bel-metal', [[0, 'glow'], [1, 'accent']], 0)),
    ...rings,
    s('path', { d: 'M146 34 c-16 0 -22 14 -22 30 v12 c0 6 -8 10 -12 14 h68 c-4 -4 -12 -8 -12 -14 v-12 c0 -16 -6 -30 -22 -30 z', fill: 'url(#bel-metal)' }),
    s('circle', { cx: 146, cy: 94, r: 6, style: fill('glow') }),
    s('rect', { x: 143, y: 26, width: 6, height: 9, rx: 2, style: fill('glow') }),
    ...ticks);
}

/** A lens over a pixel grid: blurry outside, razor sharp inside. */
export function lens(): SVGSVGElement {
  const grid: SVGElement[] = [];
  for (let x = 8; x < W; x += 12) grid.push(s('line', { x1: x, y1: 0, x2: x, y2: H, style: line('paper', 0.6, 0.12) }));
  for (let y = 6; y < H; y += 12) grid.push(s('line', { x1: 0, y1: y, x2: W, y2: y, style: line('paper', 0.6, 0.12) }));
  return picture('A magnifying lens over a pixel grid: the glyph inside it is sharp, the one outside is blurred.',
    ...ground('len', [0.62, 0.5]),
    s('defs', {}, blur('len-blur', 2.6), radial('len-glass', [[0, 'glow', 0.18], [0.85, 'glow', 0.05], [1, 'second', 0.6]])),
    ...grid,
    s('text', { x: 28, y: 108, filter: 'url(#len-blur)', style: `${fill('paper', 0.8)};font:600 78px var(--font-display)` }, 'g'),
    s('circle', { cx: 184, cy: 72, r: 58, fill: 'url(#len-glass)' }),
    s('text', { x: 158, y: 104, style: `${fill('paper')};font:600 84px var(--font-display)` }, 'g'),
    s('circle', { cx: 184, cy: 72, r: 58, style: line('second', 3) }),
    s('path', { d: 'M226 114 l34 30', style: line('second', 9) }),
    s('path', { d: 'M150 34 a46 46 0 0 1 40 -10', style: line('paper', 2.4, 0.7) }));
}

/** A projector throwing a tilted, cropped card onto a screen. */
export function projector(): SVGSVGElement {
  return picture('A projector beam throwing a tilted interface card onto a screen.',
    ...ground('pjr', [0.25, 0.55]),
    s('defs', {}, linear('pjr-beam', [[0, 'glow', 0.75], [1, 'glow', 0.04]], 0)),
    s('path', { d: 'M74 66 L238 18 L262 128 L74 86 Z', fill: 'url(#pjr-beam)' }),
    s('g', { transform: 'rotate(-9 220 74)' },
      uiCard(178, 36, 86, 64, 'paper', 'second'),
      s('rect', { x: 174, y: 32, width: 94, height: 72, rx: 2, style: line('accent', 1.4, 0.9, 'stroke-dasharray:5 3') })),
    s('rect', { x: 22, y: 60, width: 56, height: 34, rx: 6, style: fill('second') }),
    s('circle', { cx: 34, cy: 46, r: 14, style: line('paper', 3) }),
    s('circle', { cx: 64, cy: 46, r: 14, style: line('paper', 3) }),
    s('circle', { cx: 78, cy: 76, r: 7, style: fill('glow') }),
    s('rect', { x: 30, y: 94, width: 6, height: 30, style: fill('second', 0.8) }),
    s('rect', { x: 62, y: 94, width: 6, height: 30, style: fill('second', 0.8) }));
}

/** A corridor of mirrors and a cursor whose ray lands on the true one. */
export function mirrors(): SVGSVGElement {
  const frames = [0, 1, 2, 3, 4].map((i) => {
    const k = 1 - i * 0.17;
    const w = 150 * k;
    const hgt = 108 * k;
    return s('rect', {
      x: 146 - w / 2 + i * 6, y: 72 - hgt / 2, width: w, height: hgt, rx: 3,
      transform: `rotate(${(i % 2 ? -1 : 1) * i * 2.4} 146 72)`,
      style: line(i === 3 ? 'accent' : 'paper', i === 3 ? 2.4 : 1.4, i === 3 ? 1 : 0.55 - i * 0.07),
    });
  });
  return picture('Nested tilted mirror frames; a dotted ray from a cursor hits the one true frame.',
    ...ground('mir', [0.5, 0.5]),
    ...frames,
    s('rect', { x: 140, y: 64, width: 30, height: 18, rx: 2, style: fill('accent') }),
    s('path', { d: 'M248 128 L160 74', style: line('second', 1.6, 0.9, 'stroke-dasharray:2 5') }),
    s('path', { d: 'M246 120 l0 22 l6 -6 l5 10 l4 -2 l-5 -10 l8 0 z', style: `${fill('paper')};stroke:var(--photo);stroke-width:1.2` }),
    s('circle', { cx: 160, cy: 74, r: 4, style: fill('second') }));
}
