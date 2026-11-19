import { html, raw } from '../../lib/html';
import type { HeroSection } from '../../site.config';

export function renderHero(s: HeroSection): string {
  return html`<section class="hero" id="${s.id}" data-section="hero" aria-labelledby="${s.id}-title">
  <div class="hero-backdrop" aria-hidden="true"><i class="shape shape--sun"></i><i class="shape shape--half"></i><i class="shape shape--bar"></i></div>
  <div class="stage hero-stage" data-stage="hero">
    <article class="poster" drawable>
      <div class="poster-art" aria-hidden="true"><i class="pa pa--circle"></i><i class="pa pa--block"></i><i class="pa pa--stripe"></i></div>
      <p class="poster-kicker">${s.kicker}</p>
      <h1 class="poster-title" id="${s.id}-title">${s.title.map((line) => raw(html`<span>${line}</span>`))}</h1>
      <p class="poster-lede">${s.lede}</p>
      <form class="poster-form" ${s.signup.action ? raw(html`action="${s.signup.action}" method="post"`) : ''} data-thanks="${s.signup.thanks}">
        <label for="${s.id}-email">${s.signup.label}</label>
        <div class="poster-row">
          <input id="${s.id}-email" name="email" type="email" required autocomplete="email" placeholder="${s.signup.placeholder}">
          <button type="submit">${s.signup.button}</button>
        </div>
        <p class="poster-note" role="status">${s.signup.note}</p>
      </form>
      <a class="poster-cta" href="${s.cta.href}" drawable>${s.cta.label}<span aria-hidden="true"> →</span></a>
    </article>
  </div>
  <p class="hero-hint" aria-hidden="true">Move the pointer · Tab through the poster · it is all real HTML</p>
</section>`;
}
