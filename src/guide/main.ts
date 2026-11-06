/**
 * The one-page guide: every HTML-in-Canvas concept in one place.
 * Shares the darkroom's fonts, tokens, component kit and 3D helpers.
 */
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/500-italic.css';
import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/600.css';
import '@fontsource/atkinson-hyperlegible-mono/400.css';

import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/signature.css';
import '../styles/labs.css';
import '../styles/editor.css';
import '../styles/guide.css';

import { detectCapabilities } from '../core/capabilities';
import { glyph } from '../ui/components/glyphs';
import { h } from '../ui/dom';
import { GROUPS } from './content';
import { createRail } from './nav';
import { overviewSection } from './overview';
import { cheatSheetSection, groupSection, heroSection } from './sections';

function start(): void {
  const root = document.querySelector<HTMLElement>('#guide');
  if (!root) throw new Error('Guide: missing #guide');
  const caps = detectCapabilities();
  document.body.dataset.mode = caps.mode;

  const rail = createRail();
  const progress = h('span', { class: 'g-progress', 'aria-hidden': 'true' });
  const top = h('header', { class: 'g-top' },
    h('a', { class: 'g-wordmark', href: './' },
      h('span', { class: 'g-wordmark-title' }, 'Drawable'),
      h('span', { class: 'g-wordmark-sub' }, 'the field guide')),
    h('div', { class: 'g-top-actions' },
      h('span', { class: 'g-top-mode', 'data-mode': caps.mode }, caps.mode === 'native' ? 'Native' : 'Simulated'),
      h('a', { class: 'g-top-link', href: './' }, glyph('lab', 16), 'Darkroom'),
      rail.toggle),
    progress);

  const main = h('main', { id: 'g-main', class: 'g-main', tabindex: '-1' },
    heroSection(caps),
    overviewSection(),
    ...GROUPS.map((group, i) => groupSection(group, i, caps)),
    cheatSheetSection());

  root.append(top, h('div', { class: 'g-shell' }, rail.el, main));
  rail.start();

  // Reading progress, as a thin safelight line under the top bar.
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Articles exist now: honour a deep link such as guide.html#request-paint.
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

start();

void import('../core/telemetry').then((m) => m.startTelemetry());
