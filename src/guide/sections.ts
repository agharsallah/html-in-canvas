/**
 * The guide's reading sections: hero, one article per concept grouped into
 * numbered sections, and the cheat sheet. Built with the shared `h` helper,
 * the component kit and the practice editor's highlighter.
 */
import { KIND_LABELS } from '../chapters/shared/chapter';
import { ENABLE_HINT, type Capabilities } from '../core/capabilities';
import { button, setLabel } from '../ui/components/button';
import { glyph } from '../ui/components/glyphs';
import { h, rich } from '../ui/dom';
import { tokenize, type Language } from '../ui/editor/highlight';
import { CHEAT_SHEET, ENTRIES, GROUPS, type GuideEntry, type GuideGroup } from './content';
import { FIGURES, heroFigure } from './figures';
import { mountFigure } from './stage/figure';

export function codeBlock(source: string, language: Language): HTMLElement {
  return h('pre', { class: 'code g-code', 'data-lang': language },
    h('code', {}, ...tokenize(source, language).map((t) =>
      t.kind === 'plain' ? t.text : h('span', { class: `tok-${t.kind}` }, t.text))));
}

export function heroSection(caps: Capabilities): HTMLElement {
  const figures = ENTRIES.filter((e) => e.figure).length;
  const figure = h('figure', { class: 'g-hero-figure' });
  mountFigure(figure, heroFigure, caps);
  return h('section', { class: 'g-hero', 'aria-labelledby': 'g-title' },
    h('div', { class: 'g-hero-text' },
      h('p', { class: 'g-kicker' }, 'The complete guide'),
      h('h1', { id: 'g-title', class: 'g-title' }, 'HTML', h('span', { class: 'g-title-in' }, 'in'), 'Canvas'),
      h('p', { class: 'g-lead' }, rich('Canvas only knew pixels. Now a `<canvas>` can draw real, laid-out, accessible HTML, and keep it clickable. This page puts every concept of the API in one place, with a live 3D figure for each.')),
      h('ul', { class: 'g-stats', 'aria-label': 'At a glance' },
        h('li', {}, h('strong', {}, String(ENTRIES.length)), ' concepts'),
        h('li', {}, h('strong', {}, String(GROUPS.length)), ' groups'),
        h('li', {}, h('strong', {}, String(figures)), ' live figures')),
      h('div', { class: 'g-hero-actions' },
        h('a', { class: 'ui-button', 'data-variant': 'primary', href: '#everything' }, 'See everything at once'),
        h('a', { class: 'ui-button', 'data-variant': 'secondary', href: './' }, 'Play the darkroom')),
      h('p', { class: 'g-mode', 'data-mode': caps.mode },
        h('span', { class: 'g-mode-dot', 'aria-hidden': 'true' }),
        caps.mode === 'native'
          ? 'Your browser speaks HTML-in-Canvas: every label in these figures is real HTML drawn with drawElementImage().'
          : `Simulated: the figures' labels sit in a CSS layer over each canvas. ${caps.forcedSimulation ? 'Remove ?sim to use the real API.' : ENABLE_HINT}`)),
    figure);
}

function entryArticle(entry: GuideEntry, caps: Capabilities): HTMLElement {
  const spec = entry.figure ? FIGURES[entry.figure] : null;
  const text = h('div', { class: 'g-entry-text' },
    h('p', { class: 'g-entry-kind' }, glyph(entry.kind, 18), KIND_LABELS[entry.kind]),
    h('h3', { class: 'g-entry-name' }, h('a', { href: `#${entry.id}`, class: 'g-anchor' }, entry.name)),
    h('p', { class: 'g-entry-what' }, rich(entry.what)),
    h('ul', { class: 'g-entry-points' }, ...entry.points.map((p) => h('li', {}, rich(p)))),
    entry.code ? codeBlock(entry.code, entry.lang ?? 'js') : null,
    h('p', { class: 'g-entry-source' }, `Source: ${entry.source}`));

  const article = h('article', {
    class: 'g-entry', id: entry.id, 'data-kind': entry.kind, 'data-figure': String(!!spec), tabindex: '-1',
    'aria-labelledby': `${entry.id}-name`,
  }, text);
  text.querySelector('h3')!.id = `${entry.id}-name`;

  if (spec) {
    const figure = h('figure', { class: 'g-entry-figure' }, h('figcaption', { class: 'visually-hidden' }, spec.label));
    mountFigure(figure, spec, caps);
    article.append(figure);
  }
  return article;
}

export function groupSection(group: GuideGroup, index: number, caps: Capabilities): HTMLElement {
  return h('section', { class: 'g-group', id: group.id, 'aria-labelledby': `${group.id}-title` },
    h('header', { class: 'g-group-head' },
      h('span', { class: 'g-group-number', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
      h('div', {},
        h('h2', { id: `${group.id}-title`, class: 'g-group-title' }, group.title),
        h('p', { class: 'g-group-intro' }, rich(group.intro)))),
    ...group.entries.map((entry) => entryArticle(entry, caps)));
}

export function cheatSheetSection(): HTMLElement {
  const status = h('span', { class: 'g-copy-status', role: 'status' });
  const copy = button({
    label: 'Copy',
    size: 'sm',
    onClick: async () => {
      try {
        await navigator.clipboard.writeText(CHEAT_SHEET);
        setLabel(copy, 'Copied');
        status.textContent = 'Copied to the clipboard';
      } catch {
        status.textContent = 'Copy failed: select the code instead';
      }
      setTimeout(() => {
        setLabel(copy, 'Copy');
        status.textContent = '';
      }, 2000);
    },
  });
  return h('section', { class: 'g-cheat', id: 'cheat-sheet', 'aria-labelledby': 'cheat-title' },
    h('header', { class: 'g-group-head' },
      h('span', { class: 'g-group-number', 'aria-hidden': 'true' }, '∑'),
      h('div', {},
        h('h2', { id: 'cheat-title', class: 'g-group-title' }, 'The whole thing'),
        h('p', { class: 'g-group-intro' }, 'Everything a first demo needs: opt in, size the grid, draw on paint. Geometry follows for free in 2D.'))),
    h('div', { class: 'g-cheat-body' },
      h('div', { class: 'g-cheat-bar' }, h('span', {}, 'basic-example.html'), status, copy),
      codeBlock(CHEAT_SHEET, 'html')),
    h('footer', { class: 'g-footer' },
      h('p', {}, 'Sources: the ',
        h('a', { href: 'https://github.com/WICG/html-in-canvas' }, 'WICG explainer'), ' and the ',
        h('a', { href: 'https://developer.chrome.com/docs/web-platform/html-in-canvas' }, 'Chrome developer docs'),
        '. HTML-in-Canvas is an incubating proposal; details can still change.'),
      h('p', {}, 'Learn it by doing in ', h('a', { href: './' }, 'Drawable, the darkroom adventure'), '.')));
}
