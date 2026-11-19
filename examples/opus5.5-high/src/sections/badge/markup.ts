import { html, raw } from '../../lib/html';
import type { BadgeSection, SiteConfig } from '../../site.config';
import { sectionHead } from '../shared';

export function renderBadge(s: BadgeSection, site: SiteConfig): string {
  const ink0 = s.inks[0] ?? 'red';
  // A deterministic "code" pattern made of CSS cells: same-origin art only.
  const cells = Array.from({ length: 25 }, (_, i) => ((i * 7 + 3) % 5 < 2 || i % 6 === 0 ? 1 : 0));
  return html`<section class="sec badge-sec" id="${s.id}" data-section="badge" aria-labelledby="${s.id}-title">
  ${raw(sectionHead(s, s.eyebrow, s.title, s.intro))}
  <div class="badge-grid">
    <form class="badge-form" novalidate>
      <label class="field"><span>Name on the badge</span><input id="${s.id}-name" name="name" maxlength="26" autocomplete="name" placeholder="${s.defaultName}"></label>
      <label class="field"><span>Role</span><select id="${s.id}-role" name="role">${s.roles.map((r) => raw(html`<option>${r}</option>`))}</select></label>
      <fieldset class="field swatches"><legend>Ink</legend>
        ${s.inks.map((ink, i) => raw(html`<label class="swatch swatch--${ink}"><input type="radio" name="ink" value="${ink}" ${i === 0 ? raw('checked') : ''}><span class="visually-hidden">${ink}</span></label>`))}
      </fieldset>
      <div class="badge-actions">
        <button type="button" class="btn" id="${s.id}-download">Download PNG</button>
        <p class="badge-note" role="status"></p>
      </div>
    </form>
    <div class="stage badge-stage" data-stage="badge" role="group" aria-label="Badge preview">
      <div class="badge badge--${ink0}" drawable id="${s.id}-card">
        <div class="badge-hole" aria-hidden="true"></div>
        <div class="badge-top"><span class="badge-mark">${site.brand.mark}</span><span class="badge-year">’${String(site.event.year).slice(2)}</span></div>
        <p class="badge-role">${s.roles[0] ?? ''}</p>
        <p class="badge-hello">Hello, my name is</p>
        <p class="badge-name-row"><span class="badge-name" drawable>${s.defaultName}</span></p>
        <div class="badge-foot"><span>${s.foot}</span>
          <span class="badge-code" aria-hidden="true">${cells.map((c) => raw(`<i${c ? ' class="on"' : ''}></i>`))}</span></div>
        <div class="badge-art" aria-hidden="true"><i></i><i></i></div>
      </div>
    </div>
  </div>
</section>`;
}
