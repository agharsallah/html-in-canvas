/**
 * Figures for "The paint loop": the rendering pipeline, changedElements,
 * requestPaint(), canvas-now-DOM-next-frame, and reverse tree order.
 */
import { Color, Group, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
import { button } from '../../ui/components/button';
import { createToggle } from '../../ui/components/toggle';
import type { FigureSpec } from '../stage/figure';
import { C, at, along, arc, bars, canvasPlate, card, damp, dot, lights, sway, wire } from './kit';

/** One lap of the pulse = one rendering update. */
export const paintPipelineFigure: FigureSpec = {
  label: 'The steps of a rendering update on a loop. A pulse runs through them every frame; the paint event fires after Paint only when a drawable changed or requestPaint was called',
  build(env) {
    const { scene, camera } = env;
    lights(scene);
    camera.position.set(0, 6.2, 7.2);
    camera.lookAt(0, -0.6, 0);
    const root = new Group();
    scene.add(root);

    const steps = ['rAF callbacks', 'style + layout', 'observers', 'Paint', 'paint event', 'commit'];
    const PAINT = 4;
    const ring = (i: number) => {
      const a = Math.PI / 2 + (i / steps.length) * Math.PI * 2 + Math.PI / steps.length;
      return new Vector3(Math.cos(a) * 3.6, 0, Math.sin(a) * 2.1);
    };
    const track = wire(C.mauve, Array.from({ length: 65 }, (_, i) => {
      const a = Math.PI / 2 + (i / 64) * Math.PI * 2;
      return new Vector3(Math.cos(a) * 3.6, 0, Math.sin(a) * 2.1);
    }));
    root.add(track.line);

    const stations = steps.map((name, i) => {
      const block = card(0.9, 0.5, i === PAINT ? C.plum : C.paper, 0.3);
      block.group.position.copy(ring(i));
      block.group.rotation.x = -0.5;
      root.add(block.group);
      env.label(name, at(root, block.group.position.clone().add(new Vector3(0, 0.55, -0.45))), i === PAINT ? 'accent' : 'tag');
      return block;
    });
    const paintBlock = stations[PAINT]!;

    const runner = dot(0.12, C.amber);
    root.add(runner);
    const counter = env.label('paint events: 0', at(root, new Vector3(0, 0.1, -0.3)), 'note');
    const verdict = env.label('', at(root, new Vector3(0, 0.1, 0.45)), 'note');

    let changed = false;
    let loop = false;
    let count = 0;
    let flash = 0;
    let lap = 0;
    let fired = false;
    const LAP = 2.6;

    const change = button({ label: 'Change a drawable', size: 'sm', onClick: () => { changed = true; env.invalidate(); } });
    const toggle = createToggle({ label: 'requestPaint() inside paint', onChange: (on) => { loop = on; env.invalidate(); } });
    const paintAt = (PAINT + 0.5) / steps.length;

    return {
      controls: [change, toggle.el],
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.1);
        const prev = lap;
        lap = (lap + dt / LAP) % 1;
        if (lap < prev) fired = false;
        // The pulse travels the ring.
        const a = Math.PI / 2 + lap * Math.PI * 2;
        runner.position.set(Math.cos(a) * 3.6, 0.05, Math.sin(a) * 2.1);
        if (!fired && lap >= paintAt) {
          fired = true;
          const reason = changed ? 'a drawable changed' : loop ? 'requestPaint()' : '';
          if (reason) {
            count += 1;
            flash = 1;
            counter.set(`paint events: ${count}`);
            verdict.set(`fired: ${reason}`);
            verdict.tone('good');
          } else {
            verdict.set('skipped: nothing to draw');
            verdict.tone('note');
          }
          changed = false;
        }
        flash = damp(flash, 0, 3, dt);
        paintBlock.setColor(new Color(C.plum).lerp(new Color(C.safelight), flash));
        paintBlock.group.position.y = flash * 0.25;
        runner.material.color.set(changed ? C.safelight : loop ? C.tray : C.amber);
      },
    };
  },
};

