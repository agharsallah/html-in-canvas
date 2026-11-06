/**
 * Lab: the projector booth. Drag the gate (source rect, CSS px) over the
 * ticket and the frame (destination, canvas grid px) over the screen. The
 * call is rebuilt live in whichever of the four forms fits, and projected
 * with the real drawElementImage in native mode, or a faithful CSS
 * simulation (clip to the source, map onto the destination) otherwise.
 */
import { createProjectorScene } from '../../scenes/projector-scene';
import { createProjectorMap } from '../../ui/charts/projector-map';
import { createDial } from '../../ui/components/dial';
import { createObjectives } from '../../ui/components/objectives';
import { createToggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import type { Drawable2DContext } from '../../hic/types';
import type { Beat } from '../shared/chapter';
import { createLabCanvas, describeError } from '../shared/lab-canvas';
import { LAB_TICKET as EL, makeTicket, renderReadout } from './lab-parts';
import { mountNestedBooth } from './lab-nested';
import { createRectHandle } from './rect-handle';
import { argList, overloadFor, project, type DrawCall } from './rules';

const PAD = 28; // room around the ticket in the gate, for outsets

export const lab: Beat = (host, ctx) => {
  const lab = createLabCanvas(h('div'), ctx.caps, 'The projector screen canvas');
  lab.root.classList.add('proj-screen');
  const ticket = makeTicket();
  ticket.id = 'ticket';
  ticket.setAttribute('drawable', '');
  lab.adopt(ticket);

  let crop = false;
  let resize = false;
  let rotate = 0;
  let foundOverflow = false;

  const goals = createObjectives([
    { id: 'crop', text: 'Crop with the gate: the call becomes the 7-argument form.' },
    { id: 'stretch', text: 'Squash or stretch: give the destination a different shape from the source.' },
    { id: 'nine', text: 'Use all nine arguments: crop and size together.' },
    { id: 'tilt', text: 'Tilt the reel with `ctx.rotate` before drawing.' },
    { id: 'nested', text: 'In the booth below, change the inner badge and watch which canvas paints first.' },
  ], () => {
    ctx.completeLab();
    ctx.say('Crop in CSS px, place in grid px, turn the context. You run the projector now.');
  });

  // The gate: a plain, inert copy of the ticket at its CSS size, under the source handle.
  const copy = makeTicket();
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  copy.classList.add('proj-ticket-copy');
  const gate = h('div', { class: 'proj-gate', style: `padding: ${PAD}px` }, copy);
  const source = createRectHandle({
    label: 'Source rect', className: 'pj-rh-source',
    rect: { x: PAD, y: PAD, w: EL.w, h: EL.h },
    bounds: () => ({ x: 0, y: 0, w: EL.w + 2 * PAD, h: EL.h + 2 * PAD }),
    onChange: () => changed(),
  });
  gate.append(source.el);

  const destLayer = h('div', { class: 'proj-dest-layer' });
  lab.root.append(destLayer);
  const dest = createRectHandle({
    label: 'Destination rect', className: 'pj-rh-dest',
    rect: { x: 24, y: 24, w: EL.w, h: EL.h },
    bounds: () => ({ x: -EL.w, y: -EL.h, w: lab.root.clientWidth + 2 * EL.w, h: lab.root.clientHeight + 2 * EL.h }),
    onChange: () => changed(),
  });
  destLayer.append(dest.el);

  const cropToggle = createToggle({ kind: 'switch', label: 'Crop with a source rect', onChange: (on) => {
    crop = on;
    if (!on) source.set({ x: PAD, y: PAD, w: EL.w, h: EL.h });
    changed();
  } });
  const sizeToggle = createToggle({ kind: 'switch', label: 'Give the destination a size', onChange: (on) => {
    resize = on;
    changed();
  } });
  const dial = createDial({ label: 'ctx.rotate', min: -30, max: 30, step: 5, value: 0, unit: '°', onInput: (v) => {
    rotate = v;
    changed();
  } });

  const readout = h('code');
  const errorLog = h('ol', { class: 'console', 'aria-live': 'polite', 'aria-label': 'Console' });
  const map = createProjectorMap();
  const sceneHost = h('div', { class: 'proj-scene-host' });
  const scene = createProjectorScene(sceneHost, ctx.roll.process);

  /** The call the handles describe right now. */
  const currentCall = (): DrawCall => {
    const s = lab.scale();
    const src = source.get();
    const d = dest.get();
    return {
      args: overloadFor(crop, resize),
      sx: Math.round(src.x - PAD), sy: Math.round(src.y - PAD), sw: Math.round(src.w), sh: Math.round(src.h),
      dx: Math.round(d.x * s), dy: Math.round(d.y * s), dw: Math.round(d.w * s), dh: Math.round(d.h * s),
      rotate,
    };
  };

  function changed() {
    source.setEnabled(crop, crop);
    // Without a destination size, the frame is the default size: the source's CSS size.
    if (!resize) {
      const src = source.get();
      const d = dest.get();
      dest.set({ ...d, w: crop ? src.w : EL.w, h: crop ? src.h : EL.h });
    }
    dest.setEnabled(true, resize);
    dest.setRotation(rotate);
    lab.requestPaint();
    lab.simulateChange(ticket);
  }

  const simulate = (c: DrawCall) => {
    const p = project(c, EL, lab.scale());
    const k = 1 / lab.scale();
    const { x, y, w, h: hh } = p.source;
    ticket.dataset.drawn = 'true';
    ticket.style.clipPath = `polygon(${x}px ${y}px, ${x + w}px ${y}px, ${x + w}px ${y + hh}px, ${x}px ${y + hh}px)`;
    ticket.style.transform = `rotate(${c.rotate}deg) translate(${p.dest.x * k}px, ${p.dest.y * k}px) scale(${(p.dest.w * k) / w}, ${(p.dest.h * k) / hh}) translate(${-x}px, ${-y}px)`;
  };

  lab.onPaint(() => {
    lab.beginFrame();
    const c = currentCall();
    try {
      if (lab.native) {
        const g = lab.ctx as Drawable2DContext;
        if (c.rotate) g.rotate((c.rotate * Math.PI) / 180);
        g.drawElementImage(ticket, ...argList(c));
      } else simulate(c);
    } catch (error) {
      errorLog.prepend(h('li', {}, `drawElementImage → ${describeError(error)}`));
      while (errorLog.children.length > 3) errorLog.lastElementChild?.remove();
    }
    report(c);
  });

  const report = (c: DrawCall) => {
    renderReadout(readout, c);
    const p = project(c, EL, lab.scale());
    const grid = { w: lab.canvas.width, h: lab.canvas.height };
    map.update({ element: EL, source: p.source, canvas: grid, dest: p.dest });
    scene.set({
      src: { x: p.source.x / EL.w, y: p.source.y / EL.h, w: p.source.w / EL.w, h: p.source.h / EL.h },
      dest: { x: p.dest.x / grid.w, y: p.dest.y / grid.h, w: p.dest.w / grid.w, h: p.dest.h / grid.h },
      rotate: c.rotate,
    });
    if (c.args === 7) goals.complete('crop');
    if (c.args === 9) goals.complete('nine');
    if (c.rotate) goals.complete('tilt');
    const ratio = (p.dest.w / p.dest.h) / (p.source.w / p.source.h);
    if ((c.args === 5 || c.args === 9) && Math.abs(Math.log(ratio)) > 0.15) goals.complete('stretch');
    const outside = c.sx < 0 || c.sy < 0 || c.sx + c.sw > EL.w || c.sy + c.sh > EL.h;
    if (crop && outside && !foundOverflow) {
      foundOverflow = true;
      ctx.collect('ink-overflow');
      ctx.say('Past the border box! The README says outsets like this can take in ink overflow, such as this glow.');
    }
  };

  const nested = mountNestedBooth(ctx, () => goals.complete('nested'));

  host.append(h('div', { class: 'lab-layout' }, h('div', { class: 'proj-main' },
    h('div', { class: 'proj-lab' },
      h('section', { class: 'panel proj-panel', 'aria-label': 'The gate: source rect' },
        h('h3', { class: 'panel-title' }, 'The gate ', h('span', { class: 'pj-css' }, 'CSS px')),
        h('p', { class: 'panel-help' }, 'The ticket at its CSS size. The dashed margin is outside its border box.'),
        gate, cropToggle.el),
      h('section', { class: 'panel proj-panel', 'aria-label': 'The screen: destination rect' },
        h('h3', { class: 'panel-title' }, 'The screen ', h('span', { class: 'pj-grid' }, 'grid px')),
        h('p', { class: 'panel-help' }, 'Drag the frame, or focus it and use the arrows (Shift resizes).'),
        lab.root, h('div', { class: 'proj-controls' }, sizeToggle.el, dial.el))),
    h('div', { class: 'proj-out' },
      h('div', { class: 'proj-call' }, h('h3', { class: 'panel-title' }, 'The call'), h('pre', { class: 'code proj-readout', 'aria-live': 'polite' }, readout), errorLog, map.el),
      h('figure', { class: 'proj-3d' }, sceneHost, h('figcaption', {}, 'The beam: gate to frame'))),
    nested.el),
    goals.el));

  changed();
  return () => {
    nested.destroy();
    scene.destroy();
    lab.destroy();
  };
};
