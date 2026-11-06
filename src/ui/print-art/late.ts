/**
 * Pictures for the second half of the line: the observatory, the foundry,
 * the railway, the lighthouse, the vault, the clockwork and the reel.
 */
import { s } from '../charts/svg';
import { fill, gear, ground, H, line, linear, picture, radial, rng, uiCard, W } from './kit';

function stars(seed: number, count: number): SVGElement[] {
  const r = rng(seed);
  return Array.from({ length: count }, () =>
    s('circle', { cx: r() * W, cy: r() * H, r: r() * 1.2 + 0.3, style: fill('paper', 0.3 + r() * 0.5) }));
}

/** A planet wearing a form, on an orbit. */
export function observatory(): SVGSVGElement {
  return picture('A glowing planet with an interface card riding its orbit.',
    ...ground('obs', [0.5, 0.5]),
    s('defs', {}, radial('obs-planet', [[0, 'glow'], [0.55, 'second'], [1, 'accent', 0.4]], 0.35, 0.3, 0.75)),
    ...stars(11, 46),
    s('ellipse', { cx: 146, cy: 78, rx: 128, ry: 30, transform: 'rotate(-12 146 78)', style: line('glow', 1.2, 0.5) }),
    s('circle', { cx: 146, cy: 78, r: 44, fill: 'url(#obs-planet)' }),
    s('path', { d: 'M104 66 q42 -20 84 6', style: line('photo', 2, 0.25) }),
    s('path', { d: 'M108 92 q38 14 76 -4', style: line('photo', 2, 0.25) }),
    s('ellipse', { cx: 146, cy: 78, rx: 128, ry: 30, transform: 'rotate(-12 146 78)', style: line('glow', 1.6, 0.9, 'stroke-dasharray:0 200 160 400') }),
    s('g', { transform: 'rotate(-18 236 50)' }, uiCard(214, 34, 46, 32, 'paper', 'accent')));
}

/** Molten metal pouring over a tag that keeps its shape. */
export function foundry(): SVGSVGElement {
  return picture('A crucible pours molten metal over an HTML tag that stays legible.',
    ...ground('fdy', [0.55, 0.85]),
    s('defs', {}, linear('fdy-melt', [[0, 'glow'], [0.6, 'accent'], [1, 'second', 0.85]], 90)),
    s('g', { transform: 'rotate(28 70 34)' },
      s('path', { d: 'M40 14 h64 l-8 44 h-48 z', style: fill('second') }),
      s('rect', { x: 36, y: 10, width: 72, height: 8, rx: 3, style: fill('glow', 0.9) })),
    s('path', { d: 'M108 56 C 126 64, 128 84, 134 102 C 136 108, 140 108, 142 102 C 146 86, 136 66, 112 50 Z', fill: 'url(#fdy-melt)' }),
    s('path', { d: `M0 116 C 60 104, 110 124, 160 110 S 250 104, ${W} 114 V ${H} H 0 Z`, fill: 'url(#fdy-melt)' }),
    s('text', { x: 176, y: 92, style: `${fill('paper')};font:600 42px var(--font-mono)` }, '</>'),
    s('path', { d: 'M190 96 v14 a3 3 0 0 0 6 0 v-10 M232 96 v20 a3 3 0 0 0 6 0 v-16', style: fill('paper') }),
    ...[30, 70, 220, 262].map((x, i) => s('circle', { cx: x, cy: 104 - i * 3, r: 2.4, style: fill('glow', 0.8) })));
}

/** Two tracks to the vanishing point; snapshots ride the worker line. */
export function railway(): SVGSVGElement {
  const vp = { x: 196, y: 44 };
  const rails = [[20, 150], [110, 150], [180, 150], [270, 150]].map(([x, y]) =>
    s('line', { x1: x, y1: y, x2: vp.x, y2: vp.y, style: line('paper', 1.6, 0.7) }));
  const sleepers = Array.from({ length: 7 }, (_, i) => {
    const t = Math.pow(i / 7, 1.7);
    const y = 150 - (150 - vp.y) * t;
    const span = (1 - t) * 250;
    return s('line', { x1: vp.x - span * 0.7, y1: y, x2: vp.x + span * 0.33, y2: y, style: line('paper', 2.2 - t * 1.6, 0.35) });
  });
  return picture('Railway tracks running to the horizon, with element snapshots riding toward a worker.',
    ...ground('rly', [0.67, 0.28]),
    s('defs', {}, radial('rly-lamp', [[0, 'glow'], [1, 'glow', 0]])),
    s('rect', { y: 0, width: W, height: vp.y, style: fill('accent', 0.12) }),
    ...sleepers,
    ...rails,
    s('circle', { cx: vp.x, cy: vp.y, r: 26, fill: 'url(#rly-lamp)' }),
    uiCard(118, 82, 34, 24, 'paper', 'second'),
    uiCard(160, 62, 22, 16, 'paper', 'second'),
    s('rect', { x: 34, y: 90, width: 44, height: 50, rx: 6, style: fill('second') }),
    s('circle', { cx: 56, cy: 108, r: 8, style: fill('glow') }),
    s('rect', { x: 40, y: 124, width: 32, height: 6, rx: 2, style: fill('photo', 0.6) }));
}