/** Only edited cards are listed, and only they get re-uploaded. */
export const changedElementsFigure: FigureSpec = {
  label: 'Four drawable cards above a canvas. Edit some; at the next paint only the edited ones are listed in changedElements and copied down',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);
    const plate = canvasPlate(7.2, 1.5);
    plate.group.position.set(0, -1.45, 0);
    plate.group.rotation.x = -0.35;
    root.add(plate.group);

    const names = ['A', 'B', 'C', 'D'];
    const rigs = names.map((name, i) => {
      const x = -2.7 + i * 1.8;
      const src = card(1.4, 0.95);
      bars(src, 2);
      src.group.position.set(x, 1.15, 0);
      root.add(src.group);
      const copy = card(1.4, 0.95, C.paper, 0.03);
      bars(copy, 2);
      copy.group.position.set(x, 0, 0.05);
      plate.group.add(copy.group);
      env.label(name, at(root, src.group.position.clone().add(new Vector3(0, 0.7, 0))), 'code');
      const courier = dot(0.09, C.amber);
      courier.visible = false;
      root.add(courier);
      return { src, copy, pending: false, glow: 0, flight: -1, courier, from: src.group.position.clone(), to: new Vector3(x, -1.3, 0.3) };
    });

    const list = env.label('changedElements: []', at(root, new Vector3(0, -2.55, 0)), 'accent');
    let clock = 0;
    const FRAME = 1.4;

    const edit = (i: number) => {
      const rig = rigs[i]!;
      rig.pending = true;
      rig.glow = 1;
      env.invalidate();
    };
    const buttons = names.map((name, i) => button({ label: `Edit ${name}`, size: 'sm', onClick: () => edit(i) }));

    return {
      controls: buttons,
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.12);
        clock += dt;
        if (clock >= FRAME) {
          clock = 0;
          const changed = rigs.filter((r) => r.pending);
          if (changed.length) {
            list.set(`changedElements: [${changed.map((r) => names[rigs.indexOf(r)]).join(', ')}]`);
            changed.forEach((r) => {
              r.pending = false;
              r.flight = 0;
              r.courier.visible = true;
            });
          }
        }
        for (const rig of rigs) {
          rig.src.setColor(new Color(C.paper).lerp(new Color(C.amber), rig.pending ? 0.8 : rig.glow * 0.5));
          rig.glow = damp(rig.glow, 0, 2, dt);
          if (rig.flight >= 0) {
            rig.flight += dt / 0.6;
            rig.courier.position.lerpVectors(rig.from, rig.to, Math.min(rig.flight, 1));
            if (rig.flight >= 1) {
              rig.flight = -1;
              rig.courier.visible = false;
              rig.copy.setColor(C.amber);
            }
          }
          const c = rig.copy.slab.material.color;
          c.lerp(new Color(C.paper), 1 - Math.exp(-3 * dt));
        }
      },
    };
  },
};

/** Rings: copper for real changes, teal for bare requestPaint(). */
export const requestPaintFigure: FigureSpec = {
  label: 'A canvas lying like a developer tray. Each paint event sends out a ring: copper when a drawable changed, teal for a bare requestPaint()',
  build(env) {
    const { scene, camera } = env;
    lights(scene);
    camera.position.set(0, 4.6, 7.4);
    camera.lookAt(0, -0.4, 0);
    const plate = canvasPlate(6.4, 3.4);
    plate.group.rotation.x = -Math.PI / 2;
    scene.add(plate.group);
    const counter = env.label('paint events: 0', at(scene, new Vector3(0, 1.4, -1.4)), 'note');
    const status = env.label('idle: no paint until something asks', at(scene, new Vector3(0, -0.6, 2.4)), 'note');

    const rings: Array<{ mesh: Mesh<RingGeometry, MeshBasicMaterial>; age: number }> = [];
    let count = 0;
    let loop = false;
    let since = 0;

    const fire = (kind: 'change' | 'request') => {
      count += 1;
      counter.set(`paint events: ${count}`);
      const mesh = new Mesh(new RingGeometry(0.28, 0.34, 48), new MeshBasicMaterial({ color: kind === 'change' ? C.safelight : C.tray, transparent: true }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.02;
      scene.add(mesh);
      rings.push({ mesh, age: 0 });
      env.invalidate();
    };

    const once = button({ label: 'requestPaint()', size: 'sm', onClick: () => fire('request') });
    const change = button({ label: 'Change a drawable', size: 'sm', onClick: () => fire('change') });
    const toggle = createToggle({
      label: 'Loop it (slowed down)',
      onChange: (on) => {
        loop = on;
        status.set(on ? 'requestPaint() inside paint: one paint per frame' : 'idle: no paint until something asks');
        env.invalidate();
      },
    });

    return {
      controls: [once, change, toggle.el],
      update(dt) {
        since += dt;
        if (loop && since > 0.55) {
          since = 0;
          fire('request');
        }
        for (let i = rings.length - 1; i >= 0; i--) {
          const ring = rings[i]!;
          ring.age += dt / 1.8;
          ring.mesh.scale.setScalar(1 + ring.age * 7);
          ring.mesh.material.opacity = Math.max(0, 1 - ring.age);
          if (ring.age >= 1) {
            scene.remove(ring.mesh);
            ring.mesh.geometry.dispose();
            ring.mesh.material.dispose();
            rings.splice(i, 1);
          }
        }
        return rings.length > 0 || loop;
      },
    };
  },
};

/** Two balls leave the paint handler: one lands this frame, one next. */
export const nextFrameFigure: FigureSpec = {
  label: 'Two frames side by side. From the paint handler in frame N, a canvas draw lands in frame N, while a DOM edit arcs over and lands in frame N plus 1',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);
    const frames = [-2.1, 2.1].map((x, i) => {
      const p = canvasPlate(3.4, 2.4, i ? C.tray : C.amber);
      p.group.position.set(x, -0.5, 0);
      p.group.rotation.x = -0.55;
      root.add(p.group);
      env.label(i ? 'frame N + 1' : 'frame N', at(root, x, -2.15, 0.6), 'note');
      return p;
    });
    const source = new Vector3(-2.1, 1.8, 0.4);
    const handler = card(1.6, 0.42, C.plum, 0.12);
    handler.group.position.copy(source);
    root.add(handler.group);
    env.label('paint handler', at(root, source.clone().add(new Vector3(0, 0.5, 0))), 'accent');

    const pathDraw = arc(source, new Vector3(-2.4, -0.4, 0.3), 0.3);
    const pathDom = arc(source, new Vector3(2.1, -0.4, 0.3), 1.6);
    root.add(wire(C.amber, pathDraw, true).line, wire(C.stain, pathDom, true).line);
    const ballDraw = dot(0.13, C.amber);
    const ballDom = dot(0.13, C.stain);
    root.add(ballDraw, ballDom);
    const tagDraw = env.label('ctx.drawElementImage()', ballDraw, 'code');
    const tagDom = env.label("el.textContent = '…'", ballDom, 'code');
    const landed = frames.map((f) => {
      const c = card(1.3, 0.8, C.paper, 0.03);
      bars(c, 2);
      c.group.position.z = 0.04;
      c.setOpacity(0);
      f.group.add(c.group);
      return c;
    });

    let t = env.reducedMotion ? 0.99 : 0;
    const PERIOD = 3.4;
    return {
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.12);
        if (!env.reducedMotion) t = (t + dt / PERIOD) % 1;
        const draw = Math.min(t / 0.3, 1);
        const dom = Math.min(Math.max((t - 0.05) / 0.55, 0), 1);
        along(pathDraw, draw, ballDraw.position);
        along(pathDom, dom, ballDom.position);
        landed[0]!.setOpacity(draw >= 1 ? Math.min((t - 0.3) * 6, 1) : 0);
        landed[1]!.setOpacity(dom >= 1 ? Math.min((t - 0.6) * 6, 1) : 0);
        const fade = t > 0.9 ? 1 - (t - 0.9) * 10 : 1;
        ballDraw.material.opacity = fade;
        ballDom.material.opacity = fade;
        tagDraw.visible = draw < 1;
        tagDom.visible = dom < 1;
        return !env.reducedMotion;
      },
    };
  },
};

