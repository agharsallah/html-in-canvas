/**
 * The vault lab's specimen page: a small dossier holding a mix of sensitive
 * and safe content. It is built twice: once as ordinary page content ("what
 * you see") and once as a drawable canvas child ("what the snapshot holds").
 *
 * Each row carries `data-item`, the id of the matching rule in rules.ts.
 */
import { h } from '../../ui/dom';

export type FrameOrigin = 'cross' | 'same';

export interface Specimen {
  item: string;
  label: string;
  /** Plain-language hint shown in the spy list. */
  probe: string;
}

export const SPECIMENS: readonly Specimen[] = [
  { item: 'visited', label: 'Visited link', probe: 'reads the link’s text colour' },
  { item: 'spelling', label: 'Spelling squiggle', probe: 'looks for red under the typo' },
  { item: 'xo-img', label: 'Embedded frame', probe: 'reads the frame’s pixels' },
  { item: 'system-colors', label: 'System-colour button', probe: 'reads the button’s colours' },
  { item: 'caret', label: 'Blinking caret', probe: 'watches the caret blink' },
  { item: 'focus-ring', label: 'Focus ring', probe: 'looks for the focus ring' },
];

/** The link points at this very page, which is in history by definition. */
const visitedHref = () => location.href;

const FRAME_DOC = (who: string) => `<!doctype html><style>body{margin:0;font:600 13px system-ui;background:#ffe14d;color:#121212;display:grid;place-items:center;height:100vh}</style><body>${who}</body>`;

export interface Dossier {
  el: HTMLElement;
  link: HTMLAnchorElement;
  frame: HTMLIFrameElement;
  row(item: string): HTMLElement | null;
  setOrigin(origin: FrameOrigin): void;
}

export function createDossier(role: 'see' | 'snap'): Dossier {
  const link = h('a', { href: visitedHref(), class: 'vault-link', tabindex: role === 'snap' ? '-1' : null }, 'The darkroom (this page)');
  link.addEventListener('click', (event) => event.preventDefault());
  const frame = h('iframe', { class: 'vault-frame', title: 'An embedded frame', loading: 'eager' });
  const row = (item: string, label: string, ...content: Array<Node | string>) =>
    h('div', { class: 'vault-row', 'data-item': item }, h('span', { class: 'vault-row-label' }, label), h('span', { class: 'vault-row-body' }, ...content));

  const el = h('article', { class: 'vault-dossier', 'data-role': role, drawable: role === 'snap' ? true : null, 'aria-label': role === 'see' ? 'Specimen page' : 'Specimen page, drawn into the canvas' },
    h('p', { class: 'vault-dossier-title' }, 'Dossier № 10'),
    row('visited', 'Link', link),
    row('spelling', 'Note', h('textarea', { class: 'vault-note', rows: '1', spellcheck: 'true', 'aria-label': 'Note with a typo' }, 'The vualt is sekure')),
    row('xo-img', 'Frame', frame),
    row('system-colors', 'Button', h('button', { type: 'button', class: 'vault-system-btn' }, 'ButtonFace')),
    row('caret', 'Caret', h('input', { type: 'text', class: 'vault-caret-input', value: 'type here', 'aria-label': 'Field with a caret' })),
    row('focus-ring', 'Focus', h('button', { type: 'button', class: 'vault-focus-btn' }, 'Focus me')));

  const setOrigin = (origin: FrameOrigin) => {
    // A sandboxed frame gets an opaque origin: cross-origin to this page.
    // Without the sandbox, srcdoc inherits this page's origin.
    if (origin === 'cross') frame.setAttribute('sandbox', '');
    else frame.removeAttribute('sandbox');
    frame.srcdoc = FRAME_DOC(origin === 'cross' ? 'opaque origin' : 'same origin');
    el.dataset.origin = origin;
  };
  setOrigin('cross');

  return { el, link, frame, row: (item) => el.querySelector<HTMLElement>(`[data-item='${item}']`), setOrigin };
}
