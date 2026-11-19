import { html, raw } from '../../lib/html';
import type { AppSection } from '../../site.config';
import { sectionHead } from '../shared';

export function renderApp(s: AppSection): string {
  return html`<section class="sec app-sec" id="${s.id}" data-section="app" aria-labelledby="${s.id}-title">
  <div class="app-grid">
    <div class="app-copy">
      ${raw(sectionHead(s, s.eyebrow, s.title, s.intro))}
      <ul class="app-points">${s.points.map((p) => raw(html`<li>${p}</li>`))}</ul>
      <a class="btn" href="${s.store.href}">${s.store.label}</a>
    </div>
    <div class="stage app-stage" data-stage="app-outer">
      <div class="phone" drawable>
        <div class="phone-bezel">
          <div class="stage phone-screen" data-stage="app-inner">
            <div class="app-ui" drawable aria-label="${s.appName} app preview" role="group">
              <header class="app-bar"><strong class="app-name">${s.appName}</strong><time class="app-clock">--:--</time></header>
              <p class="app-now"><span>Happening now</span><strong>${s.sessions[0]?.title ?? ''}</strong><span class="app-progress"><i></i></span></p>
              <p class="app-saved"><span class="app-count">0</span> starred</p>
              <ul class="app-list">
                ${s.sessions.map((x) => raw(html`<li class="app-item"><span class="app-time">${x.time}</span><span class="app-title">${x.title}<small>${x.room}</small></span><button type="button" class="app-star" aria-pressed="false" aria-label="Star ${x.title}">★</button></li>`))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}
