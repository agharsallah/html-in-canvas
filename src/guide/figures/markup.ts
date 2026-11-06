/**
 * Figures for "Opt in": content="drawable", drawable, nested drawables.
 */
import { Group, Vector3 } from 'three';
import { createSegmented } from '../../ui/components/segmented';
import { createToggle } from '../../ui/components/toggle';
import type { FigureSpec } from '../stage/figure';
import { C, at, bars, canvasPlate, card, damp, dampVec, dot, frame, lights, sway, type Card } from './kit';

/** Fallback: children drift unseen. Drawable: they snap into layout. */
export const contentAttrFigure: FigureSpec = {
  label: 'A canvas whose children either drift unseen as fallback content or snap into a laid-out stack inside it',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);
    const plate = canvasPlate(4.6, 3.3);
    plate.group.position.y = 0.3;
    root.add(plate.group);

    const names = ['<h2>', '<p>', '<button>'];
    const rigs = names.map((name, i) => {
      const c = card(3.4, 0.78);
      bars(c, i === 2 ? 1 : 2);
      root.add(c.group);
      const stacked = new Vector3(0, 1.3 - i * 1.0, 0.12);
      const lost = new Vector3((i - 1) * 1.9, -1.85 - (i % 2) * 0.25, 0.4);
      c.group.position.copy(lost);
      const tag = env.label(name, c.group, 'code');
      return { c, stacked, lost, tag, opacity: 0.3, seed: i * 1.7 };
    });

    let mode: 'fallback' | 'drawable' = 'fallback';
    const caption = env.label('<canvas content="fallback">', at(root, new Vector3(0, 2.25, 0)), 'accent');
    const note = env.label('children: fallback content, not laid out', at(root, new Vector3(0, -2.6, 0.7)), 'note');

    const segmented = createSegmented({
      label: 'Canvas content attribute',
      value: mode,
      options: [{ value: 'fallback', label: 'fallback' }, { value: 'drawable', label: 'drawable' }],
      onChange: (value) => {
        mode = value;
        caption.set(`<canvas content="${value}">`);
        note.set(value === 'drawable' ? 'children: laid out, ready to draw' : 'children: fallback content, not laid out');
        env.invalidate();
      },
    });

    return {
      controls: [segmented.el],
      update(dt, time) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.18);
        const drawable = mode === 'drawable';
        for (const rig of rigs) {
          const target = (drawable ? rig.stacked : rig.lost).clone();
          if (!drawable && !env.reducedMotion) target.y += Math.sin(time * 0.8 + rig.seed) * 0.15;
          dampVec(rig.c.group.position, target, 4, dt);
          rig.c.group.scale.setScalar(damp(rig.c.group.scale.x, drawable ? 1 : 0.5, 4, dt));
          rig.c.group.rotation.z = damp(rig.c.group.rotation.z, drawable ? 0 : (rig.seed - 1.7) * 0.12, 4, dt);
          rig.opacity = damp(rig.opacity, drawable ? 1 : 0.4, 4, dt);
          rig.c.setOpacity(rig.opacity);
          rig.tag.visible = rig.opacity > 0.7;
        }
      },
    };
  },
};

