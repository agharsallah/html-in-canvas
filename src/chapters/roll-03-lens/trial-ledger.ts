/**
 * Boss fight, phase one: the Unit Ledger. One value at a time; file it under
 * CSS px, canvas grid px, device px or texture px (keys 1–4). Correct values
 * land on the ledger board under their unit.
 */
import { button, setLabel } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { h } from '../../ui/dom';
import { classify, LEDGER, UNIT_LABELS, UNITS, type Unit } from './units';

export interface PhaseHooks {
  onHit(): void;
  onMiss(): void;
  onDone(): void;
}

export function mountLedger(host: HTMLElement, hooks: PhaseHooks): () => void {
  let index = 0;
  let locked = false;
  const columns = new Map(UNITS.map((unit) => [unit, h('ul', { class: 'lens-ledger-list', 'aria-label': UNIT_LABELS[unit] })]));
  const board = h('div', { class: 'lens-ledger-board' },
    ...UNITS.map((unit) => h('section', { class: 'lens-ledger-col', 'data-unit': unit },
      h('h4', {}, UNIT_LABELS[unit]), columns.get(unit)!)));
  const progress = h('p', { class: 'quiz-progress' });
  const value = h('div', { class: 'lens-ledger-value' });
  const feedback = h('div', { class: 'quiz-feedback', 'aria-live': 'polite' });
  const next = button({ label: 'Next value', variant: 'primary', onClick: () => advance() });
  next.hidden = true;
  const bins = UNITS.map((unit, i) => h('button', {
    type: 'button', class: 'ui-option lens-bin', 'data-unit': unit,
    onclick: () => pick(unit),
  }, h('span', { class: 'ui-option-key', 'aria-hidden': 'true' }, String(i + 1)), h('span', {}, UNIT_LABELS[unit])));
  const card = h('div', { class: 'lens-ledger' },
    progress, value, h('div', { class: 'lens-bins', role: 'group', 'aria-label': 'File it under' }, ...bins), feedback, next, board);
  host.append(card);

  const render = () => {
    const item = LEDGER[index]!;
    locked = false;
    progress.textContent = `Value ${index + 1} of ${LEDGER.length}`;
    value.replaceChildren(h('code', { class: 'lens-ledger-code' }, item.code),
      item.context.includes('(') ? h('p', {}, 'in ', h('code', {}, item.context)) : h('p', {}, item.context));
    feedback.replaceChildren();
    next.hidden = true;
    bins.forEach((b) => {
      b.disabled = false;
      delete b.dataset.result;
    });
  };

  const pick = (unit: Unit) => {
    if (locked) return;
    const item = LEDGER[index]!;
    const answer = classify(item, unit);
    const bin = bins[UNITS.indexOf(unit)]!;
    feedback.replaceChildren(callout({ kind: answer.correct ? 'success' : 'error', title: answer.correct ? 'Filed' : 'Blur smudges it', body: answer.why }));
    if (!answer.correct) {
      bin.dataset.result = 'wrong';
      bin.disabled = true;
      hooks.onMiss();
      return;
    }
    locked = true;
    bin.dataset.result = 'right';
    bins.forEach((b) => (b.disabled = true));
    columns.get(item.unit)!.append(h('li', {}, h('code', { title: item.context }, item.code)));
    hooks.onHit();
    next.hidden = false;
    setLabel(next, index === LEDGER.length - 1 ? 'To the grinding wheel' : 'Next value');
    next.focus();
  };

  const advance = () => {
    if (index === LEDGER.length - 1) return hooks.onDone();
    index += 1;
    render();
    bins[0]?.focus();
  };

  const onKey = (event: KeyboardEvent) => {
    const origin = event.target;
    if (origin instanceof Element && origin.closest('input, textarea, dialog[open]')) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const i = Number(event.key) - 1;
    const bin = bins[i];
    if (Number.isInteger(i) && bin && !bin.disabled) bin.click();
  };
  window.addEventListener('keydown', onKey);

  render();
  return () => {
    window.removeEventListener('keydown', onKey);
    card.remove();
  };
}
