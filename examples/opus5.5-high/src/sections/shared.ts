import { chipsFor } from '../apis';
import { html, raw } from '../lib/html';
import type { Section } from '../site.config';

/** The header every content section shares: eyebrow, title, intro and the API chips. */
export function sectionHead(s: { id: string; type: Section['type'] }, eyebrow: string, title: string, intro?: string): string {
  const chips = chipsFor(s.type);
  return html`<header class="sec-head">
    <p class="eyebrow">${eyebrow}</p>
    <h2 class="sec-title" id="${s.id}-title">${title}</h2>
    ${intro ? raw(html`<p class="sec-intro">${intro}</p>`) : ''}
    ${chips.length ? raw(html`<ul class="chips" aria-label="HTML-in-Canvas features in this section">${chips.map((c) => raw(html`<li>${c}</li>`))}</ul>`) : ''}
  </header>`;
}

/** Initials for avatars drawn with CSS (no external images: snapshots stay same-origin). */
export const initials = (name: string): string =>
  name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
