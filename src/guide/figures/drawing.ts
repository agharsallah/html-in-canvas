/**
 * Figures for "Drawing in 2D": the four overloads, source rects and ink
 * overflow, and canvas grid vs CSS pixels.
 */
import {
  Color, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Plane, PlaneGeometry, Vector3,
} from 'three';
import { createDial } from '../../ui/components/dial';
import { createSegmented } from '../../ui/components/segmented';
import type { FigureSpec } from '../stage/figure';
import { C, at, bars, canvasPlate, card, damp, frame, glowTexture, lights, sway, wire } from './kit';

type Overload = '3' | '5' | '7' | '9';

const SIGNATURES: Record<Overload, string> = {
  '3': 'drawElementImage(el, dx, dy)',
  '5': 'drawElementImage(el, dx, dy, dw, dh)',
  '7': 'drawElementImage(el, sx, sy, sw, sh, dx, dy)',
  '9': 'drawElementImage(el, sx, sy, sw, sh, dx, dy, dw, dh)',
};

/** A projector: source rect on the element, destination rect on the canvas. */
export const overloadsFigure: FigureSpec = {
  label: 'An element on the left projected onto a canvas on the right. The overload decides the source rect (whole element or a crop) and the destination size (natural or scaled)',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);

    const source = card(2.6, 1.8);
    bars(source, 4);
    source.group.position.set(-2.5, 0.25, 0);
    source.group.rotation.y = 0.25;
    root.add(source.group);
    env.label('<div drawable>', at(root, new Vector3(-2.5, 1.5, 0)), 'code');
    const srcRect = frame(C.amber, true);
    srcRect.lines.position.z = 0.05;
    source.group.add(srcRect.lines);

    const plate = canvasPlate(3.9, 2.9);
    plate.group.position.set(2.1, 0.25, 0);
    plate.group.rotation.y = -0.3;
    root.add(plate.group);
    const copy = card(1, 1, C.paper, 0.02);
    bars(copy, 3);
    copy.group.position.z = 0.03;
    plate.group.add(copy.group);

    const beams = [0, 1, 2, 3].map(() => {
      const w = wire(C.amber);
      w.line.material.opacity = 0.45;
      scene.add(w.line);
      return w;
    });
    const sig = env.label(SIGNATURES['3'], at(root, 0, -1.85, 0.5), 'code');

    let overload: Overload = '3';
    // current and target rects: [cx, cy, w, h] in each group's local units
    const src = [0, 0, 2.6, 1.8];
    const dst = [-0.5, 0.25, 2.0, 1.4];
    const targets = (): { s: number[]; d: number[] } => {
      const crop = overload === '7' || overload === '9';
      const scaled = overload === '5' || overload === '9';
      const s = crop ? [0.35, 0.2, 1.4, 0.9] : [0, 0, 2.6, 1.8];
      const natural = [s[2]! * 0.8, s[3]! * 0.8];
      const size = scaled ? [3.4, crop ? 2.2 : 2.4] : natural;
      // dx, dy pin the top-left corner near the plate's top-left.
      const left = -1.75;
      const top = 1.25;
      return { s, d: [left + size[0]! / 2, top - size[1]! / 2, size[0]!, size[1]!] };
    };

    const segmented = createSegmented<Overload>({
      label: 'Number of numeric arguments',
      value: overload,
      options: (['3', '5', '7', '9'] as const).map((v) => ({ value: v, label: `${v} args` })),
      onChange: (value) => {
        overload = value;
        sig.set(SIGNATURES[value]);
        env.invalidate();
      },
    });

    const corner = new Vector3();
    return {
      controls: [segmented.el],
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.12);
        const { s, d } = targets();
        for (let i = 0; i < 4; i++) {
          src[i] = damp(src[i]!, s[i]!, 6, dt);
          dst[i] = damp(dst[i]!, d[i]!, 6, dt);
        }
        srcRect.set(src[0]!, src[1]!, src[2]!, src[3]!);
        copy.group.position.set(dst[0]!, dst[1]!, 0.03);
        copy.group.scale.set(dst[2]!, dst[3]!, 1);
        root.updateMatrixWorld(true);
        const signs: Array<[number, number]> = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
        beams.forEach((beam, i) => {
          const [sx, sy] = signs[i]!;
          const a = corner.set(src[0]! + (sx * src[2]!) / 2, src[1]! + (sy * src[3]!) / 2, 0.05);
          const from = source.group.localToWorld(a.clone());
          const b = new Vector3(dst[0]! + (sx * dst[2]!) / 2, dst[1]! + (sy * dst[3]!) / 2, 0.05);
          const to = plate.group.localToWorld(b);
          beam.set([from, to]);
        });
      },
    };
  },
};

