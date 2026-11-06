/**
 * Lab: the vault. The same dossier twice: as page content ("what you see")
 * and drawn into a canvas ("what the snapshot holds"). Redaction bars slide
 * over what never reaches the snapshot. A spy script reads things back; a
 * leak meter shows what it could learn, and what it would learn if the
 * photocopier (read-back-allowed rendering) were switched off.
 */
import { button } from '../../ui/components/button';
import { createGauge } from '../../ui/components/gauge';
import { createObjectives } from '../../ui/components/objectives';
import { createSegmented } from '../../ui/components/segmented';
import { createToggle } from '../../ui/components/toggle';
import { createLeakBars } from '../../ui/charts/leak-bars';
import { h, rich } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { createLabCanvas, describeError } from '../shared/lab-canvas';
import { itemById, leakLevel } from './rules';
import { createDossier, SPECIMENS, type FrameOrigin } from './specimens';
import { modelReport, probeVisitedNative } from './spy';
import { sfx } from '../../ui/fx/lab-sfx';

const ORIGIN = { x: 16, y: 16 };

export const lab: Beat = (host, ctx) => {
  const see = createDossier('see');
  const snap = createDossier('snap');
  const lab = createLabCanvas(h('div'), ctx.caps, 'The vault canvas: the dossier as the snapshot holds it');
  lab.adopt(snap.el);
  if (!lab.native) snap.el.dataset.sim = 'true';
  const overlay = h('div', { class: 'vault-overlay', 'aria-hidden': 'true' });
  lab.root.append(overlay);

  let exposed = false;
  let redaction = true;
  let origin: FrameOrigin = 'cross';
  let wentDark = false;
  const itemFor = (item: string) => (item === 'xo-img' && origin === 'same' ? 'same-origin-iframe' : item);

  const goals = createObjectives([
    { id: 'expose', text: 'Expose the dossier and compare both sides.' },
    { id: 'secret', text: 'Spy on something sensitive: the spy reads nothing.' },
    { id: 'safe', text: 'Spy on the caret or the focus ring: the spy reads it, by design.' },
    { id: 'meter', text: 'Switch the photocopier off, watch the leak meter, then switch it back on.' },
  ], () => {
    ctx.completeLab();
    ctx.say('Secrets stay out of the pixels, so the pixels can go anywhere.');
  });

  const log = h('ol', { class: 'console vault-log', 'aria-label': 'Spy log', 'aria-live': 'polite' });
  const say = (text: string, kind: 'leak' | 'safe' | 'blocked', title?: string) => {
    log.prepend(h('li', { 'data-kind': kind }, title ? h('strong', {}, rich(title)) : null, title ? ' ' : null, rich(text)));
    while (log.children.length > 6) log.lastElementChild?.remove();
  };

  const gauge = createGauge('Leak meter');
  const bars = createLeakBars('What a spy can learn, per channel');
  const refreshMeter = () => {
    const level = leakLevel(SPECIMENS.map((s) => itemFor(s.item)), redaction);
    gauge.update(level.leaked / Math.max(1, level.sensitive), `${level.leaked}/${level.sensitive}`, redaction ? 'secrets leaked' : 'LEAKING (hypothetical)');
    const row = (id: string, label: string) => ({ id, label, safe: level.allowed, leaked: level.leaked });
    bars.update([row('pixels', 'Pixel read-back'), row('timing', 'Draw timing'), row('onpaint', 'paint events')], SPECIMENS.length);
  };

  const placeBars = () => {
    overlay.replaceChildren();
    if (!exposed) return;
    for (const specimen of SPECIMENS) {
      const item = itemById(itemFor(specimen.item));
      const body = snap.row(specimen.item)?.querySelector<HTMLElement>('.vault-row-body');
      if (!item || !body || item.status !== 'never') continue;
      const bar = h('span', { class: 'vault-redact', 'data-leak': String(!redaction) }, redaction ? 'redacted' : 'leaking');
      bar.style.cssText = `left:${ORIGIN.x + snap.el.clientLeft + body.offsetLeft}px;top:${ORIGIN.y + snap.el.clientTop + body.offsetTop}px;width:${body.offsetWidth}px;height:${body.offsetHeight}px`;
      overlay.append(bar);
      requestAnimationFrame(() => (bar.dataset.in = 'true'));
    }
  };

  const syncSim = () => {
    if (lab.native) return;
    snap.el.dataset.redact = String(redaction);
    snap.el.querySelector('textarea')?.setAttribute('spellcheck', String(!redaction));
    lab.simulateChange(snap.el);
  };

  lab.onPaint(() => {
    lab.beginFrame();
    if (!exposed) return;
    try {
      lab.drawElement(snap.el, ORIGIN.x, ORIGIN.y);
      goals.complete('expose');
      placeBars();
    } catch (error) {
      say(`drawElementImage threw: ${describeError(error)}`, 'blocked');
    }
  });

  const spy = (item: string) => {
    sfx('tumbler');
    if (!exposed) return say('Expose the dossier first: there is nothing in the canvas to read.', 'blocked');
    const id = itemFor(item);
    const rule = itemById(id);
    let report = modelReport(id, redaction);
    if (id === 'visited' && lab.native && redaction) {
      const link = snap.link;
      const scale = lab.scale();
      report = probeVisitedNative(lab.ctx, {
        x: (ORIGIN.x + snap.el.clientLeft + link.offsetLeft) * scale,
        y: (ORIGIN.y + snap.el.clientTop + link.offsetTop) * scale,
        width: link.offsetWidth * scale, height: link.offsetHeight * scale,
      });
    }
    const tag = report.measured ? 'measured' : lab.native ? 'rule' : 'modelled';
    say(`(${tag}) ${report.text}`, report.readable ? (rule?.status === 'never' ? 'leak' : 'safe') : 'blocked', rule?.label ?? id);
    if (rule?.status === 'never' && !report.readable && !report.inconclusive) goals.complete('secret');
    if ((id === 'caret' || id === 'focus-ring') && report.readable) goals.complete('safe');
    if (id === 'same-origin-iframe') {
      ctx.collect('secret-same-origin');
      ctx.say('Same-origin frames still develop. Only what they pull in from elsewhere is blacked out.');
    }
  };

  const expose = button({ label: 'Expose the dossier', variant: 'primary', onClick: () => {
    sfx('clunk');
    exposed = true;
    syncSim();
    lab.requestPaint();
  } });
  const originPick = createSegmented<FrameOrigin>({
    label: 'Origin of the embedded frame', value: 'cross',
    options: [{ value: 'cross', label: 'Other origin' }, { value: 'same', label: 'Same origin' }],
    onChange: (value) => {
      origin = value;
      see.setOrigin(value);
      snap.setOrigin(value);
      refreshMeter();
      syncSim();
      lab.requestPaint();
    },
  });
  const copier = createToggle({ kind: 'switch', checked: true, label: 'Photocopier on (read-back-allowed rendering)',
    description: 'Off is a thought experiment: no real browser can switch it off.', onChange: (on) => {
      redaction = on;
      if (!on) wentDark = true;
      if (on && wentDark) goals.complete('meter');
      ctx.say(on ? 'Back on. Nothing sensitive reaches the pixels.' : 'Imagine a browser without the rule: every secret is one getImageData away.', on ? 'caret' : 'foe');
      refreshMeter();
      syncSim();
      placeBars();
    } });

  const spyButtons = SPECIMENS.map((s) => button({ label: `Spy: ${s.label}`, size: 'sm', variant: 'secondary', onClick: () => spy(s.item),
    attrs: { title: `The spy ${s.probe}` } }));

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'vault-lab' },
      h('div', { class: 'vault-sides' },
        h('figure', { class: 'vault-side' }, h('figcaption', {}, 'What you see'), h('div', { class: 'vault-see' }, see.el)),
        h('figure', { class: 'vault-side vault-snap' }, h('figcaption', {}, 'What the snapshot holds'), lab.root)),
      h('div', { class: 'panel vault-controls' },
        h('div', { class: 'panel-actions' }, expose),
        h('h3', { class: 'panel-title' }, 'The embedded frame'), originPick.el,
        copier.el,
        h('p', { class: 'panel-help' }, rich(lab.native
          ? 'Native: the right side is a real `drawElementImage()` snapshot, and the link probe is a real `getImageData()`.'
          : 'Simulated: the right side models what the README says a snapshot leaves out.')),
        h('h3', { class: 'panel-title' }, 'Send the spy'), h('div', { class: 'vault-spy-buttons' }, ...spyButtons),
        log),
      h('div', { class: 'vault-meters' }, h('div', { class: 'vault-gauge' }, gauge.el), bars.el)),
    goals.el));

  refreshMeter();
  syncSim();
  lab.requestPaint();
  return () => lab.destroy();
};
