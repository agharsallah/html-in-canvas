/**
 * Lab: the crucible. A live card runs through a shader with four dials.
 * Heat and grain only change colour; ripple and melt move pixels away from
 * the hit region. Click the card under both and compare. Then theme the
 * shader from CSS, and work the WebGPU crucible's invisible slider.
 */
import { createGpuPipelineChart, type StageState } from '../../ui/charts/gpu-pipeline';
import { button } from '../../ui/components/button';
import { createDial, type Dial } from '../../ui/components/dial';
import { createObjectives } from '../../ui/components/objectives';
import { createSegmented } from '../../ui/components/segmented';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { mountCrucible, type CrucibleClick } from './lab-crucible';
import { mountGpuCrucible } from './lab-gpu';
import { DRIFT_TOLERANCE, maxDrift, type Box, type Effects } from './rules';
import { sfx } from '../../ui/fx/lab-sfx';

const SWATCHES = [
  { value: '#ff5a1f', label: 'Bronze' },
  { value: '#ffb067', label: 'Gold' },
  { value: '#7a1fff', label: 'Violet' },
] as const;

export function buildCard(): HTMLElement {
  const control = (id: string, label: string) => h('button', { type: 'button', 'data-control': id, 'data-standin': 'button', id: `fdy-${id}` }, label);
  return h('div', { class: 'fdy-card', id: 'fdy-card', style: '--heat: #ff5a1f' },
    h('p', { class: 'fdy-card-title', 'data-standin': 'text' }, 'Pour order #7'),
    h('p', { class: 'fdy-card-line', 'data-standin': 'text' }, 'Alloy: bronze, 1080 °C'),
    h('div', { class: 'fdy-card-row' }, control('pour', 'Pour'), control('cool', 'Cool')),
    h('output', { class: 'fdy-card-out', 'data-standin': 'text' }, 'Ready'));
}

