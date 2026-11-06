/**
 * Lab: the lamp room. A drawable "harbour card" canvas, a screen reader view
 * of its children, a reach chart and the lighthouse beam in 3D. Toggle
 * drawable / inert / aria-hidden, stop drawing or clear geometry, and Tab
 * through the canvas to see (and hear) who is still reachable.
 */
import { createLighthouseScene } from '../../scenes/lighthouse-scene';
import { createReachChart } from '../../ui/charts/a11y-reach-chart';
import { createObjectives } from '../../ui/components/objectives';
import { createToggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import type { DrawableCanvas } from '../../hic/types';
import type { Beat } from '../shared/chapter';
import { createLabCanvas, describeError } from '../shared/lab-canvas';
import { createLabNodes, createNodeControls, exposureOfNode, type LabNode } from './lab-nodes';
import { paintHarbour, rectText } from './lab-paint';
import { isGhostFocus, tally } from './rules';
import { createSrView, type OutlineRow } from './sr-view';
import { sfx } from '../../ui/fx/lab-sfx';

const CANVAS_NAME = 'Harbour card';

export const lab: Beat = (host, ctx) => {
  const lab = createLabCanvas(h('div'), ctx.caps, CANVAS_NAME);
  lab.root.classList.add('lh-surface');
  const nodes = createLabNodes();
  const byEl = (el: Element | null): LabNode | undefined => (el ? nodes.find((n) => n.el === el) : undefined);
  nodes.filter((n) => !n.parent).forEach((n) => lab.adopt(n.el));
  const node = (id: LabNode['id']) => nodes.find((n) => n.id === id)!;
  const notice = node('notice');
  const dismissNode = node('dismiss');
  const keeperLog = node('log');
  let lastTab = -Infinity;
  let ghostFound = false;

  const goals = createObjectives([
    { id: 'tab', text: 'Press Tab until focus lands inside the canvas. The browser paints the ring into the snapshot.' },
    { id: 'lamp', text: 'Switch on the lamp ring, then focus a drawn node: `drawFocusIfNeeded()` rings its lamp.' },
    { id: 'bounds', text: 'Make the keeper’s log `drawable` so it is drawn and gains bounds.' },
    { id: 'offscreen', text: 'Pick “Stop + clear” on any node: `clearElementGeometry()` marks it offscreen.' },
    { id: 'retire', text: 'Retire the old notice: stop drawing it, and make it silent, unreachable and unclickable.' },
  ], () => {
    ctx.completeLab();
    ctx.say('Every voice accounted for. Silence has nowhere left to hide.');
  });

  const consoleLog = h('ol', { class: 'console', 'aria-label': 'Console' });
  const log = (text: string) => {
    consoleLog.prepend(h('li', {}, text));
    while (consoleLog.children.length > 4) consoleLog.lastElementChild?.remove();
  };

  const ringLamp = createToggle({ kind: 'switch', label: h('span', {}, 'Ring the focused lamp with ', h('code', {}, 'drawFocusIfNeeded()')), onChange: () => lab.requestPaint() });
  const sr = createSrView(CANVAS_NAME);
  const chart = createReachChart('Who can reach the canvas children', [
    { id: 'announced', label: 'Announced' },
    { id: 'tabbable', label: 'Reached by Tab' },
    { id: 'bounds', label: 'With bounds' },
    { id: 'clickable', label: 'Clickable' },
  ]);
  const sceneHost = h('div', { class: 'lh-scene-host' });
  const scene = createLighthouseScene(sceneHost, nodes.map((n) => ({ tag: `<${n.el.tagName.toLowerCase()}>`, sub: n.name })), ctx.roll.process);

  const rowOf = (node: LabNode): OutlineRow => {
    const exposure = exposureOfNode(node);
    const hasRect = exposure.geometry === 'bounds' || exposure.geometry === 'stale';
    return {
      depth: node.parent ? 1 : 0,
      role: node.role,
      name: node.name,
      exposure,
      rect: hasRect ? rectText(node.el, lab.canvas) : undefined,
      focused: document.activeElement === node.el,
    };
  };

  const refresh = () => {
    const rows = nodes.map(rowOf);
    sr.render(rows);
    const t = tally(rows.map((r) => r.exposure));
    chart.update([
      { id: 'announced', label: 'Announced', value: t.announced },
      { id: 'tabbable', label: 'Reached by Tab', value: t.tabbable },
      { id: 'bounds', label: 'With bounds', value: t.bounds },
      { id: 'clickable', label: 'Clickable', value: t.hitTestable },
    ], t.total);
    scene.setStates(rows.map((r) => ({ ...r.exposure, focused: r.focused })));

    // Lets the simulated layer mirror hit testing (see lighthouse.css).
    nodes.forEach((n, i) => (n.el.dataset.geom = rows[i]!.exposure.geometry));
    if (rows[nodes.indexOf(keeperLog)]!.exposure.geometry === 'bounds') goals.complete('bounds');
    if (rows.some((r) => r.exposure.geometry === 'offscreen')) goals.complete('offscreen');
    const dismiss = rows[nodes.indexOf(dismissNode)]!.exposure;
    if (notice.draw !== 'drawn' && !dismiss.announced && !dismiss.tabbable && !dismiss.hitTestable) goals.complete('retire');
  };

  const controls = nodes.filter((n) => !n.parent).map((node) => createNodeControls(node, {
    changed: (changed) => {
      lab.simulateChange(changed.el);
      lab.requestPaint();
      refresh();
    },
    clearGeometry: (target) => {
      target.everDrawn = false;
      if (lab.native) (lab.canvas as DrawableCanvas).clearElementGeometry?.(target.el);
      log(`canvas.clearElementGeometry(${target.el.tagName.toLowerCase()})`);
    },
  }));

  let retries = 0;
  lab.onPaint(() => {
    const { ringed, errors } = paintHarbour(lab, nodes, { ringLamp: ringLamp.checked, colors: ctx.roll.process });
    if (ringed) goals.complete('lamp');
    errors.forEach(({ node: failed, error }) => log(`drawElementImage(${failed.el.tagName.toLowerCase()}) → ${describeError(error)}`));
    // A just-made drawable may have no snapshot until the next update: try once more.
    retries = errors.length ? retries + 1 : 0;
    if (errors.length && retries < 3) lab.requestPaint();
    // Geometry only exists after drawing: read it back once this paint is done.
    queueMicrotask(refresh);
  });

  // Focus changes are visual changes (they land in changedElements); the
  // simulation reports them the same way.
  const onFocus = (event: FocusEvent) => {
    const target = byEl(event.target as Element);
    lab.simulateChange((target?.parent ?? target)?.el ?? lab.canvas);
    lab.requestPaint();
    if (event.type !== 'focusin' || !target) return refresh();
    const row = rowOf(target);
    sfx('sonar');
    sr.speak(row);
    if (performance.now() - lastTab < 600) goals.complete('tab');
    if (isGhostFocus(row.exposure) && !ghostFound) {
      ghostFound = true;
      ctx.collect('secret-ghost-focus');
      ctx.say('Ghost focus! Tab reached a node that `aria-hidden` silenced. `inert` would have closed that door.', 'foe');
    }
    refresh();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Tab') lastTab = performance.now();
  };
  lab.root.addEventListener('focusin', onFocus);
  lab.root.addEventListener('focusout', onFocus);
  window.addEventListener('keydown', onKey, true);

  node('horn').el.addEventListener('click', () => {
    sfx('horn');
    log('click → Sound the foghorn: HOOOOOO');
  });
  dismissNode.el.addEventListener('click', () => {
    const ghost = notice.draw !== 'drawn';
    log(ghost ? 'click → Dismiss, on a notice that is not drawn any more!' : 'click → Dismiss');
    if (ghost) ctx.say('You clicked a button nobody can see. Stale geometry still catches clicks.', 'foe');
  });

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'lh-lab' },
      h('div', { class: 'panel lh-controls' },
        h('h3', { class: 'panel-title' }, 'The canvas children'),
        h('p', { class: 'panel-help' }, 'Each chip sets the real attribute. “Stop” leaves the old geometry; “Stop + clear” calls ', h('code', {}, 'clearElementGeometry()'), '.'),
        ...controls.map((c) => c.el),
        ringLamp.el),
      h('div', { class: 'lh-stage' },
        h('figure', { class: 'view' }, lab.root, h('figcaption', {}, 'What eyes see (Tab into it)')),
        sr.el,
        h('div', { class: 'lh-charts' }, chart.el, h('figure', { class: 'view' }, sceneHost, h('figcaption', {}, 'The beam: lit voices, dark silence, floating = no geometry'))),
        consoleLog)),
    goals.el));

  refresh();
  lab.requestPaint();
  return () => {
    window.removeEventListener('keydown', onKey, true);
    lab.root.removeEventListener('focusin', onFocus);
    lab.root.removeEventListener('focusout', onFocus);
    scene.destroy();
    lab.destroy();
  };
};
