/**
 * Lab: run the railway. Set how often paint captures an ElementImage, how
 * long the worker takes to draw, and whether images are closed or skipped.
 * Watch wagons in 3D, the yard ledger, and the event log.
 *
 * Native mode runs the explainer's OffscreenCanvas example for real (a Vite
 * worker module); otherwise the pure model in sim.ts runs, labelled.
 */
import { createRailwayScene } from '../../scenes/railway-scene';
import { createRailLedger } from '../../ui/charts/rail-ledger';
import { button } from '../../ui/components/button';
import { createDial } from '../../ui/components/dial';
import { createObjectives } from '../../ui/components/objectives';
import { createToggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { createSimEngine, type RailEngine, type RailListener } from './engine';
import { createLabReadouts } from './lab-readouts';
import { createNativeEngine, type NativeRailEngine } from './native-engine';
import { LATE_MS, type RailEvent, type RailSettings } from './sim';
import { createSimPlatforms, type SimPlatforms } from './sim-view';
import { sfx } from '../../ui/fx/lab-sfx';

const SAMPLE_MS = 100;

export const lab: Beat = (host, ctx) => {
  const settings: RailSettings = { captureEvery: 2, workerDelayMs: 10, closeImages: true, skipToNewest: false };
  let lastLate = -Infinity;
  let tidySince = -1;
  let expressSince = -1;
  let expressFound = false;

  const goals = createObjectives([
    { id: 'drawn', text: 'Ship a snapshot and watch the worker draw it.' },
    { id: 'geometry', text: 'Catch an `elementgeometryupdate` coming home and read its `elements`.' },
    { id: 'late', text: 'Make a late train: slow the worker until a snapshot is drawn more than 100 ms after its capture.' },
    { id: 'leak', text: 'Switch `close()` off and let 20 open ElementImages pile up in the yard.' },
    { id: 'tidy', text: 'Then turn `close()` back on and sweep the yard: under 3 open images and no late train for two seconds.' },
  ], () => {
    ctx.completeLab();
    ctx.say('Close what you are done with, draw the newest, and the Late Train runs on time.');
  });

  const yardHost = h('div', { class: 'rail-yard' });
  const scene = createRailwayScene(yardHost, ctx.roll.process);
  const ledger = createRailLedger(LATE_MS);
  const readouts = createLabReadouts();
  let platforms: SimPlatforms | null = null;

  const onEvent: RailListener = (event: RailEvent) => {
    switch (event.kind) {
      case 'capture':
        scene.depart(event.id);
        platforms?.capture(event.id);
        break;
      case 'draw':
        scene.draw(event.id, event.late);
        scene.retire(event.id);
        platforms?.draw(event.id, event.late);
        goals.complete('drawn');
        if (event.late) {
          sfx('whistle');
          lastLate = performance.now();
          goals.complete('late');
        }
        break;
      case 'close':
      case 'drop':
        if (event.kind === 'drop' || event.skipped) {
          scene.retire(event.id);
          platforms?.forget(event.id);
        }
        break;
      case 'geometry':
        scene.geometry();
        goals.complete('geometry');
        readouts.geometry(event.elements ?? ['#rail-form'], event.staleness);
        break;
      case 'arrive':
        break;
    }
    readouts.log(event);
  };

  let engine: RailEngine;
  let native: NativeRailEngine | null = null;
  if (ctx.caps.elementImage && ctx.caps.canvas2d) {
    try {
      native = createNativeEngine({ ...settings }, onEvent);
    } catch (error) {
      console.warn('[railway] native worker unavailable, simulating instead', error);
    }
  }
  if (native) {
    engine = native;
  } else {
    platforms = createSimPlatforms();
    engine = createSimEngine({ ...settings }, onEvent);
  }
  const apply = () => engine.set({ ...settings });

  const captureDial = createDial({ label: 'Paints per capture', min: 1, max: 8, value: settings.captureEvery, onInput: (v) => {
    settings.captureEvery = v;
    apply();
  } });
  const delayDial = createDial({ label: 'Worker draw cost', min: 0, max: 250, step: 10, value: settings.workerDelayMs, unit: ' ms', onInput: (v) => {
    settings.workerDelayMs = v;
    apply();
  } });
  const closeToggle = createToggle({ kind: 'switch', checked: true, label: h('span', {}, 'Worker calls ', h('code', {}, 'image.close()'), ' when done'), onChange: (on) => {
    settings.closeImages = on;
    apply();
  } });
  const skipToggle = createToggle({ kind: 'switch', label: 'Skip to the newest image when several wait', onChange: (on) => {
    settings.skipToNewest = on;
    apply();
  } });

  const sweep = button({ label: 'Sweep the yard: close kept and waiting images', variant: 'secondary', size: 'sm', onClick: () => {
    sfx('chug');
    engine.sweep();
  } });

  const sampler = window.setInterval(() => {
    const stats = engine.stats();
    const now = performance.now();
    ledger.push({ open: stats.open, inFlight: stats.inFlight, latency: stats.latency });
    readouts.update(stats);
    scene.setPile(stats.open - stats.inFlight);

    if (!settings.closeImages && stats.open >= 20) goals.complete('leak');
    const tidy = goals.isDone('leak') && goals.isDone('late') && settings.closeImages && stats.open < 3 && now - lastLate > 2000;
    tidySince = tidy ? (tidySince < 0 ? now : tidySince) : -1;
    if (tidy && now - tidySince >= 2000) goals.complete('tidy');

    const express = settings.captureEvery === 1 && settings.workerDelayMs >= 40 && stats.open <= 3 && now - lastLate > 3000 && stats.draws > 0;
    expressSince = express ? (expressSince < 0 ? now : expressSince) : -1;
    if (express && !expressFound && now - expressSince >= 3000) {
      expressFound = true;
      ctx.collect('secret-express');
      ctx.say('Every frame captured, a slow worker, and still on time. That is the express.');
    }
  }, SAMPLE_MS);

  const stations = native
    ? h('div', { class: 'rail-platforms', 'data-native': 'true' },
      h('div', { class: 'rail-platform', 'data-side': 'worker' },
        h('p', { class: 'rail-platform-name' }, 'The canvas, drawn by a real worker'), native.view,
        h('p', { class: 'panel-help' }, 'The form is live: once its geometry is home you can click and type in it.')))
    : h('div', { class: 'rail-platforms' }, platforms!.main, platforms!.worker);

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'rail-lab' },
      h('div', { class: 'rail-main' }, yardHost, stations, ledger.el),
      h('div', { class: 'panel rail-side' },
        h('h3', { class: 'panel-title' }, 'Timetable'),
        h('div', { class: 'rail-dials' }, captureDial.el, delayDial.el),
        closeToggle.el, skipToggle.el, sweep,
        readouts.el)),
    goals.el));

  return () => {
    clearInterval(sampler);
    readouts.destroy();
    engine.destroy();
    platforms?.destroy();
    ledger.destroy();
    scene.destroy();
  };
};
