/**
 * "Everything at once": every concept on one curved 3D contact sheet.
 *
 * Plain DOM and CSS 3D, so it works in every browser: one column per group,
 * one tile per concept, the wall leaning toward the pointer. Tiles are links
 * to their article. Hovering or focusing a tile reads its definition into
 * the panel below, and a kind filter dims everything else.
 */
import { KIND_LABELS, type ConceptKind } from '../chapters/shared/chapter';
import { createSegmented } from '../ui/components/segmented';
import { glyph } from '../ui/components/glyphs';
import { h, prefersReducedMotion, rich } from '../ui/dom';
import { GROUPS, type GuideEntry } from './content';

type KindFilter = 'all' | ConceptKind;

const PLURALS: Record<ConceptKind, string> = {
  attribute: 'Attributes', event: 'Events', method: 'Methods', property: 'Properties', rule: 'Rules', idea: 'Ideas',
};

/** Let long API names wrap at camelCase humps and punctuation, not mid-word. */
function breakable(name: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  name.split(/(?<=[a-z])(?=[A-Z])|(?=\()|(?<=[=·])/).forEach((part, i) => {
    if (i) fragment.append(document.createElement('wbr'));
    fragment.append(part);
  });
  return fragment;
}

export function overviewSection(): HTMLElement {
  const preview = h('p', { class: 'g-wall-preview', 'aria-live': 'polite' }, 'Hover or focus a tile to read its one-line definition. Click to jump to it.');
  const tiles: HTMLAnchorElement[] = [];
  const center = (GROUPS.length - 1) / 2;

  const describe = (entry: GuideEntry, group: string) => {
    preview.replaceChildren(h('strong', {}, entry.name), h('span', { class: 'g-wall-preview-group' }, ` · ${group} · `), rich(entry.what));
  };

  const columns = GROUPS.map((group, i) => {
    const offset = i - center;
    const column = h('li', {
      class: 'g-wall-col',
      style: `--o: ${offset}; --d: ${Math.abs(offset)}; --i: ${i}`,
    },
    h('a', { class: 'g-wall-head', href: `#${group.id}` },
      h('span', { class: 'g-wall-num' }, String(i + 1).padStart(2, '0')),
      h('span', {}, group.title)),
    h('ul', { class: 'g-wall-tiles' }, ...group.entries.map((entry, j) => {
      const tile = h('a', {
        class: 'g-tile', href: `#${entry.id}`, 'data-kind': entry.kind, style: `--j: ${i * 0.6 + j}`,
        'aria-describedby': 'g-wall-help',
      },
      h('span', { class: 'g-tile-glyph', 'aria-hidden': 'true' }, glyph(entry.kind, 18)),
      h('span', { class: 'g-tile-name' }, breakable(entry.name)),
      h('span', { class: 'g-tile-kind' }, KIND_LABELS[entry.kind]));
      tile.addEventListener('pointerenter', () => describe(entry, group.title));
      tile.addEventListener('focus', () => describe(entry, group.title));
      tiles.push(tile);
      return h('li', {}, tile);
    })));
    return column;
  });

  const wall = h('ol', { class: 'g-wall', 'aria-label': 'All concepts, by group' }, ...columns);
  const stage = h('div', { class: 'g-wall-stage' }, wall);

  const filter = createSegmented<KindFilter>({
    label: 'Highlight a kind of concept',
    value: 'all',
    options: [
      { value: 'all', label: 'All' },
      ...(['attribute', 'event', 'method', 'property', 'rule', 'idea'] as const).map((k) => ({ value: k, label: PLURALS[k] })),
    ],
    onChange: (kind) => {
      tiles.forEach((tile) => {
        tile.dataset.dim = String(kind !== 'all' && tile.dataset.kind !== kind);
      });
    },
  });

  // Lean toward the pointer, like a print held up to the light.
  if (!prefersReducedMotion() && matchMedia('(hover: hover)').matches) {
    let frame = 0;
    stage.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        wall.style.setProperty('--ry', `${x * 10}deg`);
        wall.style.setProperty('--rx', `${-y * 8}deg`);
      });
    });
    stage.addEventListener('pointerleave', () => {
      wall.style.setProperty('--ry', '0deg');
      wall.style.setProperty('--rx', '0deg');
    });
  }

  // Develop the tiles the first time the wall comes into view.
  const io = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return;
    wall.dataset.developed = 'true';
    io.disconnect();
  }, { threshold: 0.2 });
  io.observe(wall);

  return h('section', { class: 'g-overview', id: 'everything', 'aria-labelledby': 'everything-title' },
    h('header', { class: 'g-overview-head' },
      h('div', {},
        h('p', { class: 'g-kicker' }, 'The contact sheet'),
        h('h2', { id: 'everything-title', class: 'g-overview-title' }, 'Everything at once')),
      filter.el),
    h('p', { id: 'g-wall-help', class: 'visually-hidden' }, 'Jumps to the concept in this page.'),
    stage,
    preview);
}
