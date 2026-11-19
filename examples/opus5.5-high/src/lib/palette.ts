/**
 * Colours for things the canvas draws itself (backgrounds, shapes, shader
 * uniforms). Theme travels through JavaScript, read from computed styles, the
 * way the official WebGPU demo does it, never through pixels.
 *
 * Probes are hidden elements coloured by the CSS custom properties, so under
 * `forced-colors: active` they resolve to the user's system colours for free.
 */
import type { Ink } from '../site.config';

export type RGB = [number, number, number];
export type Palette = Record<Ink, RGB> & { css: Record<Ink, string> };

let probeHost: HTMLElement | null = null;
let current: Palette | null = null;

function parse(color: string): RGB {
  const m = color.match(/[\d.]+/g);
  return m ? [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255] : [0, 0, 0];
}

export function readPalette(): Palette {
  if (!probeHost) {
    probeHost = document.createElement('div');
    probeHost.setAttribute('aria-hidden', 'true');
    probeHost.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
    probeHost.innerHTML =
      '<i data-k="paper" style="background:var(--paper)"></i><i data-k="ink" style="color:var(--ink)"></i>' +
      '<i data-k="red" style="color:var(--red)"></i><i data-k="blue" style="color:var(--blue)"></i><i data-k="yellow" style="color:var(--yellow)"></i>';
    document.body.append(probeHost);
  }
  const out = { css: {} } as Palette;
  for (const probe of Array.from(probeHost.children) as HTMLElement[]) {
    const k = probe.dataset.k as Ink;
    const s = getComputedStyle(probe);
    const value = k === 'paper' ? s.backgroundColor : s.color;
    out[k] = parse(value);
    out.css[k] = value;
  }
  current = out;
  return out;
}

export const palette = (): Palette => current ?? readPalette();
