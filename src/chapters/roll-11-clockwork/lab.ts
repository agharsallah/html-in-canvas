/**
 * Lab: wind the clockwork. A model of the explainer's "update the rendering"
 * list, run tick by tick across four frames. Pick where `paint` fires
 * (Option A, B or C), inject events into frame 1, and watch where each one
 * lands on the frame ledger and the 3D gear train. Option A with
 * placeholders plus a WebGL flush jams the clock: the Deadlock.
 */
import { createClockworkScene } from '../../scenes/clockwork-scene';
import { createFrameLedger } from '../../ui/charts/frame-ledger';
import { button, setLabel } from '../../ui/components/button';
import { createObjectives } from '../../ui/components/objectives';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { GEAR_LABELS } from './diorama';
import { createLabControls, INJECT_SHORT, type LabSettings } from './lab-controls';
import { createProbe } from './lab-probe';
import { simulate, STEPS, stepInfo, type InjectId, type Simulation } from './rules';

const ROW = new Map(STEPS.map((step, i) => [step.id, i]));

export const lab: Beat = (host, ctx) => {
  let settings: LabSettings = { option: 'C', aMode: 'placeholders', inject: ['draw-in-paint', 'dom-edit-in-paint'], nested: false };
  let sim: Simulation = simulate(settings);
  let cursor = -1;
  let playTimer = 0;

  const goals = createObjectives([
    { id: 'step-c', text: 'Under Option C, step through a whole frame, from rAF to Commit.' },
    { id: 'next-frame', text: 'Under Option C, watch a DOM edit made inside `paint` land in the next frame.' },
    { id: 'loop', text: 'Switch to Option A or B and make the clockwork loop back to 16.2.1.' },
    { id: 'jam', text: 'Jam the clock: Option A with placeholders and a WebGL `getError()` inside `paint`.' },
  ], () => {
    ctx.completeLab();
    ctx.say('One ring per update, after Paint. That is why Option C won.');
  });

  const sceneHost = h('div', { class: 'clock-scene-host' });
  const scene = createClockworkScene(sceneHost, GEAR_LABELS, ctx.roll.process);
  const ledger = createFrameLedger('Frame ledger (model)');
  const narration = h('p', { class: 'clock-narration', 'aria-live': 'polite' }, 'Press Step to turn the first gear.');
  const summary = h('ul', { class: 'clock-summary', 'aria-label': 'Where each injection landed' });

  const flagsFor = (s: Simulation) => (Object.entries(s.landings) as Array<[InjectId, Simulation['landings'][InjectId]]>)
    .flatMap(([id, at]) => (typeof at === 'number' ? [{ frame: at, label: INJECT_SHORT[id], tone: at === 1 ? 'this' : 'next' }]
      : at === 'jam' ? [{ frame: 1, label: `${INJECT_SHORT[id]}: deadlock`, tone: 'jam' }] : []));

  const badge = (f: Simulation['frames'][number]) => f.jammed ? 'jammed'
    : f.unsettled ? `paint ×${f.handlerRuns}, unsettled` : f.paintFired ? `paint ×${f.handlerRuns}${f.laps > 1 ? `, ${f.laps} laps` : ''}` : 'no paint';

  const render = () => {
    ledger.render({
      rows: STEPS.map((s) => s.short), frames: sim.frames.length, cursor,
      ticks: sim.ticks.map((t) => ({ frame: t.frame, row: ROW.get(t.step)!, kind: t.kind, note: t.note })),
      flags: flagsFor(sim), badges: sim.frames.map(badge),
    });
    const done = cursor >= sim.ticks.length - 1;
    summary.replaceChildren(...(done ? (Object.entries(sim.landings) as Array<[InjectId, unknown]>).map(([id, at]) =>
      h('li', {}, `${INJECT_SHORT[id]}: ${at === 'jam' ? 'deadlock or inconsistent rendering' : typeof at === 'number' ? `lands in frame ${at}` : 'not within 4 frames'}`)) : []));
    stepBtn.disabled = done;
    finishBtn.disabled = done;
  };

  const check = () => {
    const seen = sim.ticks.slice(0, cursor + 1);
    if (settings.option === 'C' && seen.some((t) => t.frame === 1 && t.step === 'commit')) goals.complete('step-c');
    if (settings.option === 'C' && sim.landings['dom-edit-in-paint'] === 2 && seen.some((t) => t.frame === 2 && t.step === 'commit')) goals.complete('next-frame');
    if (settings.option !== 'C' && seen.some((t) => t.kind === 'loop')) goals.complete('loop');
    if (seen.some((t) => t.kind === 'jam') && !goals.isDone('jam')) {
      goals.complete('jam');
      ctx.collect('secret-deadlock');
      ctx.say('The gears seize. A flush that waits for Paint, inside a handler Paint is waiting for.', 'foe');
    }
  };

  const advance = () => {
    if (cursor >= sim.ticks.length - 1) return stop();
    cursor += 1;
    const tick = sim.ticks[cursor]!;
    const info = stepInfo(tick.step);
    narration.textContent = `Frame ${tick.frame}${tick.lap > 1 ? `, lap ${tick.lap}` : ''} · ${info.number ? `${info.number} ` : ''}${info.short}: ${tick.note}`;
    scene.setActive(tick.step);
    if (tick.kind === 'loop') scene.loop();
    if (tick.kind === 'jam') scene.setJammed(true);
    check();
    render();
  };

  const finishFrame = () => {
    const frame = sim.ticks[Math.max(0, cursor + 1)]?.frame;
    while (cursor < sim.ticks.length - 1 && sim.ticks[cursor + 1]!.frame === frame) advance();
  };

  const stop = () => {
    clearInterval(playTimer);
    playTimer = 0;
    setLabel(playBtn, 'Play');
  };

  const reset = () => {
    stop();
    sim = simulate(settings);
    cursor = -1;
    scene.setOption(settings.option);
    scene.setJammed(false);
    scene.setActive(null);
    narration.textContent = 'Press Step to turn the first gear.';
    render();
  };

  const stepBtn = button({ label: 'Step', variant: 'primary', kbd: 'N', onClick: () => (stop(), advance()) });
  const finishBtn = button({ label: 'Finish frame', kbd: 'F', onClick: () => (stop(), finishFrame()) });
  const playBtn = button({ label: 'Play', onClick: () => {
    if (playTimer) return stop();
    setLabel(playBtn, 'Pause');
    playTimer = window.setInterval(advance, 420);
  } });
  const resetBtn = button({ label: 'Reset', variant: 'ghost', onClick: reset });

  const onKey = (event: KeyboardEvent) => {
    const origin = event.target;
    if (origin instanceof Element && origin.closest('input, textarea, dialog[open]')) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'n' || event.key === 'N') stepBtn.click();
    else if (event.key === 'f' || event.key === 'F') finishBtn.click();
  };
  window.addEventListener('keydown', onKey);

  const controls = createLabControls(settings, (next) => {
    settings = next;
    reset();
  });
  const probe = createProbe(ctx.caps, () => ctx.say('That was this browser, for real: rAF, then the observers, then paint. The DOM edit came back next frame.'));

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'clock-lab' },
      h('div', { class: 'clock-main' },
        sceneHost,
        h('div', { class: 'clock-transport', role: 'group', 'aria-label': 'Clock controls' }, stepBtn, finishBtn, playBtn, resetBtn),
        narration,
        ledger.el,
        summary,
        h('p', { class: 'clock-model-note' }, 'A model of the explainer’s step list, not a browser trace. A and B loop with no stated limit; the model stops after 4 laps.')),
      h('div', { class: 'clock-side' }, controls.el, h('div', { class: 'panel' }, h('h3', { class: 'panel-title' }, 'This browser'), probe.el))),
    goals.el));

  reset();
  return () => {
    stop();
    window.removeEventListener('keydown', onKey);
    probe.destroy();
    scene.destroy();
  };
};
