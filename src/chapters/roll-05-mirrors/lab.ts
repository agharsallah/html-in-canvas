/**
 * Lab: the ghost hunt. A drawable button on a 2D canvas, its ghost (the hit
 * area the DOM believes in) outlined over it. Opt out of automatic geometry,
 * move the button, clip it, clear it, sync it by hand, and click: every click
 * lands on a live scatter chart. Below, a card tilting in 3D shows the same
 * idea with a projective matrix.
 */
import { createMirrorTiltScene } from '../../scenes/mirror-tilt-scene';
import { createHitScatter } from '../../ui/charts/hit-scatter';
import { s } from '../../ui/charts/svg';
import { button } from '../../ui/components/button';
import { createObjectives } from '../../ui/components/objectives';
import { createSegmented } from '../../ui/components/segmented';
import { createToggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { createGhostStage, type Pose } from './ghost-stage';
import { createMatrixReadout } from './matrix-readout';
import { toAffine, type Point } from './rules';

type PoseId = 'home' | 'tilted' | 'corner';
const POSES: Record<PoseId, Pose> = {
  home: { fx: 0.06, fy: 0.12, deg: 0, scale: 1 },
  tilted: { fx: 0.34, fy: 0.42, deg: -16, scale: 1.15 },
  corner: { fx: 0.58, fy: 0.7, deg: 9, scale: 0.9 },
};

const SAY = {
  hit: 'A clean hit: the button heard you.',
  missed: 'Missed. You clicked the drawing, but the DOM thinks the button is somewhere else.',
  ghost: 'A ghost click! Nothing is drawn there, yet the button answered.',
  empty: 'Empty canvas. Nobody home.',
} as const;

const pts = (q: Point[] | null) => (q ? q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') : '');

export const lab: Beat = (host, ctx) => {
  const stageHost = h('div', { class: 'mirror-stage' });
  const stage = createGhostStage(stageHost, ctx.caps);
  const readout = createMatrixReadout();
  const scatter = createHitScatter('Where your clicks went');
  const hitShape = s('polygon', { class: 'ghost-area' });
  const ripple = s('circle', { class: 'ghost-ripple', r: 0, cx: -20, cy: -20 });
  const overlay = s('svg', { class: 'ghost-overlay', 'aria-hidden': 'true' }, hitShape, ripple);
  stage.root.append(overlay);
  const log = h('ol', { class: 'console', 'aria-label': 'Calls made' });
  const call = (text: string) => {
    log.prepend(h('li', {}, text));
    while (log.children.length > 4) log.lastElementChild?.remove();
  };

  let preserve = false;
  let syncedByHand = false;
  let cleared = false;

  const goals = createObjectives([
    { id: 'hit', text: 'Click the drawn button with automatic geometry: a hit.' },
    { id: 'missed', text: 'Turn on `preserveElementGeometry`, move the button, and click it: it misses.' },
    { id: 'ghost', text: 'Catch a ghost: make a click register where nothing is drawn.' },
    { id: 'resync', text: 'Still preserving, sync by hand with `updateElementGeometry`, then hit it.' },
    { id: 'clear', text: 'Call `clearElementGeometry`, then click the drawn button.' },
  ], () => {
    ctx.completeLab();
    ctx.say('You have seen every way a double can drift. Ghost Clicks has nowhere left to hide.');
  });

  const fmt = (n: number) => Math.round(n * 100) / 100;
  const refresh = () => {
    const snap = stage.snapshot();
    const has = !!snap.model.transforms.button;
    if (has) cleared = false;
    readout.update(snap.drawn, snap.reported, { geometry: has, clipped: !!snap.model.clips.button && snap.model.clips.button.height < snap.size.height, native: stage.native });
    overlay.setAttribute('viewBox', `0 0 ${snap.css.width} ${snap.css.height}`);
    hitShape.setAttribute('points', pts(snap.hitQuad));
    scatter.setShapes(snap.css, snap.drawnQuad, snap.hitQuad);
  };
  stage.onUpdate(refresh);

  stage.onClick(({ point, kind }) => {
    scatter.add(point, kind);
    ripple.setAttribute('cx', String(point.x));
    ripple.setAttribute('cy', String(point.y));
    ripple.dataset.kind = kind;
    ripple.classList.remove('ghost-ripple-go');
    void ripple.getBoundingClientRect();
    ripple.classList.add('ghost-ripple-go');
    ctx.say(SAY[kind], kind === 'hit' ? 'caret' : kind === 'empty' ? 'narrator' : 'foe');
    if (kind === 'hit' && !preserve) goals.complete('hit');
    if (kind === 'hit' && preserve && syncedByHand) goals.complete('resync');
    if (kind === 'missed' && cleared) goals.complete('clear');
    else if (kind === 'missed' && preserve) goals.complete('missed');
    if (kind === 'ghost') {
      goals.complete('ghost');
      ctx.stamp('ghost-catcher');
    }
  });

  const poseControl = createSegmented<PoseId>({
    label: 'Where the paint handler draws the button',
    value: 'home',
    options: [{ value: 'home', label: 'Home' }, { value: 'tilted', label: 'Tilted' }, { value: 'corner', label: 'Corner' }],
    onChange: (id) => {
      syncedByHand = false;
      stage.set({ pose: POSES[id] });
    },
  });
  const drift = createToggle({ kind: 'switch', label: 'Drift (redraw every frame)', onChange: (on) => {
    syncedByHand = false;
    stage.set({ drift: on });
  } });
  const preserveToggle = createToggle({ kind: 'switch', label: h('span', {}, h('code', {}, '{ preserveElementGeometry: true }')), onChange: (on) => {
    preserve = on;
    syncedByHand = false;
    stage.set({ preserve: on });
    call(`ctx.drawElementImage(button, x, y${on ? ', { preserveElementGeometry: true }' : ''})`);
  } });
  const half = createToggle({ kind: 'switch', label: 'Draw only the top half (source rect)', onChange: (on) => {
    stage.set({ half: on });
    call(on ? 'ctx.drawElementImage(button, 0, 0, w, h / 2, x, y)' : 'ctx.drawElementImage(button, x, y)');
  } });
  const clip = createToggle({ kind: 'switch', label: h('span', {}, 'Clip hits to the top half (', h('code', {}, 'canvasClip'), ')'), onChange: (on) => {
    stage.clip(on);
    call(`canvas.updateElementGeometry(button, { canvasClip: { x: 0, y: 0, width: w, height: ${on ? 'h / 2' : 'h'} } })`);
  } });
  const sync = button({ label: h('span', {}, 'Sync by hand: ', h('code', {}, 'updateElementGeometry')), size: 'sm', onClick: () => {
    stage.syncNow();
    syncedByHand = true;
    const m = toAffine(stage.snapshot().drawn);
    call(`canvas.updateElementGeometry(button, { canvasTransform: new DOMMatrix([${[m.a, m.b, m.c, m.d, m.e, m.f].map(fmt).join(', ')}]) })`);
    ctx.say(preserve ? 'Synced by hand. Now click the button.' : 'Synced, though the next paint would have done it for you anyway.');
  } });
  const clearButton = button({ label: h('span', {}, h('code', {}, 'clearElementGeometry')), size: 'sm', onClick: () => {
    stage.clearNow();
    cleared = true;
    clip.set(false, true);
    call('canvas.clearElementGeometry(button)');
    ctx.say(preserve ? 'Cleared. The button is still drawn, but no longer hit testable.' : 'Cleared. Careful: with automatic geometry, the next paint draws it and syncs it again.');
  } });

  const tiltHost = h('div', { class: 'mirror-tilt-host' });
  const tilt = createMirrorTiltScene(tiltHost, ctx.roll.process, ctx.caps.webgl);
  const tiltSync = createToggle({ kind: 'switch', checked: true, label: h('span', {}, 'Call ', h('code', {}, 'updateElementGeometry'), ' every frame'), onChange: (on) => tilt.setSync(on) });
  tilt.onClick((kind) => {
    ctx.say(SAY[kind], kind === 'hit' ? 'caret' : 'foe');
    if (kind === 'ghost' && !tiltSync.checked) {
      ctx.collect('secret-mirror');
      ctx.say('The card turned, the clicks stayed. You found the mirror’s edge.');
    }
  });

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'mirror-lab' },
      h('div', { class: 'mirror-main' }, stageHost, readout.el, scatter.el),
      h('div', { class: 'panel mirror-controls' },
        h('h3', { class: 'panel-title' }, 'The paint handler'),
        h('p', { class: 'panel-help' }, 'Where it draws the button each paint.'),
        poseControl.el, drift.el,
        h('h3', { class: 'panel-title' }, 'The draw call'),
        preserveToggle.el, half.el,
        h('h3', { class: 'panel-title' }, 'Geometry calls'),
        clip.el,
        h('div', { class: 'panel-actions' }, sync, clearButton),
        log),
      h('section', { class: 'panel mirror-tilt', 'aria-label': 'The tilted mirror, in 3D' },
        h('h3', { class: 'panel-title' }, 'The tilted mirror (3D)'),
        h('p', { class: 'panel-help' }, 'WebGL never syncs for you. A 4x4 matrix from ', h('code', {}, 'elementToCanvasMatrix()'), ' does. Dashed: the hit area.'),
        tiltHost, tiltSync.el)),
    goals.el));

  refresh();
  return () => {
    tilt.destroy();
    stage.destroy();
  };
};
