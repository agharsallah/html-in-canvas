/**
 * Figures for "Geometry: canvas to DOM": updateElementGeometry, canvasClip
 * and the hit-test stack. A cursor clicks; the label says what the browser
 * hit, which is decided by the geometry, not by the pixels.
 */
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry, Vector3, type Object3D } from 'three';
import { button } from '../../ui/components/button';
import { createToggle } from '../../ui/components/toggle';
import type { FigureEnv, FigureSpec } from '../stage/figure';
import { C, at, bars, canvasPlate, card, damp, dampVec, dot, frame, lights, sway } from './kit';

/** A pointer that glides to targets and clicks with a ripple. */
function cursor(env: FigureEnv, parent: Object3D) {
  const tip = dot(0.09, C.paper);
  const ripple = new Mesh(new RingGeometry(0.12, 0.16, 32), new MeshBasicMaterial({ color: C.paper, transparent: true, opacity: 0 }));
  parent.add(tip, ripple);
  const tag = env.label('', tip, 'note');
  let age = 1;
  return {
    tip,
    tag,
    moveTo(target: Vector3, dt: number) {
      dampVec(tip.position, target, 5, dt);
    },
    click(text: string, tone: 'good' | 'bad') {
      age = 0;
      ripple.position.copy(tip.position);
      ripple.material.color.set(tone === 'good' ? C.tray : C.bad);
      tag.set(text);
      tag.tone(tone);
    },
    tick(dt: number) {
      age = Math.min(age + dt / 0.7, 1);
      ripple.scale.setScalar(1 + age * 3);
      ripple.material.opacity = 1 - age;
    },
  };
}

/** A translucent, dashed box: where the DOM thinks the element is. */
function hitBox(width: number, height: number, color: string) {
  const group = new Group();
  const fill = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ color, transparent: true, opacity: 0.14, depthWrite: false }));
  const edge = frame(color, true);
  edge.set(0, 0, width, height);
  group.add(fill, edge.lines);
  return group;
}

export const syncGeometryFigure: FigureSpec = {
  label: 'A button drawn in 3D on a WebGL canvas, and its hit-test box. Synced every frame, clicks land on the drawn button. Stale, the box stays behind: clicks on the button miss, and clicks on empty canvas hit it',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);
    const plate = canvasPlate(7, 4);
    root.add(plate.group);

    const drawn = card(2.2, 1.1);
    bars(drawn, 1);
    root.add(drawn.group);
    env.label('<button> as drawn', at(root, new Vector3(0, 1.75, 0.3)), 'tag').anchor = () => drawn.group.position.clone().add(new Vector3(0, 0.85, 0));
    const ghost = hitBox(2.2, 1.1, C.tray);
    root.add(ghost);
    const ghostTag = env.label('hit-test geometry', ghost);
    ghostTag.anchor = () => ghost.position.clone().add(new Vector3(0, -0.8, 0));
    ghostTag.tone('note');

    const pointer = cursor(env, root);
    let synced = true;
    let t = 0;
    let phase = 0;
    let aimAtGhost = false;

    const toggle = createToggle({
      label: 'updateElementGeometry() every frame',
      checked: true,
      onChange: (on) => {
        synced = on;
        env.invalidate();
      },
    });

    return {
      controls: [toggle.el],
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.1);
        t += env.reducedMotion ? dt * 0.3 : dt;
        drawn.group.position.set(Math.sin(t * 0.5) * 1.6, Math.cos(t * 0.37) * 0.5, 0.6);
        drawn.group.rotation.set(Math.sin(t * 0.43) * 0.3, Math.sin(t * 0.6) * 0.8, 0);
        if (synced) {
          dampVec(ghost.position, drawn.group.position, 12, dt);
          ghost.quaternion.slerp(drawn.group.quaternion, 1 - Math.exp(-12 * dt));
        }
        ghost.position.z = Math.max(ghost.position.z, 0.6);

        // Every 1.6 s the pointer clicks: on the button, or on its stale box.
        phase += dt / 1.6;
        const together = ghost.position.distanceTo(drawn.group.position) < 0.35;
        const target = aimAtGhost && !together ? ghost.position : drawn.group.position;
        pointer.moveTo(target.clone().add(new Vector3(0, 0, 0.3)), dt);
        if (phase >= 1) {
          phase = 0;
          if (together) pointer.click('click → <button> ✓', 'good');
          else if (aimAtGhost) pointer.click('click → <button> ✗ ghost click on empty canvas', 'bad');
          else pointer.click('click → <canvas> ✗ missed the button', 'bad');
          aimAtGhost = !aimAtGhost;
        }
        pointer.tick(dt);
      },
    };
  },
};