/** The source rect can reach past the border box to keep a glow. */
export const inkOverflowFigure: FigureSpec = {
  label: 'A card with a pink glow. Widening the source rect past the border box keeps the glow in the drawn copy; without it the glow is cut off',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);
    const W = 2.2;
    const H = 1.3;
    const glow = glowTexture(C.stain);
    const haloSize = (w: number, h: number) => new PlaneGeometry(w / 0.5625, h / 0.4167);

    const make = (x: number, clip: Plane[] | null) => {
      const g = new Group();
      g.position.set(x, 0.1, 0);
      const halo = new Mesh(haloSize(W, H), new MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, clippingPlanes: clip }));
      halo.position.z = -0.05;
      const c = card(W, H);
      bars(c, 2);
      c.slab.material.clippingPlanes = clip;
      c.edge.material.clippingPlanes = clip;
      g.add(halo, c.group);
      root.add(g);
      return g;
    };

    const element = make(-2.1, null);
    env.label('<div drawable> + box-shadow', at(root, new Vector3(-2.1, 1.75, 0)), 'code');
    const rect = frame(C.amber, true);
    rect.lines.position.z = 0.1;
    element.add(rect.lines);

    const plate = canvasPlate(3.8, 3.2);
    plate.group.position.set(2.1, 0.1, -0.1);
    root.add(plate.group);
    const base = [new Plane(new Vector3(1, 0, 0), 0), new Plane(new Vector3(-1, 0, 0), 0), new Plane(new Vector3(0, 1, 0), 0), new Plane(new Vector3(0, -1, 0), 0)];
    const planes = base.map((p) => p.clone());
    const copy = make(2.1, planes);
    const sig = env.label('', at(root, new Vector3(0, -1.95, 0.4)), 'code');

    let outset = 0;
    let shown = 0;
    const dial = createDial({
      label: 'Outset', min: 0, max: 40, step: 4, value: 0, unit: 'px',
      onInput: (v) => {
        outset = v;
        env.invalidate();
      },
    });
    const PX = 0.5 / 40; // 40 CSS px of outset ≈ half a world unit here
    const local = new Matrix4();

    return {
      controls: [dial.el],
      update(dt) {
        sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.12);
        shown = damp(shown, outset * PX, 8, dt);
        const w = W + shown * 2;
        const h = H + shown * 2;
        rect.set(0, 0, w, h);
        // Clip the copy to the source rect, in world space.
        base[0]!.constant = w / 2;
        base[1]!.constant = w / 2;
        base[2]!.constant = h / 2;
        base[3]!.constant = h / 2;
        root.updateMatrixWorld(true);
        local.copy(copy.matrixWorld);
        planes.forEach((p, i) => p.copy(base[i]!).applyMatrix4(local));
        sig.set(outset
          ? `drawElementImage(el, -${outset}, -${outset}, w + ${outset * 2}, h + ${outset * 2}, dx, dy)`
          : 'drawElementImage(el, dx, dy) · glow cut off');
        sig.tone(outset >= 28 ? 'good' : 'code');
      },
    };
  },
};

