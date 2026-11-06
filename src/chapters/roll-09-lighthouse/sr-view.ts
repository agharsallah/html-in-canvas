/**
 * The "screen reader view": an outline of the canvas' accessibility tree as
 * a screen reader would meet it, rebuilt from the real elements' state.
 * Silent nodes are struck through; ghost focus (Tab lands on a silent node)
 * is flagged; bounds come from getBoundingClientRect() relative to the canvas.
 */
import { h } from '../../ui/dom';
import { describeExposure, isGhostFocus, type Exposure } from './rules';

export interface OutlineRow {
  depth: number;
  role: string;
  name: string;
  exposure: Exposure;
  /** "x, y w×h" in CSS px, when it has (possibly stale) bounds. */
  rect?: string;
  focused: boolean;
}

export interface SrView {
  readonly el: HTMLElement;
  render(rows: readonly OutlineRow[]): void;
  /** Re-describe the canvas itself (its role and name). */
  setRoot(role: string, name: string): void;
  /** What a screen reader would say as focus lands somewhere. */
  speak(row: OutlineRow | null): void;
}

export function createSrView(canvasName: string, { withVoice = true } = {}): SrView {
  const list = h('ul', { class: 'lh-outline' });
  const root = h('p', { class: 'lh-outline-root' });
  const setRoot = (role: string, name: string) =>
    root.replaceChildren(h('span', { class: 'lh-role' }, role), name ? ` “${name}”` : ' (no name)');
  setRoot('canvas', canvasName);
  const voice = h('p', { class: 'lh-voice' }, 'Tab into the canvas to hear it.');
  const el = h('section', { class: 'lh-sr panel', 'aria-label': 'Screen reader view' },
    h('h3', { class: 'panel-title' }, 'Screen reader view'),
    h('p', { class: 'panel-help' }, 'The canvas’ children as assistive tech meets them. Silent nodes are struck through.'),
    root,
    list,
    withVoice ? voice : null);

  return {
    el,
    setRoot,
    render(rows) {
      list.replaceChildren(...rows.map((row) => {
        const ghost = isGhostFocus(row.exposure);
        return h('li', {
          class: 'lh-node',
          'data-depth': String(row.depth),
          'data-silent': String(!row.exposure.announced),
          'data-ghost': String(ghost),
          'data-geometry': row.exposure.geometry,
          'data-focused': String(row.focused),
        },
        h('span', { class: 'lh-role' }, row.role),
        h('span', { class: 'lh-name' }, `“${row.name}”`),
        h('span', { class: 'lh-state' }, describeExposure(row.exposure), row.rect ? ` · ${row.rect}` : ''),
        row.focused ? h('span', { class: 'lh-focus-tag' }, 'focus') : null);
      }));
    },
    speak(row) {
      if (!row) return;
      voice.textContent = row.exposure.announced
        ? `Screen reader: “${row.name}, ${row.role}”`
        : 'Screen reader: … (nothing. Focus is on a node it was told to ignore.)';
      voice.dataset.ghost = String(!row.exposure.announced);
    },
  };
}
