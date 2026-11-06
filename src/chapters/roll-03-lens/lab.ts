/**
 * Lab: the pixel microscope. Pick the canvas grid (default, CSS size,
 * device pixels, or grind your own), pick a screen DPR, and read the loupe:
 * your canvas' device pixels above a plain <div>'s. A gauge scores the
 * sharpness, a chart lines up the three grids, and the 3D lens grinds along.
 */
import { createLensScene } from '../../scenes/lens-scene';
import { createGridsChart } from '../../ui/charts/lens-grids';
import { button } from '../../ui/components/button';
import { createDial } from '../../ui/components/dial';
import { createGauge } from '../../ui/components/gauge';
import { createObjectives } from '../../ui/components/objectives';
import { createSegmented } from '../../ui/components/segmented';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { createLensStage } from './lab-stage';
import { createLoupe } from './loupe';
import { analyzeSizing, devicePixels, presetGrid, type GridPreset } from './rules';
import { sfx } from '../../ui/fx/lab-sfx';

const PRESET_CODE: Record<GridPreset, (grind: number) => string> = {
  default: () => '// No ResizeObserver: the grid keeps its default.\n// canvas.width = 300; canvas.height = 150;',
  css: () => '// Sized from contentBoxSize: CSS px, the wrong unit.\ncanvas.width = entry.contentBoxSize[0].inlineSize;\ncanvas.height = entry.contentBoxSize[0].blockSize;',
  device: () => 'const dpc = entry.devicePixelContentBoxSize;\ncanvas.width = dpc[0].inlineSize;\ncanvas.height = dpc[0].blockSize;',
  custom: (grind) => `// Ground by hand: ${grind} grid px per CSS px.\ncanvas.width = Math.round(cssWidth * ${grind});\ncanvas.height = Math.round(cssHeight * ${grind});`,
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const lab: Beat = (host, ctx) => {
  const colors = { paper: ctx.roll.process.paper, ink: ctx.roll.process.ink, accent: ctx.roll.process.accent };
  const stage = createLensStage(ctx.caps, colors);
  const loupe = createLoupe(colors);
  const chart = createGridsChart();
  const gauge = createGauge('Sharpness of the card');
  const sceneHost = h('div', { class: 'lens-lab-scene' });
  const scene = createLensScene(sceneHost, ctx.roll.process);
  let preset: GridPreset = 'default';
  let crispAt: number | null = null;
  let startDpr: number | null = null;
  let lastVerdict = '';

  const goals = createObjectives([
    { id: 'css-trap', text: 'Size the grid to the CSS box on a screen above DPR 1. Is it sharp?' },
    { id: 'crisp', text: 'Grind until the gauge reads 100: one canvas px per device px.' },
    { id: 'screen', text: 'Move to a screen with another DPR, and get back to 100.' },
    { id: 'measure', text: 'Measure the card with `getElementImageDefaultSize()` and compare it with `offsetWidth`.' },
  ], () => {
    ctx.completeLab();
    ctx.say('Grid equals device pixels, on every screen. Blur has nowhere to hide.');
  });

  const presetControl = createSegmented<GridPreset>({
    label: 'Canvas grid',
    value: 'default',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'css', label: 'CSS' },
      { value: 'device', label: 'Device' },
      { value: 'custom', label: 'Grind' },
    ],
    onChange: (value) => {
      preset = value;
      update();
    },
  });
  const grind = createDial({ label: 'Grid px per CSS px', min: 0.5, max: 3, step: 0.05, value: 1, unit: '×', onInput: () => {
    sfx('grind');
    preset = 'custom';
    presetControl.set('custom', true);
    update();
  } });
  const initialDpr = Math.min(3, Math.max(1, Math.round((devicePixelRatio || 1) * 4) / 4));
  const dpr = createDial({ label: 'Screen DPR (simulated)', min: 1, max: 3, step: 0.25, value: initialDpr, onInput: () => update() });

  const code = h('code');
  const realLine = h('p', { class: 'lens-real', 'aria-live': 'polite' });
  const measured = h('p', { class: 'lens-measure', 'aria-live': 'polite' });
  const measure = button({ label: 'Measure the card', variant: 'secondary', size: 'sm', onClick: () => {
    const reading = stage.measureDefaultSize();
    if (!reading) return;
    measured.textContent = `getElementImageDefaultSize(card) → { width: ${fmt(reading.size.width)}, height: ${fmt(reading.size.height)} } grid px` +
      ` (${reading.real ? 'real' : 'modelled'}). card.offsetWidth = ${reading.offset.width} CSS px. ` +
      `Ratio ${(reading.size.width / reading.offset.width).toFixed(3)}: the canvas’ scaleX.`;
    goals.complete('measure');
    ctx.say('Same card, two units: CSS px for layout, grid px for drawing.');
  } });

  const update = () => {
    const m = stage.metrics();
    if (!m) return;
    stage.setGrid(preset, grind.value);
    const screenDpr = dpr.value;
    const device = devicePixels(m.css, screenDpr);
    const grid = presetGrid(preset, m.css, device, grind.value);
    const report = analyzeSizing(m.css, grid, device);
    chart.update({ css: m.css, grid, device });
    gauge.update(report.sharpness / 100, String(report.sharpness), report.verdict);
    scene.setRatio(grid.width / device.width);
    code.textContent = `${PRESET_CODE[preset](grind.value)}\n// → ${grid.width} × ${grid.height} grid px for ${fmt(m.css.width)} × ${fmt(m.css.height)} CSS px at DPR ${screenDpr}`;
    const real = analyzeSizing(m.css, presetGrid(preset, m.css, m.device, grind.value), m.device);
    realLine.textContent = `Your real screen: DPR ${fmt(m.dpr)}, ${m.device.width} × ${m.device.height} device px, grid ${real.grid.width} × ${real.grid.height}: ${real.verdict}.`;
    const nativeSource = stage.native && Math.abs(m.dpr - screenDpr) < 0.01;
    loupe.render({ css: m.css, grid, dpr: screenDpr, source: nativeSource ? stage.canvas : null });

    if (preset === 'css' && screenDpr > 1) {
      if (!goals.isDone('css-trap')) ctx.say('CSS size is still blurry: the grid has to count device pixels, not CSS pixels.', 'foe');
      goals.complete('css-trap');
    }
    if (report.verdict === 'crisp' && lastVerdict !== 'crisp') sfx('glass');
    lastVerdict = report.verdict;
    if (report.verdict === 'crisp') {
      if (crispAt === null) {
        crispAt = screenDpr;
        ctx.say('One blend, straight onto the device grid. Look at the loupe: both rows match.');
      } else if (screenDpr !== crispAt) goals.complete('screen');
      goals.complete('crisp');
    }
  };

  stage.onResize((m) => {
    startDpr ??= m.dpr;
    if (Math.abs(m.dpr - startDpr) > 0.01) {
      ctx.collect('secret-zoom-lens');
      ctx.say(`You zoomed: devicePixelRatio is now ${fmt(m.dpr)}, and the observer reported new device pixels.`);
    }
    update();
  });
  // Native: the real canvas redraws in `paint`; refresh the loupe after it.
  stage.onDraw(() => {
    const m = stage.metrics();
    if (stage.native && m && Math.abs(m.dpr - dpr.value) < 0.01) {
      const device = devicePixels(m.css, dpr.value);
      loupe.render({ css: m.css, grid: presetGrid(preset, m.css, device, grind.value), dpr: dpr.value, source: stage.canvas });
    }
  });

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'lens-lab' },
      h('div', { class: 'panel lens-controls' },
        h('h3', { class: 'panel-title' }, 'The canvas grid'),
        h('p', { class: 'panel-help' }, 'What goes into ', h('code', {}, 'canvas.width'), ' and ', h('code', {}, 'canvas.height'), '.'),
        presetControl.el,
        h('div', { class: 'lens-dials' }, grind.el, dpr.el),
        h('pre', { class: 'code lens-code' }, code),
        h('h3', { class: 'panel-title' }, 'The card'),
        h('div', { class: 'panel-actions' }, measure),
        measured),
      h('div', { class: 'lens-bench' },
        h('figure', { class: 'view lens-view' }, stage.root, h('figcaption', {}, 'The canvas, drawn on your screen'), realLine),
        h('div', { class: 'lens-readouts' }, loupe.el, h('div', { class: 'lens-meter' }, gauge.el, sceneHost)),
        chart.el)),
    goals.el));

  return () => {
    scene.destroy();
    loupe.destroy();
    stage.destroy();
  };
};