export const lab: Beat = (host, ctx) => {
  const card = buildCard();
  const out = card.querySelector('output')!;
  const log = h('ol', { class: 'console fdy-console', 'aria-live': 'polite', 'aria-label': 'Click log' });
  const say = (text: string) => {
    log.prepend(h('li', {}, text));
    while (log.children.length > 5) log.lastElementChild?.remove();
  };
  const chart = createGpuPipelineChart();
  let uploads = 0;
  let gpuInput = false;
  let gpuApi = '';

  const goals = createObjectives([
    { id: 'colour', text: 'Heat the card (colour only) and click a button through the shader: it works.' },
    { id: 'melt', text: 'Melt or ripple it, then click a button where you *see* it. Watch the click miss.' },
    { id: 'theme', text: 'Change the heat colour in CSS. The shader reads it with `getComputedStyle`.' },
    { id: 'gpu', text: 'Move the WebGPU crucible’s invisible slider (drag it, or Tab and use the arrow keys).' },
  ], () => {
    ctx.completeLab();
    ctx.say('Colour is yours to play with. Position belongs to the geometry. The Melt has nothing left to bend.');
  });

  const boxes = (): Box[] => [...card.querySelectorAll<HTMLElement>('[data-control]')].map((el) => ({
    id: el.dataset.control!, x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight,
  }));

  const stageHost = h('div', { class: 'fdy-stage' });
  const crucible = mountCrucible(stageHost, {
    caps: ctx.caps,
    card,
    boxes,
    onUpload: () => {
      uploads += 1;
      refresh();
    },
    onClick: (click: CrucibleClick) => {
      const drift = maxDrift(crucible.effects);
      if (click.hit) sfx('sizzle');
      say(`click → browser hit ${click.hit ? `#fdy-${click.hit}` : 'no control'}; you saw ${click.seen ? `#fdy-${click.seen}` : 'no control'}`);
      if (click.hit && click.hit === click.seen && drift <= DRIFT_TOLERANCE && crucible.effects.heat >= 0.3) goals.complete('colour');
      if (drift > DRIFT_TOLERANCE && click.seen && click.seen !== click.hit) {
        goals.complete('melt');
        ctx.collect('secret-melted-miss');
        ctx.say(`You aimed at what you saw. The browser hit-tests the geometry, ${Math.round(click.drift)} px away.`, 'foe');
      }
    },
  });

  let pours = 0;
  card.addEventListener('click', (event) => {
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-control]')?.dataset.control;
    if (!id) return;
    sfx(id === 'pour' ? 'pour' : 'sizzle');
    pours += 1;
    out.textContent = id === 'pour' ? `Poured ${pours}` : `Cooling ${pours}`;
    crucible.markChanged();
  });
  card.addEventListener('focusin', () => crucible.markChanged());
  card.addEventListener('focusout', () => crucible.markChanged());

  const refresh = () => {
    const e = crucible.effects;
    const vertex: StageState = e.melt > 0 ? 'moves' : 'idle';
    const fragment: StageState = e.ripple > 0 ? 'moves' : e.heat > 0 || e.grain > 0 ? 'colour' : 'idle';
    chart.update({
      uploads,
      api: crucible.native ? 'texElementSubImage2D' : 'stand-in',
      texture: `${card.offsetWidth}×${card.offsetHeight} css`,
      vertex: { state: vertex, note: e.melt > 0 ? `melt ${e.melt} px` : 'flat' },
      fragment: { state: fragment, note: e.ripple > 0 ? `ripple ${e.ripple} px` : fragment === 'colour' ? 'colour' : 'pass' },
      drift: maxDrift(e),
      tolerance: DRIFT_TOLERANCE,
    });
  };

  const dial = (label: string, key: keyof Effects, max: number, unit: string, scale = 1): Dial => createDial({
    label, min: 0, max, value: crucible.effects[key] * scale, unit, onInput: (v) => {
      crucible.setEffects({ [key]: v / scale });
      refresh();
    },
  });
  const dials = {
    heat: dial('Heat', 'heat', 100, '%', 100),
    grain: dial('Grain', 'grain', 100, '%', 100),
    ripple: dial('Ripple', 'ripple', 24, ' px'),
    melt: dial('Melt', 'melt', 60, ' px'),
  };
  const preset = (label: string, e: Effects) => button({ label, size: 'sm', variant: 'secondary', onClick: () => {
    sfx(e.melt > 0 ? 'pour' : 'sizzle');
    crucible.setEffects(e);
    dials.heat.set(e.heat * 100);
    dials.grain.set(e.grain * 100);
    dials.ripple.set(e.ripple);
    dials.melt.set(e.melt);
    refresh();
  } });

  const swatch = createSegmented<string>({
    label: 'Heat colour (the --heat custom property)', value: SWATCHES[0].value,
    options: SWATCHES.map((s) => ({ value: s.value, label: s.label })),
    onChange: (value) => {
      card.style.setProperty('--heat', value);
      gpuHost.style.setProperty('--heat', value);
      const read = crucible.readTheme();
      gpu.refresh();
      say(`getComputedStyle(card).getPropertyValue("--heat") → ${read}`);
      goals.complete('theme');
    },
  });

  const gpuHost = h('div', { class: 'fdy-gpu-host' });
  const gpu = mountGpuCrucible({
    caps: ctx.caps,
    onInput: () => (gpuInput = true),
    onUpload: (api) => {
      gpuApi = api;
      apiNote.textContent = `Upload: ${api}`;
      if (gpuInput) goals.complete('gpu');
    },
  });
  const apiNote = h('p', { class: 'panel-help' }, 'Upload: waiting for the first paint');
  gpuHost.append(gpu.el);

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'fdy-lab' },
      h('div', { class: 'fdy-main' },
        h('figure', { class: 'fdy-view' }, stageHost,
          h('figcaption', {}, crucible.native
            ? 'Native: the card is a drawable child of this WebGL canvas, uploaded with texElementSubImage2D. Its hit region is the unmelted plane.'
            : 'Simulated: a stand-in texture painted from the card on the right. Clicks go through the same unmelted geometry.')),
        log),
      h('div', { class: 'fdy-side' },
        crucible.native ? null : h('section', { class: 'panel' }, h('h3', { class: 'panel-title' }, 'The card'),
          h('p', { class: 'panel-help' }, 'In native mode it lives inside the canvas.'), card),
        h('section', { class: 'panel' }, h('h3', { class: 'panel-title' }, 'Shader'),
          h('div', { class: 'fdy-dials' }, dials.heat.el, dials.grain.el, dials.ripple.el, dials.melt.el),
          h('div', { class: 'panel-actions' },
            preset('Colour only', { heat: 0.8, grain: 0.3, ripple: 0, melt: 0 }),
            preset('Melt it', { heat: 0.8, grain: 0.2, ripple: 6, melt: 40 }))),
        h('section', { class: 'panel' }, h('h3', { class: 'panel-title' }, 'Theme through JS'),
          h('p', { class: 'panel-help' }, 'Like the jelly slider: CSS decides the colour, JS reads it with getComputedStyle, the shader gets a uniform.'),
          swatch.el),
        h('section', { class: 'panel' }, h('h3', { class: 'panel-title' }, 'The WebGPU crucible'), gpuHost, apiNote)),
      h('div', { class: 'fdy-wide' }, chart.el)),
    goals.el));
  refresh();
  void gpu.ready.then(() => gpuApi || null);

  return () => {
    gpu.destroy();
    crucible.destroy();
  };
};
