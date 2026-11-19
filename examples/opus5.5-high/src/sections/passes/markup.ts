import { html, raw } from '../../lib/html';
import type { PassesSection } from '../../site.config';
import { sectionHead } from '../shared';

export function renderPasses(s: PassesSection): string {
  const [a, b] = s.plans;
  return html`<section class="sec passes" id="${s.id}" data-section="passes" aria-labelledby="${s.id}-title">
  ${raw(sectionHead(s, s.eyebrow, s.title, s.intro))}
  <div class="stage passes-stage" data-stage="passes" role="group" aria-label="${a.name} compared with ${b.name}">
    ${s.plans.map((p, i) => raw(html`<article class="pass pass--${p.ink}" drawable id="${s.id}-plan-${i}" aria-labelledby="${s.id}-plan-${i}-name">
      <header class="pass-head">
        <h3 class="pass-name" id="${s.id}-plan-${i}-name">${p.name}</h3>
        <p class="pass-price"><strong>${p.price}</strong> <span>${p.per}</span></p>
        <p class="pass-blurb">${p.blurb}</p>
      </header>
      <dl class="pass-rows">${p.rows.map((r) => raw(html`<div><dt>${r.label}</dt><dd>${r.value}</dd></div>`))}</dl>
      <a class="pass-cta" href="${p.cta.href}">${p.cta.label} <span aria-hidden="true">→</span></a>
    </article>`))}
  </div>
  <div class="pass-split">
    <span aria-hidden="true">${a.name}</span>
    <input type="range" id="${s.id}-split" min="0" max="100" step="1" value="50" aria-label="Divider between ${a.name} and ${b.name}" aria-valuetext="50% ${a.name}">
    <span aria-hidden="true">${b.name}</span>
  </div>
</section>`;
}
