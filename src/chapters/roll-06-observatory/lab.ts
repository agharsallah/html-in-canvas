/**
 * Lab: the satellite. A live form rides on a tilted, swaying satellite.
 * Type into it, flip UNPACK_FLIP_Y_WEBGL, stop gating uploads on
 * changedElements and watch the upload meter, and click the tilted face
 * with projective, flat or no geometry.
 */
import { createUploadMeter } from '../../ui/charts/upload-meter';
import { createObjectives } from '../../ui/components/objectives';
import { createSegmented } from '../../ui/components/segmented';
import { createToggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import type { OrbitMotion } from '../../scenes/orbit-scene';
import type { Beat } from '../shared/chapter';
import { mountSatellite, type Probe } from './lab-satellite';
import { formatBytes, type ControlBox, type HitMode } from './rules';
import { sfx } from '../../ui/fx/lab-sfx';

const MODE_NOTE: Record<HitMode, string> = {
  projective: 'The full projective matrix: the hit region is glued to the tilted face.',
  flat: 'The Flat Earth Society’s box: scale and translate only. Exact for an unrotated card, wrong once it tilts.',
  off: 'No updates: the DOM keeps the last geometry it was told, wherever the face has moved since.',
};

export function buildForm(): HTMLFormElement {
  const field = (id: string, label: string, value: string) =>
    h('label', { class: 'obs-row' }, h('span', { 'data-standin': 'text' }, label),
      h('input', { id: `obs-${id}`, type: 'text', value, 'data-control': id, 'data-standin': 'field', autocomplete: 'off', spellcheck: 'false' }));
  return h('form', { class: 'obs-form', id: 'obs-form', 'aria-label': 'Ground control', onsubmit: ((e: Event) => e.preventDefault()) as EventListener },
    h('p', { class: 'obs-form-title', 'data-standin': 'text' }, 'Ground control'),
    field('callsign', 'Call sign', 'CYAN-1'),
    field('message', 'Message', 'Hello, round world'),
    h('div', { class: 'obs-row' },
      h('button', { type: 'button', id: 'obs-transmit', 'data-control': 'transmit', 'data-standin': 'button' }, 'Transmit'),
      h('output', { id: 'obs-out', 'data-standin': 'text' }, 'Standing by')));
}

export const lab: Beat = (host, ctx) => {
  const form = buildForm();
  const out = form.querySelector('output')!;
  const meter = createUploadMeter();
  const log = h('ol', { class: 'console obs-console', 'aria-live': 'polite', 'aria-label': 'Probe and upload log' });
  const say = (text: string) => {
    log.prepend(h('li', {}, text));
    while (log.children.length > 6) log.lastElementChild?.remove();
  };
  let typed = false;
  let flipOff = false;
  let transmissions = 0;

  const goals = createObjectives([
    { id: 'typed', text: 'Type into the satellite’s form. Only that real change triggers an upload.' },
    { id: 'flip', text: 'Turn `UNPACK_FLIP_Y_WEBGL` off, look, then turn it back on.' },
    { id: 'flood', text: 'Stop checking `changedElements` and watch uploads climb past 20 a second.' },
    { id: 'hit', text: 'With projective geometry, click a control on the moving face and land it.' },
  ], () => {
    ctx.completeLab();
    ctx.say('Round world, live form, honest clicks. The Society is running out of arguments.');
  });

  const controls = (): ControlBox[] => [...form.querySelectorAll<HTMLElement>('[data-control]')].map((el) => ({
    id: el.dataset.control!, label: el.id, x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight,
  }));

  const stageHost = h('div', { class: 'obs-stage' });
  const satellite = mountSatellite(stageHost, {
    caps: ctx.caps,
    colors: ctx.roll.process,
    form,
    controls,
    onUpload(report, reason) {
      meter.record(report.bytes, report.allocated);
      if (!report.ok) say(`upload failed → ${report.error}`);
      else if (reason !== 'unchanged') say(`${reason === 'first' ? 'first upload' : 'changedElements has the form'} → ${report.api}, ${formatBytes(report.bytes)}${report.allocated ? ', allocated' : ''}`);
      if (reason === 'changed' && typed) {
        sfx('beep');
        goals.complete('typed');
      }
    },
    onProbe(probe: Probe) {
      say(`click → ${probe.text}${probe.backFacing ? ' (the face is turned away, so the form is inert)' : ''}`);
      if (probe.backFacing && probe.target === 'canvas') {
        ctx.collect('secret-far-side');
        ctx.say('The far side: the form is turned away and inert, so your click falls through to the canvas.');
      }
      const isControl = !['canvas', 'card'].includes(probe.target);
      if (isControl && !probe.backFacing) sfx('whirr');
      if (isControl && probe.mode === 'projective' && !probe.backFacing && motion.value !== 'still') goals.complete('hit');
      if (probe.mode === 'flat' && !isControl) ctx.say('Missed: the flat box does not match the tilted face.', 'foe');
    },
  });

  form.addEventListener('input', () => {
    typed = true;
    satellite.markChanged();
  });
  form.addEventListener('focusin', () => satellite.markChanged());
  form.addEventListener('focusout', () => satellite.markChanged());
  form.querySelector('button')!.addEventListener('click', () => {
    transmissions += 1;
    out.textContent = `Sent ${transmissions}`;
    typed = true;
    satellite.markChanged();
  });

  const motion = createSegmented<OrbitMotion>({
    label: 'Satellite motion', value: 'sway',
    options: [{ value: 'still', label: 'Still' }, { value: 'sway', label: 'Sway' }, { value: 'spin', label: 'Spin' }],
    onChange: (m) => satellite.setMotion(m),
  });
  const code = (text: string) => h('code', {}, text);
  const flip = createToggle({ label: code('UNPACK_FLIP_Y_WEBGL'), checked: true, description: 'Rows bottom-to-top, as WebGL expects', onChange: (on) => {
    satellite.knobs.flipY = on;
    satellite.markChanged();
    if (!on) flipOff = true;
    else if (flipOff) goals.complete('flip');
    ctx.say(on ? 'Right side up again.' : satellite.native
      ? 'Upside down: your browser applies the flag to element uploads too. The docs never say so; you just saw it.'
      : 'Upside down, in the simulation. The docs do not say whether the flag applies to element uploads; Chrome 157 does apply it.');
  } });
  const prealloc = createToggle({ label: 'Pre-allocate once', checked: true, description: h('span', {}, code('texImage2D(…, null)'), ' only when the size changes'), onChange: (on) => {
    satellite.knobs.preallocate = on;
  } });
  const gated = createToggle({ label: h('span', {}, 'Upload only ', code('changedElements')), checked: true, onChange: (on) => {
    satellite.onlyChanged = on;
    satellite.markChanged();
  } });
  const mips = createToggle({ label: 'Mipmaps instead of LINEAR', description: 'The demo: linear beats mipmaps for text', onChange: (on) => {
    satellite.knobs.mipmaps = on;
    satellite.markChanged();
  } });
  const modeNote = h('p', { class: 'panel-help' }, MODE_NOTE.projective);
  const hitMode = createSegmented<HitMode>({
    label: 'Geometry sent to updateElementGeometry', value: 'projective',
    options: [{ value: 'projective', label: 'Projective' }, { value: 'flat', label: 'Flat' }, { value: 'off', label: 'Off' }],
    onChange: (mode) => {
      satellite.hitMode = mode;
      modeNote.textContent = MODE_NOTE[mode];
      satellite.markChanged();
    },
  });

  const floodTimer = window.setInterval(() => {
    if (!satellite.onlyChanged && meter.rate >= 20) goals.complete('flood');
  }, 500);

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'obs-lab' },
      h('div', { class: 'obs-main' },
        h('figure', { class: 'obs-view' }, stageHost,
          h('figcaption', {}, satellite.native
            ? 'Native: the form is a drawable child of this WebGL canvas. Click it, Tab to it, type.'
            : 'Simulated: a stand-in texture painted from the form on the right. Clicks are mapped through the same matrix.')),
        meter.el,
        log),
      h('div', { class: 'obs-side' },
        satellite.native ? null : h('section', { class: 'panel obs-element' },
          h('h3', { class: 'panel-title' }, 'The element'),
          h('p', { class: 'panel-help' }, 'In native mode this form lives inside the canvas.'),
          form),
        h('section', { class: 'panel' },
          h('h3', { class: 'panel-title' }, 'Upload'),
          h('p', { class: 'panel-help' }, 'API in use: ', code(satellite.api)),
          flip.el, prealloc.el, gated.el, mips.el),
        h('section', { class: 'panel' },
          h('h3', { class: 'panel-title' }, 'Orbit and geometry'),
          motion.el, hitMode.el, modeNote))),
    goals.el));

  return () => {
    clearInterval(floodTimer);
    meter.destroy();
    satellite.destroy();
  };
};
