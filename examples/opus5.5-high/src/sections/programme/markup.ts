import { html, raw } from '../../lib/html';
import type { ProgrammeSection } from '../../site.config';
import { sectionHead } from '../shared';

export function renderProgramme(s: ProgrammeSection): string {
  return html`<section class="sec programme" id="${s.id}" data-section="programme" aria-labelledby="${s.id}-title">
  ${raw(sectionHead(s, s.eyebrow, s.title, s.intro))}
  <div class="prog-tabs" role="tablist" aria-label="Festival day">
    ${s.days.map((d, i) => raw(html`<button type="button" role="tab" class="prog-tab" id="${s.id}-tab-${i}" aria-controls="${s.id}-day-${i}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}"><span>${d.label}</span> <small>${d.date.slice(8)}</small></button>`))}
  </div>
  <div class="stage prog-stage" data-stage="programme">
    ${s.days.map((d, i) => raw(html`<ol class="prog-list" drawable id="${s.id}-day-${i}" role="tabpanel" aria-labelledby="${s.id}-tab-${i}" ${i === 0 ? '' : raw('hidden')}>
      ${d.sessions.map((x, j) => raw(html`<li class="sess" data-i="${j}">
        <time class="sess-time" datetime="${d.date}T${x.time}">${x.time}</time>
        <div class="sess-body"><h3 class="sess-title">${x.title}</h3><p class="sess-meta">${x.speaker} · ${x.room}</p></div>
        <button type="button" class="sess-add" data-day="${i}" data-i="${j}" aria-label="Add “${x.title}” to your calendar">+ Calendar</button>
      </li>`))}
    </ol>`))}
  </div>
</section>`;
}
