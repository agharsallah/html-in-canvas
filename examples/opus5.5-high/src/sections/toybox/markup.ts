import { html, raw } from '../../lib/html';
import type { ToyboxSection } from '../../site.config';
import { sectionHead } from '../shared';

export function renderToybox(s: ToyboxSection): string {
  return html`<section class="sec toybox" id="${s.id}" data-section="toybox" aria-labelledby="${s.id}-title">
  ${raw(sectionHead(s, s.eyebrow, s.title, s.intro))}
  <div class="toy-tools">
    <button type="button" class="pill-btn" data-act="shake">Shake the box</button>
    <button type="button" class="pill-btn" data-act="tidy">Tidy up</button>
  </div>
  <div class="stage toy-stage" data-stage="toybox">
    ${s.cards.map((c) => raw(html`<article class="toy toy--${c.ink} toy--${c.shape}" drawable data-shape="${c.shape}">
      <p class="toy-tag">${c.tag}</p>
      <h3 class="toy-title">${c.title}</h3>
      <p class="toy-text">${c.text}</p>
      <a class="toy-link" href="${c.link.href}">${c.link.label} <span aria-hidden="true">→</span></a>
    </article>`))}
  </div>
</section>`;
}
