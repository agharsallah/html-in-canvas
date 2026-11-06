/**
 * Figures for "Accessibility and privacy".
 */
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import { button } from '../../ui/components/button';
import { createToggle } from '../../ui/components/toggle';
import type { FigureSpec } from '../stage/figure';
import { C, at, bars, canvasPlate, card, damp, dampVec, dot, frame, lights, sway, wire } from './kit';

export const accessibilityFigure: FigureSpec = {
  label: 'A canvas with a drawn heading and button, an old view that is no longer drawn, and the accessibility tree beside it. A screen reader cursor walks the tree',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);

    const plate = canvasPlate(3.4, 2.6);
    plate.group.position.set(-2.1, 0.45, 0);
    plate.group.rotation.y = 0.25;
    root.add(plate.group);
    const heading = card(2.6, 0.55);
    bars(heading, 1, '#5a4f56');
    heading.group.position.set(0, 0.7, 0.05);
    const send = card(1.3, 0.5, C.ink);
    send.group.position.set(-0.6, -0.4, 0.05);
    plate.group.add(heading.group, send.group);

    const old = frame(C.dust, true);
    old.set(-2.1, -1.55, 2.6, 0.6);
    root.add(old.lines);
    const oldTag = env.label('old view: in the DOM, not drawn', at(root, new Vector3(-2.1, -1.55, 0.1)), 'note');

    const nodes = [
      { text: 'canvas', at: new Vector3(1.9, 1.55, 0) },
      { text: 'heading "Orders"', at: new Vector3(2.35, 0.75, 0) },
      { text: 'button "Send"', at: new Vector3(2.35, -0.05, 0) },
      { text: 'region · no geometry', at: new Vector3(2.35, -0.85, 0) },
    ].map((n, i) => {
      const tag = env.label(n.text, at(root, n.at), i ? 'tag' : 'accent');
      if (i) root.add(wire(C.mauve, [new Vector3(1.35, 1.3, 0), new Vector3(1.35, n.at.y, 0), n.at.clone().add(new Vector3(-1, 0, 0))]).line);
      return { ...n, tag, alive: 1 };
    });
    const links = [heading, send].map((c, i) => {
      const w = wire(C.amber, [new Vector3(), new Vector3()], true);
      root.add(w.line);
      return { c, w, node: nodes[i + 1]! };
    });
    const reader = dot(0.1, C.tray);
    root.add(reader);

    let inert = false;
    let drawButton = true;
    let shownBtn = 1;
    let visit = 0;
    let clock = 0;
    const toggles = [
      createToggle({
        label: 'inert on the old view',
        onChange: (on) => {
          inert = on;
          oldTag.set(on ? 'old view: inert, out of the tree' : 'old view: in the DOM, not drawn');
          env.invalidate();
        },
      }),
      createToggle({
        label: 'Draw the button',
        checked: true,
        onChange: (on) => {
          drawButton = on;
          nodes[2]!.tag.set(on ? 'button "Send"' : 'button · no geometry');
          env.invalidate();
        },
      }),
    ];

    return {
      controls: toggles.map((t) => t.el),
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.12);
        shownBtn = damp(shownBtn, drawButton ? 1 : 0, 6, dt);
        send.setOpacity(shownBtn);
        nodes[3]!.alive = damp(nodes[3]!.alive, inert ? 0 : 1, 6, dt);
        nodes[3]!.tag.visible = nodes[3]!.alive > 0.4;
        old.lines.material.opacity = 0.3 + nodes[3]!.alive * 0.7;
        root.updateMatrixWorld(true);
        links.forEach((link, i) => {
          const from = link.c.group.localToWorld(new Vector3(link.c.width / 2, 0, 0));
          link.w.set([root.worldToLocal(from), link.node.at.clone().add(new Vector3(-1.05, 0, 0))]);
          link.w.line.visible = i === 0 || shownBtn > 0.5;
        });

        // The screen reader's virtual cursor visits every node in the tree.
        const live = nodes.filter((_, i) => i < 3 || !inert);
        clock += dt;
        if (clock > 1.1) {
          clock = 0;
          visit = (visit + 1) % live.length;
        }
        const target = live[visit % live.length]!.at.clone().add(new Vector3(-1.2, 0, 0.1));
        dampVec(reader.position, target, 8, dt);
      },
    };
  },
};

const ROWS: Array<{ text: string; sensitive: boolean }> = [
  { text: 'cross-origin <img>', sensitive: true },
  { text: ':visited link colour', sensitive: true },
  { text: 'spelling squiggle', sensitive: true },
  { text: '<input> with caret', sensitive: false },
  { text: 'scrollbar, checkbox', sensitive: false },
  { text: 'find-in-page mark', sensitive: false },
];

export const readBackFigure: FigureSpec = {
  label: 'A drawable element with six kinds of content and its snapshot. Cross-origin images, visited link colours and spelling marks never reach the snapshot; carets, form controls and find-in-page marks do',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);

    const dom = card(3.3, 3.7);
    dom.group.position.set(-2.1, 0, 0);
    dom.group.rotation.y = 0.2;
    root.add(dom.group);
    env.label('<div drawable>', at(root, new Vector3(-2.1, 2.15, 0)), 'code');
    const plate = canvasPlate(3.3, 3.7);
    plate.group.position.set(2.1, 0, 0);
    plate.group.rotation.y = -0.2;
    root.add(plate.group);
    const readTag = env.label('snapshot', at(root, new Vector3(2.1, 2.15, 0)), 'note');

    const rowH = 0.5;
    const strips = ROWS.map((row, i) => {
      const y = 1.35 - i * 0.54;
      env.label(row.text, at(dom.group, 0, y, 0.1), row.sensitive ? 'bad' : 'tag');
      const strip = new Mesh(
        new PlaneGeometry(2.9, rowH * 0.8),
        new MeshBasicMaterial({ color: row.sensitive ? C.night : C.paper, transparent: true, opacity: 0 }),
      );
      strip.position.set(0, y, 0.02);
      plate.group.add(strip);
      if (row.sensitive) {
        const edge = frame(C.stain, true);
        edge.set(0, 0, 2.9, rowH * 0.8);
        edge.lines.position.z = 0.01;
        strip.add(edge.lines);
      }
      return { strip, y, row };
    });

    const beam = new Mesh(new PlaneGeometry(3.3, 0.04), new MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0.8 }));
    beam.position.z = 0.05;
    plate.group.add(beam);

    let t = 0;
    let readFlash = 0;
    const read = button({
      label: 'ctx.getImageData()',
      size: 'sm',
      onClick: () => {
        readFlash = 1;
        readTag.set('read back: nothing sensitive in it');
        readTag.tone('good');
        env.invalidate();
      },
    });

    return {
      controls: [read],
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.1);
        t = env.reducedMotion ? 1 : (t + dt / 5) % 1.25;
        const scanY = 1.85 - Math.min(t, 1) * 3.7;
        beam.position.y = scanY;
        beam.visible = t < 1;
        strips.forEach((s) => {
          const developed = scanY < s.y ? 1 : 0;
          const m = s.strip.material;
          m.opacity = damp(m.opacity, developed, 6, dt);
        });
        readFlash = damp(readFlash, 0, 1.2, dt);
        plate.rim.lines.material.color.set(readFlash > 0.05 ? C.tray : C.amber);
        if (readFlash < 0.05 && readTag.el.dataset.tone === 'good') {
          readTag.set('snapshot');
          readTag.tone('note');
        }
      },
    };
  },
};
