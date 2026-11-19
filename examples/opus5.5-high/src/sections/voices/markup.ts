import { html, raw } from '../../lib/html';
import type { VoicesSection } from '../../site.config';
import { initials, sectionHead } from '../shared';

export function renderVoices(s: VoicesSection): string {
  const n = s.quotes.length;
  return html`<section class="sec voices" id="${s.id}" data-section="voices" aria-labelledby="${s.id}-title">
  ${raw(sectionHead(s, s.eyebrow, s.title))}
  <div class="voices-wrap" role="region" aria-roledescription="carousel" aria-labelledby="${s.id}-title">
    <div class="stage voices-stage" data-stage="voices">
      ${s.quotes.map((q, i) => raw(html`<figure class="quote quote--${q.ink}${i === 0 ? ' is-current' : ''}" drawable id="${s.id}-q${i}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}" ${i === 0 ? '' : raw('inert')}>
        <span class="quote-mark" aria-hidden="true">“</span>
        <blockquote><p>${q.text}</p></blockquote>
        <figcaption><span class="avatar" aria-hidden="true">${initials(q.name)}</span><span class="who"><strong>${q.name}</strong><span>${q.role}</span></span></figcaption>
      </figure>`))}
    </div>
    <div class="voices-controls">
      <button type="button" class="round-btn" data-dir="-1" aria-label="Previous quote">←</button>
      <p class="voices-count" aria-live="polite"><span class="voices-i">1</span> / ${n}</p>
      <button type="button" class="round-btn" data-dir="1" aria-label="Next quote">→</button>
    </div>
  </div>
</section>`;
}