/** A lighthouse sweeping beams and sound across the water. */
export function lighthouse(): SVGSVGElement {
  return picture('A lighthouse sweeping beams of light and rings of sound over the sea.',
    ...ground('lth', [0.32, 0.25]),
    s('defs', {}, linear('lth-beam', [[0, 'glow', 0.8], [1, 'glow', 0]], 0), linear('lth-beam-l', [[0, 'glow', 0], [1, 'glow', 0.6]], 0)),
    s('path', { d: `M98 40 L${W} 6 L${W} 70 Z`, fill: 'url(#lth-beam)' }),
    s('path', { d: 'M0 30 L0 66 L82 44 Z', fill: 'url(#lth-beam-l)' }),
    ...[22, 38, 54].map((r, i) => s('path', { d: `M${120 + r} ${44 - r * 0.6} a${r} ${r} 0 0 1 0 ${r * 1.2}`, style: line('second', 1.8, 0.85 - i * 0.22) })),
    s('path', { d: 'M78 128 L84 48 H104 L110 128 Z', style: fill('paper') }),
    s('path', { d: 'M81 92 H107 L108 104 H80 Z M83 66 H105 L106 76 H82 Z', style: fill('accent') }),
    s('rect', { x: 84, y: 32, width: 20, height: 16, rx: 2, style: fill('glow') }),
    s('path', { d: 'M80 32 L94 20 L108 32 Z', style: fill('accent') }),
    s('path', { d: `M0 128 C 40 122, 70 134, 110 128 S 190 122, 230 130 S 270 126, ${W} 128 V ${H} H 0 Z`, style: fill('second', 0.55) }),
    s('path', { d: `M0 138 C 50 134, 90 144, 140 138 S 230 134, ${W} 140`, style: line('glow', 1.2, 0.5) }));
}

/** A vault door, and a document whose secrets never reach the pixels. */
export function vault(): SVGSVGElement {
  const bolts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return s('circle', { cx: 92 + Math.cos(a) * 46, cy: 75 + Math.sin(a) * 46, r: 3.4, style: fill('glow') });
  });
  const doc = [0, 1, 2, 3, 4].map((i) => {
    const y = 34 + i * 18;
    const secret = i === 1 || i === 3;
    return s('g', {},
      s('rect', { x: 176, y, width: secret ? 30 : 82, height: 6, rx: 2, style: fill('paper', 0.6) }),
      secret ? s('rect', { x: 210, y: y - 3, width: 52, height: 12, rx: 1, style: fill('photo') }) : null,
      secret ? s('rect', { x: 210, y: y - 3, width: 52, height: 12, rx: 1, style: line('accent', 1.2) }) : null);
  });
  return picture('A round vault door beside a document with two lines blacked out.',
    ...ground('vlt', [0.32, 0.5]),
    s('defs', {}, radial('vlt-door', [[0, 'second', 0.95], [0.8, 'second', 0.55], [1, 'glow', 0.9]])),
    s('circle', { cx: 92, cy: 75, r: 60, fill: 'url(#vlt-door)' }),
    s('circle', { cx: 92, cy: 75, r: 60, style: line('glow', 3) }),
    ...bolts,
    s('circle', { cx: 92, cy: 75, r: 14, style: line('paper', 4) }),
    ...[0, 60, 120].map((a) => s('rect', { x: 89, y: 47, width: 6, height: 56, rx: 3, transform: `rotate(${a} 92 75)`, style: fill('paper') })),
    s('rect', { x: 166, y: 22, width: 106, height: 108, rx: 3, style: line('paper', 1.2, 0.5) }),
    ...doc);
}

/** Meshing gears and a pendulum: the rendering update's clockwork. */
export function clockwork(): SVGSVGElement {
  return picture('Three meshing gears and a swinging pendulum.',
    ...ground('clk', [0.45, 0.4]),
    gear(96, 70, 40, 14, 'glow', 4),
    gear(170, 52, 26, 10, 'second', 12),
    gear(196, 112, 22, 8, 'accent', -6),
    s('path', { d: 'M254 14 L240 96', style: line('paper', 2) }),
    s('circle', { cx: 240, cy: 102, r: 10, style: fill('paper') }),
    s('path', { d: 'M226 108 a20 20 0 0 0 30 0', style: line('paper', 1.2, 0.4, 'stroke-dasharray:2 3') }),
    s('circle', { cx: 254, cy: 14, r: 3, style: fill('paper') }));
}

/** A reel of film looping to infinity. */
export function epilogue(): SVGSVGElement {
  const holes = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return s('circle', { cx: 66 + Math.cos(a) * 22, cy: 75 + Math.sin(a) * 22, r: 9, style: fill('photo') });
  });
  const loop = 'M120 75 C 150 30, 200 30, 220 75 S 290 120, 262 75 S 190 30, 170 75 S 130 120, 120 75';
  return picture('A film reel unspooling into an endless loop.',
    ...ground('epi', [0.6, 0.5]),
    s('defs', {}, linear('epi-film', [[0, 'second'], [0.5, 'glow'], [1, 'accent']], 0)),
    s('path', { d: loop, style: 'fill:none;stroke:url(#epi-film);stroke-width:16;stroke-linecap:round' }),
    s('path', { d: loop, style: line('photo', 2.2, 0.9, 'stroke-dasharray:3 6') }),
    s('circle', { cx: 66, cy: 75, r: 50, style: fill('paper') }),
    s('circle', { cx: 66, cy: 75, r: 50, style: line('accent', 3) }),
    ...holes,
    s('circle', { cx: 66, cy: 75, r: 6, style: fill('accent') }));
}
