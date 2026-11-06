/**
 * Roll 08 diorama: the railway acts out each story line. The canvas rides
 * to the worker, crates ship, the Late Train piles up cargo, close() clears
 * the yard, and geometry envelopes ride home.
 */
import { createRailwayScene, type RailwayScene } from '../../scenes/railway-scene';
import type { ChapterModule } from '../shared/chapter';
import { story } from './story';

type Cue = (scene: RailwayScene, later: (ms: number, fn: () => void) => void) => void;

let nextId = 1;
/** Crates waiting at the yard for the worker. */
const yard: number[] = [];
const ship = (scene: RailwayScene) => {
  const id = nextId++;
  scene.depart(id);
  yard.push(id);
  return id;
};
/** The worker draws (and, later, retires) every crate waiting in the yard. */
const work = (scene: RailwayScene, later: (ms: number, fn: () => void) => void, at: number) => {
  yard.splice(0).forEach((id, i) => {
    later(at + i * 200, () => scene.draw(id, false));
    later(at + i * 200 + 400, () => scene.retire(id));
  });
};

const CUES: Record<string, Cue> = {
  'transfer-offscreen': (scene) => scene.handOff(),
  'capture-element-image': (scene) => { ship(scene); },
  'element-image-transfer': (scene, later) => { later(250, () => ship(scene)); ship(scene); },
  'worker-draw': (scene, later) => {
    ship(scene);
    work(scene, later, 1100);
  },
  foe: (scene, later) => {
    [0, 1, 2, 3, 4].forEach((i) => later(i * 180, () => {
      const id = ship(scene);
      later(1300, () => scene.draw(id, true));
    }));
    later(1600, () => scene.setPile(7));
  },
  'element-image-close': (scene, later) => {
    yard.length = 0;
    later(100, () => scene.retireAll());
    later(1600, () => scene.retireAll());
    later(200, () => scene.setPile(3));
    later(700, () => scene.setPile(0));
  },
  'worker-geometry': (scene) => scene.geometry(),
  'geometry-batch': (scene, later) => { later(300, () => scene.geometry()); },
  'geometry-update-event': (scene) => scene.geometry(),
  'stale-snapshot': (scene, later) => {
    ship(scene);
    work(scene, later, 1200);
    later(1500, () => scene.geometry());
  },
};

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createRailwayScene(host, roll.process);
  yard.length = 0;
  const timers = new Set<number>();
  const later = (ms: number, fn: () => void) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
  };
  return {
    onLine: (index) => {
      const line = story[index];
      const key = line?.concept?.id ?? (line?.speaker === 'foe' ? 'foe' : '');
      CUES[key]?.(scene, later);
    },
    destroy: () => {
      timers.forEach((timer) => clearTimeout(timer));
      scene.destroy();
    },
  };
};
