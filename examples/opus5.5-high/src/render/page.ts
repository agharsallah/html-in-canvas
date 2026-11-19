/**
 * Renders the whole page from site.config.ts to static HTML.
 * Runs at build time (vite.config.ts) and never touches the DOM.
 */
import { html, raw } from '../lib/html';
import type { Palette, Section, SiteConfig } from '../site.config';
import { renderApp } from '../sections/app/markup';
import { renderBadge } from '../sections/badge/markup';
import { renderBand } from '../sections/band/markup';
import { renderFaq } from '../sections/faq/markup';
import { renderHero } from '../sections/hero/markup';
import { renderHood } from '../sections/hood/markup';
import { renderPasses } from '../sections/passes/markup';
import { renderProgramme } from '../sections/programme/markup';
import { renderToybox } from '../sections/toybox/markup';
import { renderVoices } from '../sections/voices/markup';

function renderSection(s: Section, site: SiteConfig): string {
  switch (s.type) {
    case 'hero': return renderHero(s);
    case 'band': return renderBand(s);
    case 'toybox': return renderToybox(s);
    case 'programme': return renderProgramme(s);
    case 'app': return renderApp(s);
    case 'voices': return renderVoices(s);
    case 'passes': return renderPasses(s);
    case 'badge': return renderBadge(s, site);
    case 'hood': return renderHood(s, site);
    case 'faq': return renderFaq(s);
  }
}

const vars = (p: Palette) => Object.entries(p).map(([k, v]) => `--${k}:${v};`).join('');

export function renderHead(site: SiteConfig): string {
  const b = site.brand;
  const title = `${b.name} · ${b.tagline}`;
  return html`<title>${title}</title>
<meta name="description" content="${b.description}">
<meta name="theme-color" content="${b.light.paper}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${b.dark.paper}" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="${b.url}/">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${b.description}">
<meta property="og:url" content="${b.url}/">
<meta property="og:image" content="${b.url}/og.png">
<meta name="twitter:card" content="summary_large_image">
<style id="brand">
:root,[data-theme="light"]{${raw(vars(b.light))}color-scheme:light}
[data-theme="dark"]{${raw(vars(b.dark))}color-scheme:dark}
:root{--font-display:"${raw(b.fonts.display)}",system-ui,sans-serif;--font-body:"${raw(b.fonts.body)}",system-ui,sans-serif;--font-mono:"${raw(b.fonts.mono)}",ui-monospace,monospace}
</style>`;
}

export function renderBody(site: SiteConfig): string {
  const b = site.brand;
  return html`<a class="skip" href="#main">Skip to content</a>
<header class="site-nav">
  <a class="wordmark" href="#top" aria-label="${b.name}, back to top">${b.mark}<span aria-hidden="true">●</span></a>
  <nav aria-label="Sections"><ul class="nav-links">${site.nav.map((l) => raw(html`<li><a href="${l.href}">${l.label}</a></li>`))}</ul></nav>
  <div class="nav-tools">
    <button type="button" class="mode-chip" popovertarget="mode-pop" data-mode="checking"><i aria-hidden="true"></i><span>Checking…</span></button>
    <button type="button" class="tool" data-toggle="theme" aria-pressed="false">Dark</button>
    <button type="button" class="tool" data-toggle="motion" aria-pressed="true">Motion</button>
  </div>
  <div id="mode-pop" popover class="mode-pop">
    <p class="mode-pop-title">How this page is drawn</p>
    <p class="mode-pop-body">Checking your browser…</p>
    <p class="mode-pop-foot"><a href="?fallback">See the fallback</a> · <a href="./">See the live version</a> · <a href="#under-the-hood">Feature table</a></p>
  </div>
</header>
<main id="main" tabindex="-1">
${raw(site.sections.map((s) => renderSection(s, site)).join('\n'))}
</main>
<footer class="site-foot">
  <p class="foot-mark">${b.mark}<span aria-hidden="true">●</span></p>
  <p class="foot-note">${site.footer.note}</p>
  <ul class="foot-links">${site.footer.links.map((l) => raw(html`<li><a href="${l.href}">${l.label}</a></li>`))}</ul>
</footer>`;
}
