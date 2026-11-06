/**
 * Figures for "3D and the GPU" and "Workers".
 */
import { BoxGeometry, CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import { button } from '../../ui/components/button';
import type { FigureSpec } from '../stage/figure';
import { C, at, along, arc, bars, canvasPlate, card, damp, dot, frame, lights, sway, wire } from './kit';

/** The element's snapshot, as the texture would hold it. */
function snapshotTexture(): { texture: CanvasTexture; draw(typed: string): void } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 336;
  const ctx = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const draw = (typed: string) => {
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, 512, 336);
    ctx.fillStyle = C.safelight;
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillStyle = C.ink;
    ctx.font = '600 52px "Bodoni Moda", serif';
    ctx.fillText('Hello, 3D', 36, 96);
    ctx.font = '400 28px "Atkinson Hyperlegible Next", sans-serif';
    ctx.fillText('Real HTML on a spinning card.', 36, 146);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 184, 440, 56);
    ctx.font = '400 28px "Atkinson Hyperlegible Mono", monospace';
    ctx.fillText(`${typed}|`, 52, 222);
    ctx.fillStyle = C.ink;
    ctx.fillRect(36, 262, 160, 48);
    ctx.fillStyle = C.paper;
    ctx.font = '600 26px "Atkinson Hyperlegible Next", sans-serif';
    ctx.fillText('Send', 84, 295);
    texture.needsUpdate = true;
  };
  return { texture, draw };
}

export const webglFigure: FigureSpec = {
  label: 'A drawable element, its snapshot uploaded into a WebGL texture, and a spinning card that samples it. Typing re-uploads only that element; its hit-test frame follows the card',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);

    const element = card(1.8, 1.2);
    bars(element, 3);
    element.group.position.set(-3.1, 0.6, 0);
    root.add(element.group);
    env.label('<form drawable>', at(root, new Vector3(-3.1, 1.55, 0)), 'code');

    const snap = snapshotTexture();
    let text = '';
    snap.draw(text);
    const tile = new Mesh(new PlaneGeometry(1.5, 0.98), new MeshBasicMaterial({ map: snap.texture }));
    tile.position.set(-0.9, -0.9, 0);
    root.add(tile);
    const tileRim = frame(C.amber);
    tileRim.set(0, 0, 1.58, 1.06);
    tile.add(tileRim.lines);
    env.label('WebGL texture', at(root, new Vector3(-0.9, -1.75, 0)), 'note');

    const side = new MeshStandardMaterial({ color: C.ink, roughness: 0.6 });
    const face = new MeshStandardMaterial({ map: snap.texture, roughness: 0.7 });
    const box = new Mesh(new BoxGeometry(2.7, 1.77, 0.08), [side, side, side, side, face, face]);
    box.position.set(2.1, 0.25, 0);
    root.add(box);
    const hit = frame(C.tray, true);
    hit.set(0, 0, 2.78, 1.85);
    hit.lines.position.z = 0.06;
    box.add(hit.lines);
    const hitTag = env.label('updateElementGeometry(mvp)', at(root, new Vector3()), 'note');
    hitTag.anchor = () => box.localToWorld(new Vector3(0, -1.15, 0));

    const upPath = arc(new Vector3(-3.1, 0, 0.1), new Vector3(-0.9, -0.4, 0.1), -0.2);
    const outPath = arc(new Vector3(-0.15, -0.9, 0.1), new Vector3(1.2, -0.3, 0.1), -0.3);
    root.add(wire(C.amber, upPath, true).line, wire(C.mauve, outPath, true).line);
    const upload = env.label('texElementSubImage2D()', at(root, new Vector3(-2.9, -0.45, 0.2)), 'code');
    const courier = dot(0.1, C.amber);
    courier.visible = false;
    root.add(courier);
    let flight = -1;
    let flash = 0;

    const type = button({
      label: 'Type into the form',
      size: 'sm',
      onClick: () => {
        const word = 'drawable ';
        text = (text + word[text.length % word.length]).slice(-18);
        element.setColor(C.amber);
        flight = 0;
        courier.visible = true;
        upload.set('changed: texElementSubImage2D()');
        env.invalidate();
      },
    });

    let spin = 0;
    return {
      controls: [type],
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.1);
        spin += dt * (env.reducedMotion ? 0.15 : 0.6);
        box.rotation.set(Math.sin(spin * 0.7) * 0.25, Math.sin(spin) * 0.9, 0);
        if (flight >= 0) {
          flight += dt / 0.5;
          along(upPath, flight, courier.position);
          if (flight >= 1) {
            flight = -1;
            courier.visible = false;
            snap.draw(text);
            flash = 1;
            upload.set('texElementSubImage2D()');
          }
        }
        flash = damp(flash, 0, 3, dt);
        tileRim.lines.material.color.set(new Color(C.amber).lerp(new Color(C.safelight), flash));
        element.slab.material.color.lerp(new Color(C.paper), 1 - Math.exp(-3 * dt));
      },
    };
  },
};

