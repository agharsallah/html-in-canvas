import { html, raw } from '../../lib/html';
import type { FaqSection } from '../../site.config';

export function renderFaq(s: FaqSection): string {
  return html`<section class="sec faq" id="${s.id}" data-section="faq" aria-labelledby="${s.id}-title">
  <header class="sec-head"><h2 class="sec-title" id="${s.id}-title">${s.title}</h2></header>
  <div class="faq-list">${s.items.map((it) => raw(html`<details class="faq-item"><summary>${it.q}</summary><p>${it.a}</p></details>`))}</div>
</section>`;
}
