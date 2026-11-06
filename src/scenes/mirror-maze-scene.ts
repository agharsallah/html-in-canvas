/**
 * Roll 05 diorama: the mirror maze. A drawn button floats among tin mirrors;
 * its ghost (the hit area the DOM believes in) is a dashed blue double. A
 * click ray fires every couple of seconds and flashes gold on a hit, red on a
 * miss, blue when it catches the ghost. Modes follow the story:
 *
 *  synced  — ghost on the button: clicks hit.
 *  drift   — the button moves (preserveElementGeometry), the ghost stays.
 *  units   — the ghost lands twice as far: grid px passed as CSS px.
 *  stack   — two ghosts overlap; the top of the stack answers.
 *  clip    — only half the button is drawn, and the ghost is clipped to it.
 *  cleared — the ghost fades: clearElementGeometry.
 *  tilt    — the button turns in 3D; a projective ghost follows it.
 */
import {
  AmbientLight, BoxGeometry, Color, CylinderGeometry, EdgesGeometry, Group, LineBasicMaterial, LineSegments,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, Vector3,
} from 'three';
import { labelTexture } from './label-texture';
import { MiniStage } from './mini-stage';

export type MazeMode = 'intro' | 'synced' | 'drift' | 'units' | 'stack' | 'clip' | 'cleared' | 'tilt';

export interface MirrorMazeScene {
  setMode(mode: MazeMode): void;
  destroy(): void;
}

interface Colors { paper: string; ink: string; accent: string; glow: string; second: string }

const W = 1.4;
const H = 0.5;