/** Inner canvases fire paint first, so the outer one draws fresh pixels. */
export const reverseOrderFigure: FigureSpec = {
  label: 'Three nested canvases pulled apart in depth. Paint fires on the innermost first, then outward, and fresh pixels flow outward with it',
  build(env) {
    const { scene, camera } = env;
    lights(scene);
    camera.position.set(4.2, 2.2, 8);
    camera.lookAt(0, 0, 0.6);
    const root = new Group();
    scene.add(root);
    const sizes: Array<[number, number, number, string]> = [
      [4.6, 3.2, 0, '#outer'],
      [3.0, 2.0, 1.1, '#inner'],
      [1.6, 1.0, 2.2, '#innermost'],
    ];
    const layers = sizes.map(([w, h, z, name]) => {
      const p = canvasPlate(w, h);
      p.group.position.z = z;
      root.add(p.group);
      const tag = env.label(name, at(root, new Vector3(-w / 2 + 0.5, h / 2 + 0.25, z)), 'code');
      return { p, tag, name, flash: 0 };
    });
    const order = [2, 1, 0];
    const couriers = [0, 1].map(() => {
      const d = dot(0.08, C.tray);
      root.add(d);
      return d;
    });
    let t = 0;
    const PERIOD = 3;
    return {
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.12);
        t = (t + dt / PERIOD) % 1;
        order.forEach((layerIndex, step) => {
          const layer = layers[layerIndex]!;
          const start = step * 0.25;
          const on = t >= start && t < start + 0.25;
          layer.flash = damp(layer.flash, on ? 1 : 0, 8, dt);
          layer.p.rim.lines.material.color.set(new Color(C.amber).lerp(new Color(C.safelight), layer.flash));
          layer.p.surface.material.color.set(new Color(C.deep).lerp(new Color(C.plum), layer.flash));
          layer.tag.set(`${layer.name}${t >= start ? ` · paint ${step + 1}` : ''}`);
          layer.tag.tone(on ? 'accent' : 'code');
        });
        couriers.forEach((d, i) => {
          const local = (t - (i + 1) * 0.25) / 0.2;
          d.visible = local > 0 && local < 1;
          d.position.set(0, 0, sizes[2 - i]![2] - (sizes[2 - i]![2] - sizes[1 - i]![2]) * local);
        });
      },
    };
  },
};
