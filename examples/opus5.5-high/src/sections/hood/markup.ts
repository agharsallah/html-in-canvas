import { APIS } from '../../apis';
import { html, raw } from '../../lib/html';
import type { HoodSection, SiteConfig } from '../../site.config';
import { sectionHead } from '../shared';

export function renderHood(s: HoodSection, site: SiteConfig): string {
  const idOf = (type: string) => site.sections.find((x) => x.type === type);
  return html`<section class="sec hood" id="${s.id}" data-section="hood" aria-labelledby="${s.id}-title">
  ${raw(sectionHead(s, s.eyebrow, s.title, s.intro))}
  <div class="hood-scroll" tabindex="0" role="region" aria-label="Feature table">
  <table class="hood-table">
    <thead><tr><th scope="col">Feature</th><th scope="col">Its job here</th><th scope="col">Where</th><th scope="col">Your browser</th></tr></thead>
    <tbody>
      ${APIS.map((a) => raw(html`<tr>
        <th scope="row"><code>${a.api}</code><small>${a.kind}</small></th>
        <td>${a.job}</td>
        <td class="hood-where">${a.where.map((w) => { const sec = idOf(w); return sec ? raw(html`<a href="#${sec.id}">${w}</a>`) : ''; })}</td>
        <td class="hood-status" data-check="${a.check ?? ''}">${a.check ? 'Checking…' : 'Always'}</td>
      </tr>`))}
    </tbody>
  </table>
  </div>
</section>`;
}