/** A glyph rasterised at CSS resolution vs device resolution. */
export const unitsFigure: FigureSpec = {
  label: 'The same glyph on two canvas grids. Sized in CSS pixels it is resampled and blocky; sized with device-pixel-content-box it is crisp. Turn the devicePixelRatio dial',
  build(env) {
    const { scene } = env;
    lights(scene);
    const root = new Group();
    scene.add(root);
    const COLS = 15;
    const ROWS = 10;
    const PW = 3.6;
    const PH = PW * (ROWS / COLS);
    const ink = new Color(C.paper);
    const bg = new Color(C.deep);

    // A ring with a stem, like a lowercase "a", in panel units (y up, 0..1).
    const coverage = (u: number, v: number, cell: number): number => {
      let hit = 0;
      const n = 3;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const x = (u + ((i + 0.5) / n - 0.5) * cell) * (COLS / ROWS);
          const y = v + ((j + 0.5) / n - 0.5) * cell;
          const r = Math.hypot(x - 0.62, y - 0.47);
          const ring = Math.abs(r - 0.25) < 0.075;
          const stem = Math.abs(x - 0.92) < 0.07 && y > 0.19 && y < 0.8;
          if (ring || stem) hit++;
        }
      }
      return hit / (n * n);
    };

    const panel = (x: number, maxCells: number) => {
      const mesh = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial(), maxCells);
      mesh.position.set(x, 0.15, 0);
      root.add(mesh);
      const rim = frame(C.amber);
      rim.set(x, 0.15, PW + 0.1, PH + 0.1);
      root.add(rim.lines);
      return mesh;
    };
    const blurry = panel(-2.05, COLS * ROWS);
    const crisp = panel(2.05, COLS * ROWS * 9);
    env.label('canvas.width = clientWidth', at(root, new Vector3(-2.05, 1.65, 0)), 'code');
    env.label("box: 'device-pixel-content-box'", at(root, 2.05, 1.65, 0), 'code');
    const verdictL = env.label('', at(root, new Vector3(-2.05, -1.35, 0.1)), 'note');
    const verdictR = env.label('', at(root, new Vector3(2.05, -1.35, 0.1)), 'note');

    const m = new Matrix4();
    const color = new Color();
    const fill = (mesh: InstancedMesh, cols: number, rows: number) => {
      const cw = PW / cols;
      const ch = PH / rows;
      let k = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const u = (c + 0.5) / cols;
          const v = (r + 0.5) / rows;
          m.makeScale(cw * 0.9, ch * 0.9, 1).setPosition(-PW / 2 + (c + 0.5) * cw, -PH / 2 + (r + 0.5) * ch, 0);
          mesh.setMatrixAt(k, m);
          mesh.setColorAt(k, color.copy(bg).lerp(ink, coverage(u, v, 1 / rows)));
          k++;
        }
      }
      mesh.count = k;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    const apply = (dpr: number) => {
      fill(blurry, COLS, ROWS);
      fill(crisp, Math.round(COLS * dpr), Math.round(ROWS * dpr));
      verdictL.set(dpr > 1 ? `${COLS}×${ROWS} grid, stretched ×${dpr}: blurry` : `${COLS}×${ROWS} grid: fine at 1×`);
      verdictL.tone(dpr > 1 ? 'bad' : 'note');
      verdictR.set(`${Math.round(COLS * dpr)}×${Math.round(ROWS * dpr)} grid: crisp`);
      verdictR.tone('good');
      env.invalidate();
    };
    const dial = createDial({ label: 'devicePixelRatio', min: 1, max: 3, step: 0.5, value: 2, unit: '×', onInput: apply });
    apply(2);

    return {
      controls: [dial.el],
      update(dt) {
        return sway(root, env.pointer, dt, env.reducedMotion ? 0 : 0.1);
      },
    };
  },
};
