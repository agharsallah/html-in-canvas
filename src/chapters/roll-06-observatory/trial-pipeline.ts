/**
 * Trial phase 1: build the upload pipeline. Move parts from the bin into
 * Setup (runs once) or the paint handler, order them, and launch. The
 * verdict comes from `checkPipeline` in rules.ts.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { h, rich } from '../../ui/dom';
import { checkPipeline, PARTS, type PartId, type PipelineBuild } from './rules';

type Lane = keyof PipelineBuild;
const BIN_ORDER: PartId[] = ['upload', 'decoy-2d', 'bind', 'geometry', 'allocate', 'decoy-teximage', 'gate', 'create', 'draw', 'decoy-gpu', 'filter'];

export interface PipelinePhase {
  onPass(mistakes: number): void;
  say(text: string, foe?: boolean): void;
}

export function mountPipeline(host: HTMLElement, phase: PipelinePhase): () => void {
  const build: PipelineBuild = { setup: [], paint: [] };
  let mistakes = 0;
  const codeOf = (id: PartId) => PARTS.find((p) => p.id === id)!.code;

  const bin = h('ul', { class: 'obs-bin', 'aria-label': 'Parts bin' });
  const lanes: Record<Lane, HTMLOListElement> = {
    setup: h('ol', { class: 'obs-lane', 'aria-label': 'Setup, runs once' }),
    paint: h('ol', { class: 'obs-lane', 'aria-label': 'Paint handler, runs every paint' }),
  };
  const verdict = h('div', { class: 'obs-verdict', 'aria-live': 'polite' });

  const move = (lane: Lane, index: number, delta: number) => {
    const list = build[lane];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target]!, list[index]!];
    render(`${lane}-${target}`);
  };

  const render = (focusKey?: string) => {
    const placed = new Set([...build.setup, ...build.paint]);
    bin.replaceChildren(...BIN_ORDER.filter((id) => !placed.has(id)).map((id) =>
      h('li', { class: 'obs-part' },
        h('code', {}, codeOf(id)),
        h('span', { class: 'obs-part-actions' },
          button({ label: 'Setup', size: 'sm', variant: 'secondary', attrs: { 'aria-label': `Add to setup: ${codeOf(id)}` }, onClick: () => place('setup', id) }),
          button({ label: 'Paint', size: 'sm', variant: 'secondary', attrs: { 'aria-label': `Add to paint: ${codeOf(id)}` }, onClick: () => place('paint', id) })))));
    if (!bin.children.length) bin.append(h('li', { class: 'obs-bin-empty' }, 'The bin is empty.'));

    for (const lane of ['setup', 'paint'] as const) {
      lanes[lane].replaceChildren(...build[lane].map((id, i) =>
        h('li', { class: 'obs-part obs-placed' },
          h('code', {}, codeOf(id)),
          h('span', { class: 'obs-part-actions' },
            button({ label: '↑', size: 'sm', variant: 'ghost', attrs: { 'aria-label': `Move up: ${codeOf(id)}`, 'data-key': `${lane}-${i}-up` }, onClick: () => move(lane, i, -1) }),
            button({ label: '↓', size: 'sm', variant: 'ghost', attrs: { 'aria-label': `Move down: ${codeOf(id)}`, 'data-key': `${lane}-${i}-down` }, onClick: () => move(lane, i, 1) }),
            button({ label: '✕', size: 'sm', variant: 'ghost', attrs: { 'aria-label': `Back to the bin: ${codeOf(id)}` }, onClick: () => {
              build[lane].splice(i, 1);
              render();
            } })))));
      if (!build[lane].length) lanes[lane].append(h('li', { class: 'obs-lane-empty' }, 'Empty'));
    }
    if (focusKey) host.querySelector<HTMLButtonElement>(`[data-key^="${focusKey}-"]`)?.focus();
  };

  const place = (lane: Lane, id: PartId) => {
    build[lane].push(id);
    render();
    bin.querySelector('button')?.focus();
  };

  const launch = button({ label: 'Launch the pipeline', variant: 'primary', onClick: () => {
    const result = checkPipeline(build);
    if (result.ok) {
      verdict.replaceChildren(callout({ kind: 'success', title: 'Uploads on change, geometry in sync.', body: 'The satellite answers clicks where it is drawn.' }));
      phase.say('That is the pipeline from the guide, step for step.');
      launch.disabled = true;
      phase.onPass(mistakes);
      return;
    }
    mistakes += 1;
    verdict.replaceChildren(callout({ kind: 'error', title: `${result.problems.length} problem${result.problems.length === 1 ? '' : 's'}`,
      body: h('ul', {}, ...result.problems.slice(0, 4).map((p) => h('li', {}, rich(p)))) }));
    phase.say('Flat, broken, never updated. Just as we said.', true);
  } });

  host.append(h('div', { class: 'obs-pipeline' },
    h('section', { class: 'panel' }, h('h3', { class: 'panel-title' }, 'Parts bin'),
      h('p', { class: 'panel-help' }, 'Some parts belong to other contexts. Leave them in the bin.'), bin),
    h('section', { class: 'obs-lanes' },
      h('div', { class: 'code-tree' }, h('div', { class: 'tree-line' }, h('code', {}, '// setup: runs once')), lanes.setup),
      h('div', { class: 'code-tree' }, h('div', { class: 'tree-line' }, h('code', {}, 'canvas.onpaint = (event) => {')), lanes.paint, h('div', { class: 'tree-line' }, h('code', {}, '};'))),
      h('div', { class: 'panel-actions' }, launch),
      verdict)));
  render();
  return () => {};
}