const STEPS: Array<[number, string]> = [
  [0.12, 'paint → captureElementImage(form)'],
  [0.4, 'postMessage({ img }, [img])'],
  [0.52, 'worker: drawElementImage(img, 100, 0)'],
  [0.8, 'geometry batched, posted back'],
  [0.92, 'elementgeometryupdate: form is hit-testable'],
  [1, 'worker: img.close()'],
];

export const workersFigure: FigureSpec = {
  label: 'The main thread and a worker. A snapshot travels to the worker, which draws it into an OffscreenCanvas; geometry updates come back as one batch and fire elementgeometryupdate',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);

    const main = canvasPlate(3, 2.2);
    main.group.position.set(-2.4, -0.1, 0);
    main.group.rotation.y = 0.25;
    root.add(main.group);
    const worker = canvasPlate(3, 2.2, C.tray);
    worker.group.position.set(2.4, -0.1, 0);
    worker.group.rotation.y = -0.25;
    root.add(worker.group);
    env.label('main thread · <canvas>', at(root, new Vector3(-2.4, 1.3, 0)), 'note');
    env.label('worker · OffscreenCanvas', at(root, new Vector3(2.4, 1.3, 0)), 'note');

    const form = card(1.6, 1.0);
    bars(form, 2);
    form.group.position.set(0, 0, 0.05);
    main.group.add(form.group);
    const copy = card(1.6, 1.0, C.paper, 0.03);
    bars(copy, 2);
    copy.group.position.set(0, 0, 0.04);
    worker.group.add(copy.group);

    const film = card(0.8, 0.54, C.ink, 0.04);
    film.setEdge(C.stain);
    root.add(film.group);
    const filmTag = env.label('ElementImage', film.group, 'code');
    const out = arc(new Vector3(-2.2, 0.4, 0.4), new Vector3(2.2, 0.4, 0.4), 1.3);
    const back = arc(new Vector3(2.2, -0.6, 0.4), new Vector3(-2.2, -0.6, 0.4), -1.2);
    root.add(wire(C.stain, out, true).line, wire(C.tray, back, true).line);
    const batch = [0, 1, 2].map(() => {
      const d = dot(0.08, C.tray);
      root.add(d);
      return d;
    });
    const caption = env.label(STEPS[0]![1], at(root, new Vector3(0, -2.25, 0.5)), 'accent');

    let t = 0;
    const PERIOD = 7;
    return {
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.1);
        t = (t + dt / (env.reducedMotion ? PERIOD * 1.6 : PERIOD)) % 1;
        caption.set(STEPS.find(([end]) => t < end)![1]);

        form.setColor(t < 0.12 ? C.amber : C.paper);
        const fly = Math.min(Math.max((t - 0.12) / 0.28, 0), 1);
        along(out, fly, film.group.position);
        const closing = t > 0.92 ? (t - 0.92) / 0.08 : 0;
        film.setOpacity(t < 0.12 ? t / 0.12 : 1 - closing);
        filmTag.visible = t < 0.92;
        copy.setOpacity(t < 0.4 ? 0 : Math.min((t - 0.4) / 0.08, 1));

        const ret = (t - 0.52) / 0.28;
        batch.forEach((d, i) => {
          d.visible = ret > 0 && ret < 1;
          along(back, ret - i * 0.035, d.position);
        });
        const lit = t > 0.8 && t < 0.92;
        main.rim.lines.material.color.set(lit ? C.tray : C.amber);
        form.setEdge(lit ? C.tray : C.ink);
      },
    };
  },
};
