/** Minimal SVG element builder, the SVG twin of `h()` in ui/dom.ts. */
const NS = 'http://www.w3.org/2000/svg';

type SvgAttrs = Record<string, string | number | undefined | null>;

export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: SvgAttrs = {}, ...children: Array<Node | string | null>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) el.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child !== null) el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** Polar to cartesian, angle in degrees with 0 at 12 o'clock, clockwise. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** An SVG arc path (stroke-only) from `start` to `end` degrees. */
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
