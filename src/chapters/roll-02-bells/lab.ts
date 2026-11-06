/**
 * Lab: the bell inspector. A drawable card with an input, a colour button and
 * a spinning gear. Every paint event rings the bell and is logged with its
 * changedElements. Toggle a requestPaint() loop to hear the difference.
 */
import { createBellScene } from '../../scenes/bell-scene';
import { createPaintTimeline } from '../../ui/charts/paint-timeline';
import { button } from '../../ui/components/button';
import { createObjectives } from '../../ui/components/objectives';
import { throttledLoop } from '../../ui/fx/loop';
import { createToggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { createLabCanvas } from '../shared/lab-canvas';
import { sfx } from '../../ui/fx/lab-sfx';

const HUES = ['#b5762c', '#7a4f2a', '#2f6f6a', '#a4433b'];
const QUIET_MS = 2000;

export const lab: Beat = (host, ctx) => {
  const lab = createLabCanvas(h('div'), ctx.caps, 'The bell tower canvas');
  let count = 0;
  let hue = 0;
  let spinFrame = 0;
  let quietTimer = 0;

  const goals = createObjectives([
    { id: 'changed', text: 'Ring the bell with a real change: `changedElements` lists the card.' },
    { id: 'empty', text: 'Ring it with a bare `requestPaint()` loop: `changedElements` is empty.' },
    { id: 'quiet', text: 'Turn everything off and let the bell stay quiet for two seconds.' },
  ], () => {
    ctx.completeLab();
    ctx.say('Changes ring the bell. Requests ring it too. Silence costs nothing.');
  });

  const input = h('input', { type: 'text', class: 'ui-field', value: 'ding', 'aria-label': 'Type to change the card' });
  const card = h('div', { class: 'bell-card', id: 'bell-card', drawable: true },
    h('p', { class: 'bell-card-title' }, 'The tower card'),
    h('label', {}, 'Message ', input),
    button({ label: 'Change colour', variant: 'secondary', size: 'sm', onClick: () => {
      hue = (hue + 1) % HUES.length;
      card.style.setProperty('--card-accent', HUES[hue]!);
      lab.simulateChange(card);
    } }),
    h('span', { class: 'bell-gear', 'aria-hidden': 'true' }, '⚙'));
  lab.adopt(card);
  input.addEventListener('input', () => lab.simulateChange(card));

  const spin = createToggle({ kind: 'switch', label: 'Spin the gear (a CSS animation)', onChange: (on) => {
    card.dataset.spin = String(on);
    // Assumption, not a documented fact: a running CSS animation changes the
    // snapshot every frame, so we expect one paint per frame. The explainer
    // doesn't cover animations inside drawables. The simulation reports one
    // change per frame; natively, the paint log shows what Chrome really does.
    const tick = () => {
      if (!spin.checked) return;
      lab.simulateChange(card);
      spinFrame = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(spinFrame);
    if (on) tick();
  } });
  const loop = createToggle({ kind: 'switch', label: h('span', {}, 'Call ', h('code', {}, 'requestPaint()'), ' at the end of every paint'), onChange: (on) => {
    if (on) lab.requestPaint();
  } });

  const bellHost = h('div', { class: 'bell-scene-host' });
  const bell = createBellScene(bellHost, ctx.roll.process);
  const counter = h('p', { class: 'bell-count' }, '0 paints');
  const timeline = createPaintTimeline();
  // One timeline column per rendering opportunity (capped at 60 fps so
  // the strip covers the same time span on 60 Hz and 120 Hz displays).
  const stopTicks = throttledLoop(60, () => timeline.tick());
  const log = h('ol', { class: 'console', 'aria-label': 'Paint log' });

  const armQuiet = () => {
    clearTimeout(quietTimer);
    quietTimer = window.setTimeout(() => {
      if (!spin.checked && !loop.checked && goals.isDone('changed') && goals.isDone('empty')) {
        goals.complete('quiet');
        bellHost.dataset.quiet = 'true';
      }
    }, QUIET_MS);
  };

  lab.onPaint((changed) => {
    lab.beginFrame();
    lab.drawElement(card, 16, 16);
    count += 1;
    // A real change rings the bell; a bare requestPaint() loop stays silent.
    if (changed.length) sfx('bell');
    counter.textContent = `${count} ${count === 1 ? 'paint' : 'paints'}`;
    bellHost.dataset.quiet = 'false';

    const names = changed.map((el) => `#${el.id || el.tagName.toLowerCase()}`);
    bell.ring(names.length ? 'change' : 'request');
    timeline.record(names);
    log.prepend(h('li', { 'data-empty': String(!names.length) }, `paint  changedElements: [${names.join(', ')}]`));
    while (log.children.length > 7) log.lastElementChild?.remove();

    if (changed.length) goals.complete('changed');
    else if (loop.checked) goals.complete('empty');
    if (loop.checked) lab.requestPaint();
    armQuiet();
  });

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'bell-lab' },
      h('div', { class: 'bell-main' },
        h('div', { class: 'bell-stage' }, lab.root, h('div', { class: 'bell-meter' }, bellHost, counter)),
        timeline.el),
      h('div', { class: 'panel bell-side' },
        h('h3', { class: 'panel-title' }, 'Make it ring'),
        h('p', { class: 'panel-help' }, 'Typing and changing colour are real changes. The spinning gear should change the snapshot every frame (an assumption: the docs don’t cover animations, so watch the log). The loop is a bare request.'),
        spin.el, loop.el,
        h('h3', { class: 'panel-title' }, 'Paint log'),
        log)),
    goals.el));

  lab.requestPaint();
  return () => {
    clearTimeout(quietTimer);
    cancelAnimationFrame(spinFrame);
    stopTicks();
    timeline.destroy();
    bell.destroy();
    lab.destroy();
  };
};
