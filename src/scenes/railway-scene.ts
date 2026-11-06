/**
 * Roll 08: the worker railway. Two stations joined by two tracks.
 *
 *  main thread station (left)  ->  outbound track  ->  worker yard (right)
 *  main thread station (left)  <-  inbound track   <-  worker yard (right)
 *
 * Wagons carry ElementImage crates out to the worker. Waiting wagons queue
 * at the yard; when the worker draws one, its easel flashes. Unclosed crates
 * pile up in the yard in the second colour. Geometry envelopes ride home on
 * the inbound track and light the station lamp: `elementgeometryupdate`.
 */
import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, Group, InstancedMesh, Matrix4, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry,
} from 'three';
import { labelTexture } from './label-texture';
import { MiniStage } from './mini-stage';

export interface RailwayScene {
  /** A captured image leaves the main thread on a new wagon. */
  depart(id: number): void;
  /** The worker draws image `id` (late trains are tinted). */
  draw(id: number, late: boolean): void;
  /** Image `id` is closed or dropped: its wagon leaves the track. */
  retire(id: number): void;
  /** A geometry batch rides home and the station lamp lights. */
  geometry(): void;
  /** Every wagon leaves the track (story: the yard is tidied). */
  retireAll(): void;
  /** Number of open crates left lying in the yard. */
  setPile(count: number): void;
  /** Story only: the canvas itself travels to the worker. */
  handOff(): void;
  destroy(): void;
}

interface Colors { paper: string; ink: string; accent: string; second: string; glow: string }
interface Wagon { id: number; group: Group; crate: MeshStandardMaterial; t: number; fade: number; late: boolean }
interface Envelope { mesh: Mesh<BoxGeometry, MeshBasicMaterial>; t: number }

const START = -2.6;
const END = 2.5;
const OUT_Z = 0.42;
const IN_Z = -0.42;
const POOL = 9;
const PILE_MAX = 36;
const TRAVEL_S = 0.9;

