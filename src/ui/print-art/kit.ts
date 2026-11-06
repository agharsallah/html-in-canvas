/**
 * A tiny kit for the photographs on the prints.
 *
 * Every picture is plain SVG shapes and gradients, coloured with the roll's
 * own tokens (--accent, --second, --glow, --paper) so each print reads as
 * its photographic process. No <use>, <pattern> or <feImage>: snapshots
 * leave those out (read-back-allowed rendering), so the picture would have
 * holes in the canvas.
 */
import { s } from '../charts/svg';

export const W = 292;
export const H = 150;

export type Tone = 'accent' | 'second' | 'glow' | 'paper' | 'ink' | 'photo';

export const fill = (tone: Tone, opacity = 1): string =>
  `fill:var(--${tone})${opacity < 1 ? `;fill-opacity:${opacity}` : ''}`;

export const line = (tone: Tone, width = 1.5, opacity = 1, extra = ''): string =>
  `fill:none;stroke:var(--${tone});stroke-width:${width};stroke-linecap:round;stroke-linejoin:round${opacity < 1 ? `;stroke-opacity:${opacity}` : ''}${extra ? `;${extra}` : ''}`;

type Stop = [offset: number, tone: Tone, opacity?: number];

/** A linear gradient; `angle` 0 = left to right, 90 = top to bottom. */
export function linear(id: string, stops: Stop[], angle = 90): SVGLinearGradientElement {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) / 2;
  const y = Math.sin(rad) / 2;
  return s('linearGradient', { id, x1: 0.5 - x, y1: 0.5 - y, x2: 0.5 + x, y2: 0.5 + y }, ...stops.map(stop));
}

export function radial(id: string, stops: Stop[], cx = 0.5, cy = 0.5, r = 0.5): SVGRadialGradientElement {
  return s('radialGradient', { id, cx, cy, r }, ...stops.map(stop));
}

function stop([offset, tone, opacity = 1]: Stop): SVGStopElement {
  return s('stop', { offset, style: `stop-color:var(--${tone});stop-opacity:${opacity}` });
}

export const blur = (id: string, amount: number): SVGFilterElement =>
  s('filter', { id, x: '-30%', y: '-30%', width: '160%', height: '160%' }, s('feGaussianBlur', { stdDeviation: amount }));

/** Deterministic noise, so the same print always gets the same picture. */
export function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** A gear: a toothed ring made from a thick dashed stroke. */
export function gear(cx: number, cy: number, r: number, teeth: number, tone: Tone, spin = 0): SVGGElement {
  const dash = (2 * Math.PI * r) / (teeth * 2);
  return s('g', { transform: `rotate(${spin} ${cx} ${cy})` },
    s('circle', { cx, cy, r, style: line(tone, r * 0.32, 1, `stroke-dasharray:${dash.toFixed(2)} ${dash.toFixed(2)};stroke-linecap:butt`) }),
    s('circle', { cx, cy, r: r * 0.86, style: line(tone, r * 0.22) }),
    s('circle', { cx, cy, r: r * 0.2, style: fill(tone) }),
    ...[0, 60, 120].map((a) => s('rect', {
      x: cx - r * 0.05, y: cy - r * 0.8, width: r * 0.1, height: r * 1.6, style: fill(tone, 0.85),
      transform: `rotate(${a} ${cx} ${cy})`,
    })));
}

/** A small UI card: the "HTML element" that recurs in every picture. */
export function uiCard(x: number, y: number, w: number, hgt: number, tone: Tone = 'paper', button: Tone = 'accent'): SVGGElement {
  return s('g', {},
    s('rect', { x, y, width: w, height: hgt, rx: 3, style: fill(tone) }),
    s('rect', { x: x + w * 0.1, y: y + hgt * 0.16, width: w * 0.62, height: hgt * 0.13, rx: 1.5, style: fill('photo', 0.85) }),
    s('rect', { x: x + w * 0.1, y: y + hgt * 0.38, width: w * 0.78, height: hgt * 0.07, rx: 1, style: fill('photo', 0.35) }),
    s('rect', { x: x + w * 0.1, y: y + hgt * 0.5, width: w * 0.55, height: hgt * 0.07, rx: 1, style: fill('photo', 0.35) }),
    s('rect', { x: x + w * 0.1, y: y + hgt * 0.68, width: w * 0.36, height: hgt * 0.17, rx: 2, style: fill(button) }));
}

/** The frame of every picture: the photo ground with a soft light falling in. */
export function ground(id: string, light: [number, number] = [0.5, 0.35]): SVGElement[] {
  return [
    s('defs', {},
      radial(`${id}-ground`, [[0, 'accent', 0.55], [0.55, 'accent', 0.12], [1, 'photo', 0]], light[0], light[1], 0.75)),
    s('rect', { width: W, height: H, style: fill('photo') }),
    s('rect', { width: W, height: H, fill: `url(#${id}-ground)` }),
  ];
}

export function picture(label: string, ...children: Array<SVGElement | null>): SVGSVGElement {
  return s('svg', {
    viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'print-art-svg', role: 'img', 'aria-label': label,
  }, ...children);
}