export function createMirrorMazeScene(host: HTMLElement, colors: Colors): MirrorMazeScene {
  const stage = new MiniStage(host, { label: 'A maze of mirrors: a drawn button, its dashed ghost hit area, and a click ray that hits or misses', className: 'scene-mirrors' });
  stage.camera.position.set(0, 0.4, 7);
  stage.camera.lookAt(0, 0, 0);
  stage.scene.background = new Color(colors.paper);

  stage.scene.add(new AmbientLight('#fff3dc', 0.7));
  const warm = new PointLight(colors.glow, 40, 16);
  warm.position.set(-2.5, 2.4, 3.5);
  const cool = new PointLight(colors.second, 22, 14);
  cool.position.set(3, -1, 2.5);
  stage.scene.add(warm, cool);

  // Tin mirrors in a zigzag, each holding a faint reflected double.
  const maze = new Group();
  const tin = new MeshStandardMaterial({ color: '#b9ad97', metalness: 0.85, roughness: 0.28 });
  const frame = new MeshStandardMaterial({ color: colors.ink, metalness: 0.2, roughness: 0.7 });
  const doubles: Mesh[] = [];
  const doubleMap = labelTexture({ text: 'Polish', sub: 'me', width: 512, height: 184, background: '#f6ead2', ink: '#2d2a27', accent: colors.accent });
  [-3.2, -1.6, 0, 1.6, 3.2].forEach((x, i) => {
    const panel = new Mesh(new BoxGeometry(1.5, 2.6, 0.05), tin);
    panel.position.set(x, 0.2, -2.4 - (i % 2) * 0.6);
    panel.rotation.y = (i % 2 ? -1 : 1) * 0.35;
    const border = new Mesh(new BoxGeometry(1.6, 2.7, 0.03), frame);
    border.position.z = -0.03;
    panel.add(border);
    const ghostDouble = new Mesh(new PlaneGeometry(W * 0.7, H * 0.7), new MeshBasicMaterial({ map: doubleMap, transparent: true, opacity: 0.35 }));
    ghostDouble.position.set(0, 0.1 + (i % 3) * 0.25, 0.04);
    panel.add(ghostDouble);
    doubles.push(ghostDouble);
    maze.add(panel);
  });
  stage.scene.add(maze);

  // The drawn button.
  const button = new Mesh(new BoxGeometry(W, H, 0.1), [
    new MeshStandardMaterial({ color: colors.accent, roughness: 0.4 }), new MeshStandardMaterial({ color: colors.accent, roughness: 0.4 }),
    new MeshStandardMaterial({ color: colors.accent, roughness: 0.4 }), new MeshStandardMaterial({ color: colors.accent, roughness: 0.4 }),
    new MeshBasicMaterial({ map: doubleMap }),
    new MeshStandardMaterial({ color: colors.ink }),
  ]);
  const buttonPivot = new Group();
  buttonPivot.add(button);
  stage.scene.add(buttonPivot);

  // Ghosts: the hit areas the DOM believes in.
  const makeGhost = () => {
    const g = new Group();
    const fill = new Mesh(new PlaneGeometry(W, H), new MeshBasicMaterial({ color: colors.second, transparent: true, opacity: 0.22, depthWrite: false }));
    const edge = new LineSegments(new EdgesGeometry(new PlaneGeometry(W, H)), new LineBasicMaterial({ color: colors.second, transparent: true }));
    g.add(fill, edge);
    g.position.z = 0.12;
    stage.scene.add(g);
    return { g, fill, edge };
  };
  const ghost = makeGhost();
  const ghost2 = makeGhost();

  // The click ray: a thin beam from the viewer into the maze.
  const ray = new Mesh(new CylinderGeometry(0.015, 0.015, 1, 8), new MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: 0 }));
  stage.scene.add(ray);
  const flashColor = { hit: new Color(colors.accent), miss: new Color('#e0604f'), ghost: new Color(colors.second) };

  let mode: MazeMode = 'intro';
  let modeTime = 0;
  let pulse = 0;
  const target = { button: new Vector3(), buttonRotY: 0, buttonRotZ: 0, ghost: new Vector3(), ghostScale: new Vector3(1, 1, 1), ghostOpacity: 1, ghostRotY: 0, ghost2: 0 };

  const layout = () => {
    target.button.set(0, 0, 0);
    target.ghost.set(0, 0, 0.12);
    target.ghostScale.set(1, 1, 1);
    target.ghostOpacity = 1;
    target.buttonRotY = target.buttonRotZ = target.ghostRotY = 0;
    target.ghost2 = 0;
    if (mode === 'drift') {
      target.button.set(1.5, -0.5, 0);
      target.buttonRotZ = -0.14;
      target.ghost.set(-1.2, 0.6, 0.12);
    } else if (mode === 'units') {
      target.button.set(0.8, -0.3, 0);
      target.ghost.set(1.6, -0.6, 0.12);
    } else if (mode === 'stack') {
      target.ghost2 = 1;
    } else if (mode === 'clip') {
      target.ghostScale.set(1, 0.5, 1);
      target.ghost.set(0, H / 4, 0.12);
    } else if (mode === 'cleared') {
      target.ghostOpacity = 0;
    } else if (mode === 'tilt') {
      target.buttonRotY = 0.75;
      target.ghostRotY = 0.75;
    }
  };

  const ease = (dt: number) => Math.min(1, dt * 4);
  stage.onFrame((dt, time) => {
    const motion = stage.reducedMotion ? 0 : 1;
    modeTime += dt;
    maze.rotation.y = Math.sin(time * 0.2) * 0.06 * motion + stage.pointer.x * 0.15;
    doubles.forEach((d, i) => (d.position.x = Math.sin(time * 0.6 + i) * 0.15 * motion));

    buttonPivot.position.lerp(target.button, ease(dt));
    buttonPivot.rotation.y += (target.buttonRotY * (mode === 'tilt' ? 0.6 + 0.4 * Math.sin(time * 0.9 * motion) : 1) - buttonPivot.rotation.y) * ease(dt);
    buttonPivot.rotation.z += (target.buttonRotZ - buttonPivot.rotation.z) * ease(dt);
    const follow = mode === 'tilt' || mode === 'synced' || mode === 'intro' || mode === 'clip' || mode === 'stack';
    const ghostTarget = follow ? new Vector3(buttonPivot.position.x, buttonPivot.position.y + (mode === 'clip' ? H / 4 : 0), 0.12) : target.ghost;
    ghost.g.position.lerp(ghostTarget, ease(dt));
    ghost.g.rotation.y = mode === 'tilt' ? buttonPivot.rotation.y : ghost.g.rotation.y * 0.9;
    ghost.g.scale.lerp(target.ghostScale, ease(dt));
    ghost.fill.material.opacity += (target.ghostOpacity * 0.22 - ghost.fill.material.opacity) * ease(dt);
    ghost.edge.material.opacity += (target.ghostOpacity - ghost.edge.material.opacity) * ease(dt);
    ghost2.g.position.set(0.35, 0.2, 0.2);
    ghost2.fill.material.opacity += (target.ghost2 * 0.3 - ghost2.fill.material.opacity) * ease(dt);
    ghost2.edge.material.opacity += (target.ghost2 - ghost2.edge.material.opacity) * ease(dt);

    // Fire a click every 2.4 s (once, held, under reduced motion).
    const period = 2.4;
    const phase = stage.reducedMotion ? 0.3 : (modeTime % period) / period;
    pulse = mode === 'intro' ? 0 : Math.max(0, 1 - phase * 3);
    const aimAtGhost = mode === 'drift' && Math.floor(modeTime / period) % 2 === 1;
    const aim = aimAtGhost ? ghost.g.position.clone() : (mode === 'stack' ? ghost2.g.position.clone() : buttonPivot.position.clone());
    const from = new Vector3(aim.x * 0.4, aim.y * 0.4 + 0.2, 4);
    ray.position.copy(from).add(aim).multiplyScalar(0.5);
    ray.scale.set(1, from.distanceTo(aim), 1);
    ray.lookAt(aim);
    ray.rotateX(Math.PI / 2);
    const verdict = mode === 'drift' ? (aimAtGhost ? 'ghost' : 'miss') : mode === 'units' || mode === 'cleared' ? 'miss' : 'hit';
    ray.material.color.copy(flashColor[verdict]);
    ray.material.opacity = pulse;
  });

  layout();
  return {
    setMode(next) {
      if (next === mode) return;
      mode = next;
      modeTime = 0;
      layout();
      stage.invalidate();
    },
    destroy: () => {
      doubleMap.dispose();
      stage.destroy();
    },
  };
}
