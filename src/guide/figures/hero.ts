/**
 * The hero: the whole API in one exploded view.
 * HTML element → snapshot → canvas, and geometry flowing back.
 */
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import type { FigureSpec } from '../stage/figure';
import { C, along, arc, at, bars, canvasPlate, card, dot, lights, sway, wire } from './kit';

export const heroFigure: FigureSpec = {
  aspect: 4 / 3,
  label: 'An exploded view of HTML-in-Canvas: an HTML form is recorded as a snapshot on every rendering update, drawn into the canvas in the paint event, and its geometry flows back so clicks land where it was drawn',
  build(env) {
    const { scene, camera } = env;
    lights(scene);
    camera.position.set(0.8, 1.4, 11.2);
    camera.lookAt(0.3, 0, 0);
    const root = new Group();
    scene.add(root);
    const tilt = 0.5;

    // 1. The element: real HTML, laid out by the browser.
    const form = card(2.6, 1.8);
    bars(form, 3);
    const send = card(0.8, 0.3, C.ink, 0.03);
    send.group.position.set(-0.75, -0.6, 0.04);
    form.group.add(send.group);
    form.group.position.set(-3, 0.2, 1.4);
    form.group.rotation.y = tilt;
    root.add(form.group);

    // 2. The snapshot: a negative of it, recorded every update.
    const film = card(2.6, 1.8, C.ink, 0.03);
    film.setEdge(C.stain);
    bars(film, 3, C.dust);
    for (let i = 0; i < 9; i++) {
      for (const y of [0.98, -0.98]) {
        const hole = new Mesh(new PlaneGeometry(0.13, 0.09), new MeshBasicMaterial({ color: C.dust }));
        hole.position.set(-1.12 + i * 0.28, y, 0.02);
        film.group.add(hole);
      }
    }
    film.group.position.set(0, 0.2, 0);
    film.group.rotation.y = tilt;
    root.add(film.group);

    // 3. The canvas: the snapshot drawn, rotated, anywhere.
    const plate = canvasPlate(3.6, 2.7);
    plate.group.position.set(3.2, 0.2, -1.5);
    plate.group.rotation.y = tilt;
    root.add(plate.group);
    const drawn = card(2.0, 1.4, C.paper, 0.02);
    bars(drawn, 3);
    drawn.group.rotation.z = -0.14;
    drawn.group.position.set(0.15, 0.05, 0.03);
    plate.group.add(drawn.group);

    env.label('<form drawable>', at(root, -3, 1.55, 1.4), 'code');
    env.label('snapshot, every update', at(root, 0, -1.0, 0), 'accent');
    env.label('<canvas content="drawable">', at(root, 3.2, 1.85, -1.5), 'code');

    const forward = arc(new Vector3(-2.4, 0.2, 1.8), new Vector3(2.6, 0.2, -1.1), 1.4);
    const back = arc(new Vector3(2.6, -0.6, -1.1), new Vector3(-2.4, -0.6, 1.8), -1.4);
    root.add(wire(C.amber, forward, true).line, wire(C.tray, back, true).line);
    env.label('paint → drawElementImage()', at(root, along(forward, 0.5).clone().add(new Vector3(0, 0.4, 0))), 'accent');
    env.label('updateElementGeometry()', at(root, along(back, 0.5).clone().add(new Vector3(0, -0.4, 0))), 'good');

    const pulses = [0, 0.33, 0.66].map((offset) => ({ d: dot(0.09, C.amber), offset }));
    const returns = [0, 0.5].map((offset) => ({ d: dot(0.08, C.tray), offset }));
    [...pulses, ...returns].forEach(({ d }) => root.add(d));

    let t = 0;
    return {
      update(dt, time) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.2);
        if (env.reducedMotion) return false;
        t += dt;
        pulses.forEach(({ d, offset }) => along(forward, (t * 0.32 + offset) % 1, d.position));
        returns.forEach(({ d, offset }) => along(back, (t * 0.25 + offset) % 1, d.position));
        form.group.position.y = 0.2 + Math.sin(time * 0.9) * 0.06;
        film.group.position.y = 0.2 + Math.sin(time * 0.9 + 1) * 0.06;
        plate.group.position.y = 0.2 + Math.sin(time * 0.9 + 2) * 0.06;
      },
    };
  },
};
