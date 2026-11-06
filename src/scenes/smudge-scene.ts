/**
 * Prologue diorama: The Smudge. A churning cloud of pixel cubes that, as the
 * story explains HTML-in-Canvas, snaps into a crisp sheet of letters.
 * Pixels without meaning become pixels with structure.
 */
import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, InstancedMesh, MathUtils,
  MeshStandardMaterial, Object3D, PointLight,
} from 'three';
import { MiniStage } from './mini-stage';

const COLS = 34;
const ROWS = 20;
const GAP = 0.105;

interface Cell {
  chaos: [number, number, number];
  spin: [number, number, number];
  order: [number, number];
  ink: boolean;
  phase: number;
}

export interface SmudgeScene {
  setClarity(target: number): void;
  destroy(): void;
}

export function createSmudgeScene(host: HTMLElement, colors: { ink: string; paper: string; accent: string; second: string }): SmudgeScene {
  const stage = new MiniStage(host, { label: 'The Smudge: a cloud of pixels that organises into letters as the story goes on', className: 'scene-smudge', maxFps: 30 });
  stage.camera.position.set(0, 0, 5.4);

  const cells = buildCells();
  const mesh = new InstancedMesh(new BoxGeometry(0.088, 0.088, 0.088), new MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 }), cells.length);
  const ink = new Color(colors.ink);
  const paper = new Color(colors.paper);
  const accent = new Color(colors.accent);
  const second = new Color(colors.second);
  const tmp = new Color();
  const dummy = new Object3D();
  stage.scene.add(mesh);

  stage.scene.add(new AmbientLight('#ffffff', 1.1));
  const key = new DirectionalLight('#ffffff', 1.6);
  key.position.set(2, 3, 4);
  const rimA = new PointLight(colors.accent, 14, 12);
  rimA.position.set(-3, 1.5, 2);
  const rimB = new PointLight(colors.second, 14, 12);
  rimB.position.set(3, -1.5, 2);
  stage.scene.add(key, rimA, rimB);

  let clarity = 0;
  let target = 0;
  let paintedClarity = -1;

  stage.onFrame((dt, time) => {
    clarity += (target - clarity) * Math.min(1, dt * 2.2);
    if (Math.abs(target - clarity) < 0.001) clarity = target;
    const c = MathUtils.smootherstep(clarity, 0, 1);
    const motion = stage.reducedMotion ? 0 : 1;
    mesh.rotation.y = stage.pointer.x * 0.35 + Math.sin(time * 0.3) * 0.08 * (1 - c) * motion;
    mesh.rotation.x = stage.pointer.y * 0.2;

    // Once the sheet has fully formed and stopped moving, the 680 instances
    // never change again: only the whole mesh turns with the pointer.
    const settled = c === 1 || (motion === 0 && c === paintedClarity);
    if (settled && paintedClarity === c) return false; // only a pointer move redraws
    const colorsChanged = c !== paintedClarity;
    paintedClarity = c;

    cells.forEach((cell, i) => {
      const wob = motion * (1 - c);
      const cx = cell.chaos[0] + Math.sin(time * 0.9 + cell.phase) * 0.25 * wob;
      const cy = cell.chaos[1] + Math.cos(time * 0.7 + cell.phase * 1.3) * 0.25 * wob;
      const cz = cell.chaos[2] + Math.sin(time * 0.5 + cell.phase * 0.7) * 0.3 * wob;
      dummy.position.set(
        MathUtils.lerp(cx, cell.order[0], c),
        MathUtils.lerp(cy, cell.order[1], c),
        MathUtils.lerp(cz, 0, c),
      );
      dummy.rotation.set(
        cell.spin[0] * (1 - c) + time * cell.spin[0] * wob,
        cell.spin[1] * (1 - c),
        cell.spin[2] * (1 - c),
      );
      dummy.scale.setScalar(MathUtils.lerp(0.75 + Math.sin(cell.phase) * 0.35, cell.ink ? 1 : 0.92, c));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (colorsChanged) {
        const blurry = tmp.copy(accent).lerp(second, (Math.sin(cell.phase * 3) + 1) / 2).lerp(paper, 0.25);
        mesh.setColorAt(i, blurry.lerp(cell.ink ? ink : paper, c));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (colorsChanged && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return {
    setClarity: (value) => (target = MathUtils.clamp(value, 0, 1)),
    destroy: () => stage.destroy(),
  };
}

/** Lay the cells on a grid, marking the ones that spell the glyphs as ink. */
function buildCells(): Cell[] {
  const mask = glyphMask('Aa', COLS, ROWS);
  const cells: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const r = 1.1 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      cells.push({
        chaos: [r * Math.sin(phi) * Math.cos(theta) * 1.4, r * Math.cos(phi) * 0.8, r * Math.sin(phi) * Math.sin(theta) * 0.8],
        spin: [Math.random() * 3, Math.random() * 3, Math.random() * 3],
        order: [(col - (COLS - 1) / 2) * GAP, ((ROWS - 1) / 2 - row) * GAP],
        ink: mask[row * COLS + col] ?? false,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  return cells;
}

function glyphMask(text: string, cols: number, rows: number): boolean[] {
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.font = `700 ${Math.floor(rows * 1.05)}px "Bodoni Moda", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cols / 2, rows / 2 + 1, cols - 2);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  return Array.from({ length: cols * rows }, (_, i) => data[i * 4 + 3]! > 110);
}