export function createRailwayScene(host: HTMLElement, colors: Colors): RailwayScene {
  const stage = new MiniStage(host, { label: 'Snapshots ride a railway from the main thread to a worker, and geometry rides home', className: 'scene-railway' });
  stage.camera.position.set(0, 4.4, 7.2);
  stage.camera.lookAt(0, -0.5, 0);
  stage.scene.add(new AmbientLight('#ffffff', 1.7));
  const sun = new DirectionalLight('#fff6dc', 2.6);
  sun.position.set(-3, 6, 4);
  stage.scene.add(sun);

  const ink = new MeshStandardMaterial({ color: colors.ink, roughness: 0.7 });
  const world = new Group();
  world.scale.setScalar(0.8);
  stage.scene.add(world);

  // Tracks: rails and sleepers.
  const sleepers = new InstancedMesh(new BoxGeometry(0.08, 0.04, 0.5), new MeshStandardMaterial({ color: '#b7a68a', roughness: 0.9 }), 64);
  const m = new Matrix4();
  for (let i = 0; i < 64; i++) {
    m.makeTranslation(-3.1 + (i % 32) * 0.2, -0.02, i < 32 ? OUT_Z : IN_Z);
    sleepers.setMatrixAt(i, m);
  }
  world.add(sleepers);
  for (const z of [OUT_Z - 0.14, OUT_Z + 0.14, IN_Z - 0.14, IN_Z + 0.14]) {
    const rail = new Mesh(new BoxGeometry(6.4, 0.03, 0.03), ink);
    rail.position.set(0, 0.02, z);
    world.add(rail);
  }

  const station = (x: number, text: string, sub: string) => {
    const box = new Mesh(new BoxGeometry(1.1, 0.8, 1.6), new MeshStandardMaterial({ color: colors.paper, roughness: 0.6 }));
    box.position.set(x, 0.4, 0);
    const sign = new Mesh(new PlaneGeometry(1.5, 0.48), new MeshBasicMaterial({
      map: labelTexture({ text, sub, width: 640, height: 200, background: '#ffffff', ink: colors.ink, accent: colors.accent }),
    }));
    sign.position.set(x, 1.15, 0.2);
    sign.rotation.x = -0.35;
    world.add(box, sign);
  };
  station(-3.55, 'main', 'paint + capture');
  station(3.55, 'worker', 'OffscreenCanvas');

  const lamp = new MeshStandardMaterial({ color: colors.glow, emissive: new Color(colors.glow), emissiveIntensity: 0 });
  const lampMesh = new Mesh(new BoxGeometry(0.22, 0.22, 0.22), lamp);
  lampMesh.position.set(-3.55, 0.95, -0.55);
  const easel = new MeshStandardMaterial({ color: '#ffffff', emissive: new Color(colors.accent), emissiveIntensity: 0 });
  const easelMesh = new Mesh(new BoxGeometry(0.9, 0.62, 0.05), easel);
  easelMesh.position.set(3.55, 1.25, -0.75);
  world.add(lampMesh, easelMesh);

  // The handed-off canvas (story only).
  const board = new Mesh(new BoxGeometry(0.7, 0.04, 0.5), new MeshStandardMaterial({ color: colors.accent }));
  board.visible = false;
  world.add(board);
  let boardT = -1;

  const pile = new InstancedMesh(new BoxGeometry(0.26, 0.2, 0.26), new MeshStandardMaterial({ color: colors.second, roughness: 0.5 }), PILE_MAX);
  pile.count = 0;
  world.add(pile);

  const crateGeo = new BoxGeometry(0.34, 0.3, 0.34);
  const locoGeo = new BoxGeometry(0.34, 0.24, 0.26);
  const wagons: Wagon[] = [];
  const envelopes: Envelope[] = [];
  let lampGlow = 0;
  let easelGlow = 0;
  const accent = new Color('#ffffff');
  const lateColor = new Color(colors.second);

  const queueX = (wagon: Wagon) => {
    const waiting = wagons.filter((w) => w.t >= 1 && w.fade === 0);
    return END - Math.max(0, waiting.indexOf(wagon)) * 0.5;
  };

  stage.onFrame((dt) => {
    const speed = stage.reducedMotion ? 10 : 1;
    let busy = lampGlow > 0 || easelGlow > 0 || boardT >= 0;
    lampGlow = Math.max(0, lampGlow - dt * 2);
    easelGlow = Math.max(0, easelGlow - dt * 2.5);
    lamp.emissiveIntensity = lampGlow * 1.4;
    easel.emissiveIntensity = easelGlow * 0.9;

    for (let i = wagons.length - 1; i >= 0; i--) {
      const w = wagons[i]!;
      busy = true;
      if (w.t < 1) w.t = Math.min(1, w.t + (dt * speed) / TRAVEL_S);
      const target = w.t < 1 ? START + (END - START) * w.t : queueX(w);
      w.group.position.x += (target - w.group.position.x) * Math.min(1, dt * 10 * speed);
      if (w.fade > 0) {
        w.fade += dt * 3 * speed;
        w.group.position.y = w.fade * 0.6;
        w.group.scale.setScalar(Math.max(0.01, 1 - w.fade));
        if (w.fade >= 1) {
          world.remove(w.group);
          w.crate.dispose();
          wagons.splice(i, 1);
        }
      }
    }
    for (let i = envelopes.length - 1; i >= 0; i--) {
      const e = envelopes[i]!;
      busy = true;
      e.t += (dt * speed) / 0.7;
      e.mesh.position.x = END + (START - END) * Math.min(1, e.t);
      if (e.t >= 1) {
        world.remove(e.mesh);
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
        envelopes.splice(i, 1);
        lampGlow = 1;
      }
    }
    if (boardT >= 0) {
      boardT = Math.min(1, boardT + (dt * speed) / 1.6);
      board.position.set(START + (END - START) * boardT, 0.3 + Math.sin(boardT * Math.PI) * 0.6, OUT_Z);
      if (boardT >= 1) {
        boardT = -1;
        board.visible = false;
        easelGlow = 1;
      }
    }
    world.rotation.y = stage.pointer.x * 0.12;
    return busy;
  });

  const find = (id: number) => wagons.find((w) => w.id === id && w.fade === 0);

  return {
    depart(id) {
      if (wagons.length >= POOL) return;
      const crate = new MeshStandardMaterial({ color: accent.clone(), roughness: 0.4, emissive: new Color(colors.accent), emissiveIntensity: 0.25 });
      const group = new Group();
      const box = new Mesh(crateGeo, crate);
      box.position.y = 0.2;
      const loco = new Mesh(locoGeo, ink);
      loco.position.set(0.36, 0.15, 0);
      group.add(box, loco);
      group.position.set(START, 0, OUT_Z);
      world.add(group);
      wagons.push({ id, group, crate, t: 0, fade: 0, late: false });
      stage.invalidate();
    },
    draw(id, late) {
      easelGlow = 1;
      const w = find(id);
      if (w) {
        w.late = late;
        if (late) w.crate.color.copy(lateColor);
      }
      stage.invalidate();
    },
    retire(id) {
      const w = find(id);
      if (w) w.fade = 0.001;
      stage.invalidate();
    },
    retireAll() {
      wagons.forEach((w) => { if (w.fade === 0) w.fade = 0.001; });
      stage.invalidate();
    },
    geometry() {
      if (envelopes.length < 6) {
        const mesh = new Mesh(new BoxGeometry(0.3, 0.06, 0.22), new MeshBasicMaterial({ color: colors.glow }));
        mesh.position.set(END, 0.12, IN_Z);
        world.add(mesh);
        envelopes.push({ mesh, t: 0 });
      }
      stage.invalidate();
    },
    setPile(count) {
      const n = Math.min(PILE_MAX, Math.max(0, count));
      for (let i = 0; i < n; i++) {
        m.makeTranslation(2.75 + (i % 3) * 0.3, 0.1 + Math.floor(i / 9) * 0.21, 1.05 - (Math.floor(i / 3) % 3) * 0.3);
        pile.setMatrixAt(i, m);
      }
      pile.count = n;
      pile.instanceMatrix.needsUpdate = true;
      stage.invalidate();
    },
    handOff() {
      board.visible = true;
      boardT = 0;
      stage.invalidate();
    },
    destroy() {
      crateGeo.dispose();
      locoGeo.dispose();
      stage.destroy();
    },
  };
}
