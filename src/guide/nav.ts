/**
 * The rail: a table of contents that follows you down the page.
 *
 *  - Scrollspy: the concept you are reading is lit, its group opens.
 *  - Search: filters the rail and the page at once ("/" to focus, Esc to clear).
 *  - j / k jump to the next / previous concept.
 *  - Under 1100px the rail becomes a sheet opened from the top bar.
 */
import { glyph } from '../ui/components/glyphs';
import { h } from '../ui/dom';
import { ENTRIES, GROUPS, type GuideEntry } from './content';

export interface Rail {
  readonly el: HTMLElement;
  readonly toggle: HTMLButtonElement;
  /** Call once the articles are in the document. */
  start(): void;
}

function haystack(entry: GuideEntry): string {
  return [entry.name, entry.what, ...entry.points, entry.code ?? '', entry.kind].join(' ').toLowerCase();
}

export function createRail(): Rail {
  const links = new Map<string, HTMLAnchorElement>();
  const groupItems = new Map<string, HTMLElement>();

  const search = h('input', {
    class: 'g-search', type: 'search', placeholder: 'Filter concepts', 'aria-label': 'Filter concepts',
    'aria-keyshortcuts': '/', autocomplete: 'off', spellcheck: 'false',
  });
  const empty = h('p', { class: 'g-rail-empty', hidden: true }, 'No concept matches.');
  const count = h('p', { class: 'g-rail-count', 'aria-live': 'polite' });

  const list = h('ol', { class: 'g-rail-groups' }, ...GROUPS.map((group, i) => {
    const item = h('li', { class: 'g-rail-group', 'data-group': group.id },
      h('a', { class: 'g-rail-group-link', href: `#${group.id}` },
        h('span', { class: 'g-rail-num' }, String(i + 1).padStart(2, '0')), group.title),
      h('ul', { class: 'g-rail-entries' }, ...group.entries.map((entry) => {
        const link = h('a', { class: 'g-rail-link', href: `#${entry.id}`, 'data-kind': entry.kind },
          glyph(entry.kind, 14), h('span', {}, entry.name));
        links.set(entry.id, link);
        return h('li', {}, link);
      })));
    groupItems.set(group.id, item);
    return item;
  }));

  const el = h('nav', { class: 'g-rail', id: 'g-rail', 'aria-label': 'Guide contents' },
    h('div', { class: 'g-rail-search' }, search, h('kbd', { class: 'ui-kbd', 'aria-hidden': 'true' }, '/')),
    count, empty, list,
    h('a', { class: 'g-rail-link g-rail-extra', href: '#cheat-sheet' }, glyph('practice', 14), h('span', {}, 'Cheat sheet')),
    h('p', { class: 'g-rail-keys' }, h('kbd', {}, 'j'), ' ', h('kbd', {}, 'k'), ' next and previous concept'));

  const toggle = h('button', {
    class: 'g-contents', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'g-rail',
  }, glyph('album', 16), 'Contents');
  const setOpen = (open: boolean) => {
    el.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.dataset.sheet = String(open);
  };
  toggle.addEventListener('click', () => setOpen(el.dataset.open !== 'true'));
  el.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) setOpen(false);
  });

  const visibleEntries = () => ENTRIES.filter((e) => !document.getElementById(e.id)?.hidden);

  const applyFilter = () => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    for (const group of GROUPS) {
      let groupShown = 0;
      for (const entry of group.entries) {
        const match = !query || haystack(entry).includes(query);
        const article = document.getElementById(entry.id);
        if (article) article.hidden = !match;
        links.get(entry.id)!.parentElement!.hidden = !match;
        if (match) groupShown++;
      }
      groupItems.get(group.id)!.hidden = groupShown === 0;
      const section = document.getElementById(group.id);
      if (section) section.hidden = groupShown === 0;
      shown += groupShown;
    }
    empty.hidden = shown > 0;
    count.textContent = query ? `${shown} of ${ENTRIES.length} concepts` : '';
    document.body.dataset.filtering = String(!!query);
  };
  search.addEventListener('input', applyFilter);
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && search.value) {
      search.value = '';
      applyFilter();
      event.stopPropagation();
    }
  });

  const jump = (step: 1 | -1) => {
    const entries = visibleEntries();
    const current = entries.findIndex((e) => links.get(e.id)?.getAttribute('aria-current') === 'location');
    const next = entries[Math.min(Math.max(current + step, 0), entries.length - 1)];
    if (!next) return;
    const article = document.getElementById(next.id)!;
    article.scrollIntoView({ block: 'start' });
    article.focus({ preventScroll: true });
    history.replaceState(null, '', `#${next.id}`);
  };

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    const typing = target.matches('input, textarea, [contenteditable="true"]');
    if (event.key === 'Escape' && el.dataset.open === 'true') {
      setOpen(false);
      toggle.focus();
      return;
    }
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === '/') {
      event.preventDefault();
      if (matchMedia('(max-width: 1099px)').matches) setOpen(true);
      search.focus();
    } else if (event.key === 'j') {
      jump(1);
    } else if (event.key === 'k') {
      jump(-1);
    }
  });

  const setCurrent = (id: string) => {
    links.forEach((link, key) => {
      if (key === id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const group = GROUPS.find((g) => g.entries.some((e) => e.id === id));
    groupItems.forEach((item, key) => {
      item.dataset.active = String(key === group?.id);
    });
    // Keep the lit link in view inside a long rail, without moving the page.
    const link = links.get(id);
    if (link && el.scrollHeight > el.clientHeight) {
      const top = link.offsetTop - el.clientHeight / 2;
      el.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return {
    el,
    toggle,
    start() {
      // The article whose top crossed the upper third of the viewport is "current".
      const io = new IntersectionObserver((records) => {
        const crossing = records.filter((r) => r.isIntersecting).map((r) => r.target.id);
        const last = crossing[crossing.length - 1];
        if (last) setCurrent(last);
      }, { rootMargin: '-25% 0px -70% 0px' });
      ENTRIES.forEach((entry) => {
        const article = document.getElementById(entry.id);
        if (article) io.observe(article);
      });
    },
  };
}