export const canvasClipFigure: FigureSpec = {
  label: 'A button whose left part is drawn after a source-rect crop. Without canvasClip, clicks on the undrawn right part still hit it; with canvasClip they fall through to the canvas',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);
    const plate = canvasPlate(6.6, 3.8);
    root.add(plate.group);

    const W = 3.6;
    const H = 1.5;
    const drawnW = W * 0.55;
    const drawn = card(drawnW, H);
    bars(drawn, 2);
    drawn.group.position.set(-W / 2 + drawnW / 2, 0.2, 0.05);
    root.add(drawn.group);
    env.label('drawn part', at(root, drawn.group.position.clone().add(new Vector3(0, H / 2 + 0.3, 0))), 'tag');

    const full = hitBox(W, H, C.tray);
    full.position.set(0, 0.2, 0.1);
    root.add(full);
    env.label('canvasTransform: whole border box', at(root, new Vector3(0.9, -0.9, 0.1)), 'note');

    const clip = frame(C.amber);
    clip.set(drawn.group.position.x, 0.2, drawnW + 0.06, H + 0.06);
    clip.lines.position.z = 0.15;
    root.add(clip.lines);
    const clipTag = env.label('canvasClip', at(root, new Vector3(drawn.group.position.x, -0.85, 0.2)), 'accent');

    const pointer = cursor(env, root);
    const onDrawn = new Vector3(drawn.group.position.x, 0.2, 0.4);
    const onBlank = new Vector3(W / 2 - 0.5, 0.2, 0.4);
    let clipped = false;
    let phase = 0;
    let aimBlank = true;
    let shown = 0;

    const toggle = createToggle({
      label: 'Set canvasClip to the drawn part',
      onChange: (on) => {
        clipped = on;
        env.invalidate();
      },
    });

    return {
      controls: [toggle.el],
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.12);
        shown = damp(shown, clipped ? 1 : 0, 6, dt);
        clip.lines.material.opacity = shown;
        clipTag.visible = shown > 0.5;
        pointer.moveTo(aimBlank ? onBlank : onDrawn, dt);
        phase += dt / 1.5;
        if (phase >= 1) {
          phase = 0;
          if (!aimBlank) pointer.click('click → <button> ✓', 'good');
          else if (clipped) pointer.click('click → <canvas> ✓ nothing drawn here', 'good');
          else pointer.click('click → <button> ✗ but nothing is drawn here', 'bad');
          aimBlank = !aimBlank;
        }
        pointer.tick(dt);
      },
    };
  },
};

export const hitOrderFigure: FigureSpec = {
  label: 'Three overlapping drawn cards and a pointer where they overlap. Each geometry update moves that card to the top of the hit-test stack, unless preserveHitTestOrder keeps it in place',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);
    const plate = canvasPlate(6.6, 3.8);
    root.add(plate.group);

    const names = ['A', 'B', 'C'];
    const colors = [C.paper, '#f6d9b0', '#d6f2ea'];
    const rigs = names.map((name, i) => {
      const c = card(2.4, 1.5, colors[i]);
      bars(c, 2);
      c.group.position.set(-0.8 + i * 0.8, 0.5 - i * 0.5, 0.1);
      root.add(c.group);
      env.label(name, at(root, c.group.position.clone().add(new Vector3(-0.85, 0.5, 0.6))), 'code');
      return { c, name, opacity: 1 };
    });
    let stack = [0, 1, 2]; // bottom → top
    let preserve = false;
    const stackTag = env.label('', at(root, new Vector3(0, -1.6, 0.3)), 'note');
    const pointer = cursor(env, root);
    pointer.tip.position.set(0.05, 0.05, 1.4);
    const say = (note?: string) => {
      stackTag.set(`stack (top last): ${stack.map((i) => names[i]).join(', ') || 'empty'}${note ? ` · ${note}` : ''}`);
      const top = stack[stack.length - 1];
      if (top === undefined) pointer.click('click → <canvas>', 'good');
      else pointer.click(`click → ${names[top]}`, 'good');
      env.invalidate();
    };

    const update = (i: number) => {
      const inStack = stack.includes(i);
      if (preserve && inStack) return say(`${names[i]} kept its place`);
      stack = [...stack.filter((s) => s !== i), i];
      say(`${names[i]} went on top`);
    };
    const clear = () => {
      stack = stack.filter((s) => s !== 0);
      say('A cleared');
    };
    say();

    const controls = [
      ...names.map((name, i) => button({ label: `Update ${name}`, size: 'sm', onClick: () => update(i) })),
      button({ label: 'Clear A', size: 'sm', onClick: clear }),
      createToggle({ label: 'preserveHitTestOrder', onChange: (on) => { preserve = on; env.invalidate(); } }).el,
    ];

    return {
      controls,
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.15);
        rigs.forEach((rig, i) => {
          const level = stack.indexOf(i);
          const z = level < 0 ? -0.4 : 0.1 + level * 0.35;
          rig.c.group.position.z = damp(rig.c.group.position.z, z, 6, dt);
          rig.opacity = damp(rig.opacity, level < 0 ? 0.3 : 1, 6, dt);
          rig.c.setOpacity(rig.opacity);
        });
        pointer.tick(dt);
      },
    };
  },
};
