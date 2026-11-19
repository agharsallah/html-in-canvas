import { html, raw } from '../../lib/html';
import type { BandSection } from '../../site.config';

export function renderBand(s: BandSection): string {
  return html`<section class="band" id="${s.id}" data-section="band" aria-labelledby="${s.id}-title">
  <h2 class="visually-hidden" id="${s.id}-title">${s.label}</h2>
  <div class="stage band-stage" data-stage="band">
    <div class="tape tape--b" drawable id="${s.id}-facts">
      <ul class="tape-list">${s.facts.map((f) => raw(html`<li>${f}</li>`))}</ul>
    </div>
    <div class="tape tape--a" drawable id="${s.id}-names">
      <span class="tape-label">${s.label}</span>
      <ul class="tape-list">${s.names.map((n) => raw(html`<li>${n}</li>`))}</ul>
      <a class="tape-link" href="${s.link.href}">${s.link.label} →</a>
    </div>
  </div>
  <div class="band-tools">
    <button type="button" class="pill-btn band-pause" aria-pressed="false">Pause the tape</button>
    <p class="band-status" aria-hidden="true"></p>
  </div>
</section>`;
}
