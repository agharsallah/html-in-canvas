/**
 * The dispatch board: an ordered timetable you edit with buttons only.
 * Fixed station signs stay put; operations can be moved up or down,
 * removed back to the tray, and inserted after the selected row (the
 * insertion point). Everything is a real <button>.
 */
import { h } from '../../ui/dom';
import { tokenCode, tokenLane, type Token } from './rules';

export interface DispatchBoard {
  readonly el: HTMLElement;
  /** The timetable, top to bottom. */
  order(): Token[];
  /** Mark rows that broke a rule (by index), or clear marks. */
  mark(bad: ReadonlySet<number>): void;
  lock(locked: boolean): void;
}

const LANE_LABEL = { main: 'main', worker: 'worker', sign: '' } as const;

export function createDispatchBoard(skeleton: Token[], tray: Token[], onChange: () => void): DispatchBoard {
  let rows: Token[] = [...skeleton];
  let available: Token[] = [...tray];
  /** Insert below this row; -1 means at the top. */
  let cursor = -1;
  let locked = false;
  let focusAfter: { id: string; action: string } | null = null;

  const list = h('ol', { class: 'rail-timetable', 'aria-label': 'Timetable, top to bottom' });
  const top = h('button', { type: 'button', class: 'rail-row-pick rail-top-pick', 'data-action': 'pick', onclick: () => { cursor = -1; render(); } }, 'Top of the timetable');
  const trayEl = h('div', { class: 'rail-tray', role: 'group', 'aria-label': 'Tray: operations to place' });
  const el = h('div', { class: 'rail-dispatch' },
    h('div', { class: 'rail-dispatch-col' }, h('h3', { class: 'panel-title' }, 'Timetable'),
      h('p', { class: 'panel-help' }, 'Pick a row to insert below it (or the top), then add from the tray.'), top, list),
    h('div', { class: 'rail-dispatch-col' }, h('h3', { class: 'panel-title' }, 'Tray'), trayEl));

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j]!, rows[i]!];
    if (cursor === i) cursor = j;
    else if (cursor === j) cursor = i;
    focusAfter = { id: rows[j]!.id, action: delta < 0 ? 'up' : 'down' };
    changed();
  };
  const remove = (i: number) => {
    const [token] = rows.splice(i, 1);
    if (token) available.push(token);
    if (cursor >= i) cursor -= 1;
    changed();
  };
  const insert = (token: Token) => {
    available = available.filter((t) => t.id !== token.id);
    rows.splice(cursor + 1, 0, token);
    cursor += 1;
    focusAfter = { id: token.id, action: 'pick' };
    changed();
  };

  const iconButton = (label: string, glyph: string, action: string, onClick: () => void, disabled = false) =>
    h('button', { type: 'button', class: 'rail-row-btn', 'aria-label': label, 'data-action': action, disabled: disabled || locked, onclick: onClick }, glyph);

  const render = () => {
    top.setAttribute('aria-pressed', String(cursor === -1));
    top.dataset.cursor = String(cursor === -1);
    top.disabled = locked;
    list.replaceChildren(...rows.map((token, i) => {
      const lane = tokenLane(token);
      const code = tokenCode(token);
      const pick = h('button', {
        type: 'button', class: 'rail-row-pick', 'data-action': 'pick', 'aria-pressed': String(i === cursor),
        'aria-label': `${code}. Insert below this row`, disabled: locked,
        onclick: () => { cursor = i; render(); },
      }, lane === 'sign' ? null : h('span', { class: 'rail-lane' }, LANE_LABEL[lane]), h('code', {}, code));
      return h('li', { class: 'rail-row', 'data-lane': lane, 'data-id': token.id, 'data-cursor': String(i === cursor) },
        pick,
        token.fixed ? null : h('span', { class: 'rail-row-tools' },
          iconButton(`Move ${code} up`, '↑', 'up', () => move(i, -1), i === 0),
          iconButton(`Move ${code} down`, '↓', 'down', () => move(i, 1), i === rows.length - 1),
          iconButton(`Remove ${code}`, '×', 'remove', () => remove(i))));
    }));
    trayEl.replaceChildren(...(available.length ? available.map((token) =>
      h('button', { type: 'button', class: 'rail-tray-item', 'data-lane': tokenLane(token), disabled: locked, onclick: () => insert(token) },
        h('span', { class: 'rail-lane' }, LANE_LABEL[tokenLane(token)]), h('code', {}, tokenCode(token)))) : [h('p', { class: 'panel-help' }, 'The tray is empty.')]));
    if (focusAfter) {
      const { id, action } = focusAfter;
      focusAfter = null;
      const row = list.querySelector<HTMLElement>(`[data-id="${id}"]`);
      (row?.querySelector<HTMLButtonElement>(`[data-action="${action}"]:not(:disabled)`) ?? row?.querySelector<HTMLButtonElement>('.rail-row-pick'))?.focus();
    }
  };
  const changed = () => {
    render();
    onChange();
  };
  render();

  return {
    el,
    order: () => [...rows],
    mark(bad) {
      list.querySelectorAll<HTMLElement>('.rail-row').forEach((row, i) => (row.dataset.bad = String(bad.has(i))));
    },
    lock(next) {
      locked = next;
      render();
    },
  };
}
