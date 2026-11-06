/**
 * Trial: audit the tide board. A canvas UI built from the official patterns
 * hides seven accessibility bugs. Edit its markup and paint handler, read
 * the screen reader view, then sweep the beam. A sweep that still finds a
 * symptom costs a mistake. Play it with the keyboard alone for a stamp.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { createSegmented } from '../../ui/components/segmented';
import { createToggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { auditBoard, BOARD, brokenBoard, bugCount, exposureOf, type BoardNode, type NodeAttrs } from './board';
import { createSrView } from './sr-view';
import { tidePreview } from './trial-preview';

const ROLE: Record<BoardNode['id'], string> = {
  dawn: 'listitem', noon: 'listitem', dusk: 'listitem', yesterday: 'region', slider: 'slider', readout: 'text',
};

export const trial: Beat = (host, ctx) => {
  const config = brokenBoard();
  let mistakes = 0;
  let usedPointer = false;
  let won = false;
  const t = (text: string) => h('code', {}, text);
  const chip = (label: string, checked: boolean, write: (v: boolean) => void) =>
    createToggle({ kind: 'chip', label, checked, onChange: (v) => { write(v); refresh(); } }).el;

  const sr = createSrView('', { withVoice: false });
  const refresh = () => {
    sr.setRoot(config.canvasRole ? 'list' : 'canvas', config.canvasLabel ? 'Tide chart' : '');
    sr.render(BOARD.map((node) => ({ depth: 0, role: ROLE[node.id], name: node.name, exposure: exposureOf(config, node), focused: false })));
  };

  const nodeLine = (node: BoardNode) => {
    const attrs: NodeAttrs = config.nodes[node.id];
    const set = (key: keyof NodeAttrs) => (v: boolean) => (attrs[key] = v);
    const close = node.id === 'slider' ? '>' : node.id === 'yesterday' ? '>' : `>${node.name.split(',')[0]}</div>`;
    const line = h('div', { class: 'tree-line indent-1' }, t(node.markup),
      node.tabindexChip ? chip('tabindex="0"', attrs.tabindex, set('tabindex')) : null,
      chip('inert', attrs.inert, set('inert')),
      chip('aria-hidden="true"', attrs.ariaHidden, set('ariaHidden')),
      t(close));
    if (node.id !== 'yesterday') return [line];
    return [line,
      h('div', { class: 'tree-line indent-2' }, t('<button>Replay</button>  <!-- no longer drawn -->')),
      h('div', { class: 'tree-line indent-1' }, t('</section>'))];
  };

  const markup = h('div', { class: 'code-tree', role: 'group', 'aria-label': 'Markup: toggle attributes' },
    h('div', { class: 'tree-line' }, t('<canvas content="drawable"'),
      chip('role="list"', config.canvasRole, (v) => (config.canvasRole = v)),
      chip('aria-label="Tide chart"', config.canvasLabel, (v) => (config.canvasLabel = v)), t('>')),
    ...BOARD.flatMap(nodeLine),
    h('div', { class: 'tree-line' }, t('</canvas>')));

  const ringLine = () => h('div', { class: 'tree-line indent-1' }, t('if (focusedPath) ctx.drawFocusIfNeeded(focusedPath, document.activeElement);'));
  const handlerBody = h('div', { class: 'lh-handler-body' });
  const renderHandler = () => handlerBody.replaceChildren(
    ...(config.ringLast ? [] : [ringLine()]),
    h('div', { class: 'tree-line indent-1' }, t('fillWedges(); // remembers focusedPath')),
    h('div', { class: 'tree-line indent-1' }, t('ctx.drawElementImage(dawn, …); ctx.drawElementImage(noon, …);')),
    h('div', { class: 'tree-line indent-1' }, t('ctx.drawElementImage(dusk, x, y'),
      chip(', { preserveElementGeometry: true }', config.duskPreserve, (v) => (config.duskPreserve = v)), t(');')),
    h('div', { class: 'tree-line indent-1' }, t('drawJelly(slider); ctx.drawElementImage(readout, …);')),
    ...(config.ringLast ? [ringLine()] : []));
  const ringPlace = createSegmented<'first' | 'last'>({
    label: 'Where the focus ring is drawn',
    value: 'first',
    options: [{ value: 'first', label: 'Ring first' }, { value: 'last', label: 'Ring last' }],
    onChange: (v) => { config.ringLast = v === 'last'; renderHandler(); refresh(); },
  });
  const handler = h('div', { class: 'code-tree', role: 'group', 'aria-label': 'Paint handler' },
    h('div', { class: 'tree-line' }, t('canvas.onpaint = () => {')),
    h('div', { class: 'tree-line indent-1' }, t('ctx.reset();')),
    handlerBody,
    h('div', { class: 'tree-line' }, t('};')));

  const findings = h('ol', { class: 'console lh-findings', 'aria-label': 'Symptoms found by the last sweep' });
  const result = h('div', { class: 'lh-result', 'aria-live': 'polite' });
  const sweep = button({ label: 'Sweep the beam', variant: 'primary', onClick: () => {
    if (won) return;
    const found = auditBoard(config);
    findings.replaceChildren(...found.map((f) => h('li', {}, f.symptom)));
    if (found.length === 0) {
      won = true;
      result.replaceChildren(callout({ kind: 'success', title: 'Every voice is heard', body: 'Nothing silent that should speak, nothing speaking that should be silent.' }));
      const keyboard = !usedPointer;
      ctx.say(keyboard ? 'Audited with the keyboard alone. You are the keeper of this light.' : 'The beam finds every voice. Silence is broken.');
      ctx.completeTrial({ mistakes, stamps: keyboard ? ['lighthouse-keeper'] : [] });
      return;
    }
    mistakes += 1;
    const bugs = bugCount(config);
    result.replaceChildren(callout({ kind: 'error', title: `${bugs} ${bugs === 1 ? 'element still has' : 'elements still have'} symptoms`, body: 'Read what users experience, find the cause in the markup or the paint handler, and sweep again.' }));
    ctx.say('The beam found people still left in the dark.', 'foe');
  } });

  const onPointer = () => (usedPointer = true);
  host.addEventListener('pointerdown', onPointer, true);

  host.append(h('div', { class: 'lh-trial' },
    h('div', { class: 'lh-trial-build' },
      h('h3', { class: 'panel-title' }, 'Markup'), markup,
      h('h3', { class: 'panel-title' }, 'Paint handler'), ringPlace.el, handler,
      h('div', { class: 'panel-actions' }, sweep)),
    h('div', { class: 'lh-trial-view' },
      h('figure', { class: 'view' }, tidePreview(), h('figcaption', {}, 'What eyes see')),
      sr.el, result, findings)));
  renderHandler();
  refresh();
  return () => host.removeEventListener('pointerdown', onPointer, true);
};
