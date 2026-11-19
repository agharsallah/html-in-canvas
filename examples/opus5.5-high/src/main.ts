/**
 * Kiosk bootstrap: fonts, styles, preferences, then enhance each section.
 * Sections are pre-rendered HTML; enhancers load on demand (one chunk each).
 */
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './styles/base.css';
import './sections/hero/hero.css';
import './sections/band/band.css';
import './sections/toybox/toybox.css';
import './sections/programme/programme.css';
import './sections/app/app.css';
import './sections/voices/voices.css';
import './sections/passes/passes.css';
import './sections/badge/badge.css';

import { APIS } from './apis';
import { detect, type Support } from './hic/support';
import { apply, prefs } from './lib/prefs';
import type { Section } from './site.config';

type Enhancer = (root: HTMLElement, support: Support) => void | Promise<void>;

const ENHANCERS: Partial<Record<Section['type'], () => Promise<Enhancer>>> = {
  hero: () => import('./sections/hero/enhance').then((m) => m.enhanceHero),
  band: () => import('./sections/band/enhance').then((m) => m.enhanceBand),
  toybox: () => import('./sections/toybox/enhance').then((m) => m.enhanceToybox),
  programme: () => import('./sections/programme/enhance').then((m) => m.enhanceProgramme),
  app: () => import('./sections/app/enhance').then((m) => m.enhanceApp),
  voices: () => import('./sections/voices/enhance').then((m) => m.enhanceVoices),
  passes: () => import('./sections/passes/enhance').then((m) => m.enhancePasses),
  badge: () => import('./sections/badge/enhance').then((m) => m.enhanceBadge),
};

const support = detect();
document.documentElement.classList.toggle('hic', support.html);
document.documentElement.classList.toggle('no-hic', !support.html);
apply();

wireToggles();
describeMode(support);

for (const root of document.querySelectorAll<HTMLElement>('[data-section]')) {
  const type = root.dataset.section as Section['type'];
  const load = ENHANCERS[type];
  if (!load) continue;
  load()
    .then((enhance) => enhance(root, support))
    .catch((err: unknown) => {
      // A section that fails to enhance stays readable HTML. Say so, don't hide it.
      console.error(`[kiosk] ${type} kept as plain HTML:`, err);
      root.dataset.enhance = 'failed';
    });
}

function wireToggles(): void {
  const theme = document.querySelector<HTMLButtonElement>('[data-toggle="theme"]');
  const motion = document.querySelector<HTMLButtonElement>('[data-toggle="motion"]');
  const sync = () => {
    theme?.setAttribute('aria-pressed', String(prefs.theme === 'dark'));
    motion?.setAttribute('aria-pressed', String(!prefs.reducedMotion));
  };
  theme?.addEventListener('click', () => prefs.setTheme(prefs.theme === 'dark' ? 'light' : 'dark'));
  motion?.addEventListener('click', () => prefs.setReducedMotion(!prefs.reducedMotion));
  prefs.subscribe(sync);
  sync();
}

function describeMode(s: Support): void {
  const chip = document.querySelector<HTMLElement>('.mode-chip');
  const body = document.querySelector<HTMLElement>('.mode-pop-body');
  const label = chip?.querySelector('span');
  const yes = (b: boolean) => (b ? 'yes' : 'no');
  if (chip && label) {
    chip.dataset.mode = s.html ? 'live' : 'fallback';
    label.textContent = s.html ? 'Live canvas' : 'Plain HTML';
  }
  if (body) {
    body.innerHTML = s.html
      ? `<p>Your browser supports HTML-in-Canvas. Every poster on this page is real HTML drawn into a canvas, and it stays selectable, focusable and accessible.</p>
         <ul><li>2D: ${yes(s.ctx2d)}</li><li>WebGL: ${yes(s.webgl)}</li><li>WebGPU: ${yes(s.webgpu)}</li><li>Workers: ${yes(s.worker)}</li></ul>`
      : `<p>${s.forced ? 'You asked for the fallback.' : 'Your browser doesn’t support HTML-in-Canvas yet (it shipped in Chrome 157).'} You’re seeing the same content as ordinary HTML, with CSS effects instead of canvas ones.</p>`;
  }
  // The feature table's live column.
  for (const cell of document.querySelectorAll<HTMLElement>('.hood-status[data-check]')) {
    const key = cell.dataset.check as keyof Support | '';
    if (!key) continue;
    const ok = Boolean(s[key]);
    cell.dataset.ok = String(ok);
    cell.textContent = ok ? 'Supported' : 'Not here';
  }
  void APIS;
}