/** Only drawable children reach the canvas; drawing the others throws. */
export const drawableAttrFigure: FigureSpec = {
  label: 'Laid-out children on the left, the canvas on the right: only children with the drawable attribute get drawn',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);

    const layout = frame(C.dust, true);
    layout.set(-2.15, 0, 3.4, 3.6);
    root.add(layout.lines);
    env.label('laid out (DOM)', at(root, new Vector3(-2.15, 2.1, 0)), 'note');

    const plate = canvasPlate(3.4, 3.6);
    plate.group.position.set(2.15, 0, 0);
    plate.group.rotation.y = -0.28;
    root.add(plate.group);
    env.label('canvas pixels', at(root, new Vector3(2.15, 2.1, 0)), 'note');

    const state = [true, false, true];
    const rigs = state.map((on, i) => {
      const source = card(2.7, 0.76);
      bars(source, 2);
      source.group.position.set(-2.15, 1.05 - i * 1.05, 0);
      root.add(source.group);
      const ring = frame(C.amber);
      ring.set(0, 0, 2.9, 0.96);
      source.group.add(ring.lines);

      const copy = card(2.7, 0.76);
      bars(copy, 2);
      copy.group.position.set(0, 1.05 - i * 1.05, 0.05);
      plate.group.add(copy.group);

      const tag = env.label(`div ${'ABC'[i]}`, at(root, new Vector3(-2.7, 1.47 - i * 1.05, 0.5)), 'code');
      const error = env.label('InvalidStateError', copy.group, 'bad');
      return { source, ring, copy, tag, error, on, z: on ? 0.4 : 0, shown: on ? 1 : 0 };
    });

    const sync = () => rigs.forEach((rig, i) => {
      rig.on = state[i]!;
      rig.tag.set(rig.on ? `div drawable` : 'div');
      rig.tag.tone(rig.on ? 'accent' : 'code');
    });
    sync();

    const toggles = rigs.map((_, i) => createToggle({
      kind: 'chip',
      label: `${'ABC'[i]} drawable`,
      checked: state[i],
      onChange: (checked) => {
        state[i] = checked;
        sync();
        env.invalidate();
      },
    }));

    return {
      controls: toggles.map((t) => t.el),
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.15);
        for (const rig of rigs) {
          rig.z = damp(rig.z, rig.on ? 0.45 : 0, 6, dt);
          rig.shown = damp(rig.shown, rig.on ? 1 : 0, 5, dt);
          rig.source.group.position.z = rig.z;
          rig.ring.lines.material.opacity = rig.shown;
          rig.source.setColor(rig.on ? C.paper : '#a99fa6');
          rig.copy.setOpacity(rig.shown);
          rig.error.visible = rig.shown < 0.5;
        }
      },
    };
  },
};

/** An inner drawable leaves its slot empty in the outer snapshot. */
export const nestedFigure: FigureSpec = {
  label: 'A poem card with the word "you" inside. When "you" is a nested drawable it lifts out and leaves a hole, to be drawn separately with sparkles',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);

    const poem: Card = card(4.4, 2.6);
    bars(poem, 5, '#9a8f96', 0.3);
    root.add(poem.group);
    env.label('<p drawable>', at(root, new Vector3(-1.4, 1.65, 0)), 'code');

    const slot = new Vector3(0.55, -0.02, 0.06);
    const hole = frame(C.stain, true);
    hole.set(slot.x, slot.y, 0.9, 0.36);
    hole.lines.position.z = 0.04;
    root.add(hole.lines);

    const you = card(0.9, 0.36, C.stain, 0.06);
    you.group.position.copy(slot);
    root.add(you.group);
    const youTag = env.label('<span>you</span>', at(root, new Vector3()), 'code');
    youTag.anchor = () => you.group.position.clone().add(new Vector3(0, 0.45, 0));

    const sparks = Array.from({ length: 10 }, (_, i) => {
      const s = dot(0.045, i % 2 ? C.amber : C.paper);
      root.add(s);
      return s;
    });
    const note = env.label('one snapshot, "you" included', at(root, new Vector3(0, -1.75, 0)), 'note');

    let nested = false;
    let lift = 0;
    const toggle = createToggle({
      label: 'The span is drawable too',
      onChange: (checked) => {
        nested = checked;
        youTag.set(checked ? '<span drawable>you</span>' : '<span>you</span>');
        youTag.tone(checked ? 'accent' : 'code');
        note.set(checked ? 'two draws: the poem has a hole, "you" is drawn on its own' : 'one snapshot, "you" included');
        env.invalidate();
      },
    });

    return {
      controls: [toggle.el],
      update(dt, time) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.2);
        lift = damp(lift, nested ? 1 : 0, 4, dt);
        you.group.position.set(slot.x + lift * 1.1, slot.y + lift * 0.55, slot.z + lift * 1.3);
        you.group.rotation.y = -lift * 0.25;
        hole.lines.material.opacity = lift;
        const spin = env.reducedMotion ? 0 : time * 1.6;
        sparks.forEach((s, i) => {
          const a = spin + (i / sparks.length) * Math.PI * 2;
          s.position.set(you.group.position.x + Math.cos(a) * 0.75, you.group.position.y + Math.sin(a) * 0.32, you.group.position.z - 0.05);
          s.material.opacity = lift;
          s.visible = lift > 0.02;
        });
      },
    };
  },
};
