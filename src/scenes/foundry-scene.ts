/**
 * The GPU foundry: a glowing crucible pours letters into a mould (the
 * texture). The dashed frame around the mould is the hit region the DOM was
 * told about.
 *
 *  'idle'  — the crucible glows, the mould is empty
 *  'mould' — the mould (pre-allocated texture) lights up, still empty
 *  'pour'  — letters stream from the lip into their places (the upload)
 *  'melt'  — the Melt sags the letters out of the hit frame (vertex shader)
 *  'glow'  — the letters burn through colours but stay inside the frame
 */
import {
  AdditiveBlending, AmbientLight, BufferAttribute, BufferGeometry, CanvasTexture, Color, DirectionalLight,
  Float32BufferAttribute, LatheGeometry, LineDashedMaterial, LineLoop, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PlaneGeometry, PointLight, Points, PointsMaterial, Vector2,
} from 'three';
import { softDotTexture } from './label-texture';
import { MiniStage } from './mini-stage';

export type FoundryStage = 'idle' | 'mould' | 'pour' | 'melt' | 'glow';

export interface FoundryScene {
  setStage(stage: FoundryStage): void;
  destroy(): void;
}

const ROWS = ['HTML IN', 'CANVAS'];
const CELL = 0.3;
const MOULD = { width: 2.5, height: 1.1, y: -0.85 };
const LIP = { x: -1.3, y: 0.5 };
const EMBERS = 70;

export function createFoundryScene(host: HTMLElement, colors: { accent: string; glow: string; second: string; ink: string }): FoundryScene {
  const stage = new MiniStage(host, { label: 'A crucible pours glowing letters into a mould', className: 'scene-foundry', maxFps: 30 });
  stage.camera.position.set(0, -0.3, 6);
  stage.scene.add(new AmbientLight('#ffd9b8', 0.5));
  const key = new DirectionalLight('#fff0e0', 1.2);
  key.position.set(2, 3, 4);
  const fire = new PointLight(colors.accent, 40, 8);
  fire.position.set(LIP.x - 0.3, LIP.y + 0.1, 0.8);
  stage.scene.add(key, fire);

  // Crucible: a lathed cup, tipped toward the mould, molten inside.
  const cup = new Mesh(new LatheGeometry([[0.0, -0.45], [0.42, -0.42], [0.5, 0.0], [0.56, 0.42], [0.5, 0.45], [0.44, 0.0], [0.0, -0.36]].map(([x, y]) => new Vector2(x, y)), 40),
    new MeshStandardMaterial({ color: '#2a0f06', roughness: 0.7, metalness: 0.5, emissive: new Color(colors.accent), emissiveIntensity: 0.15 }));
  cup.position.set(LIP.x - 0.45, LIP.y + 0.35, 0);
  cup.rotation.z = -0.9;
  const melt = new Mesh(new PlaneGeometry(0.8, 0.8), new MeshBasicMaterial({ color: colors.glow }));
  melt.position.set(0, 0.32, 0);
  melt.rotation.x = -Math.PI / 2;
  cup.add(melt);
  stage.scene.add(cup);

  // Mould: the pre-allocated texture, and the hit frame around it.
  const mould = new Mesh(new PlaneGeometry(MOULD.width, MOULD.height), new MeshStandardMaterial({ color: '#1a0904', roughness: 0.9, emissive: new Color(colors.accent), emissiveIntensity: 0 }));
  mould.position.set(0.25, MOULD.y, -0.05);
  stage.scene.add(mould);
  const frame = new LineLoop(new BufferGeometry().setAttribute('position', new Float32BufferAttribute([
    -MOULD.width / 2, -MOULD.height / 2, 0, MOULD.width / 2, -MOULD.height / 2, 0, MOULD.width / 2, MOULD.height / 2, 0, -MOULD.width / 2, MOULD.height / 2, 0], 3)),
  new LineDashedMaterial({ color: colors.glow, dashSize: 0.1, gapSize: 0.07 }));
  frame.computeLineDistances();
  frame.position.set(0.25, MOULD.y, 0.02);
  stage.scene.add(frame);

  // Letters, one quad each, sharing a glyph atlas.
  const atlas = glyphAtlas(colors.glow);
  const letterMaterial = new MeshBasicMaterial({ map: atlas.texture, transparent: true, color: '#ffffff', depthWrite: false });
  const letters = ROWS.flatMap((row, r) => [...row].map((ch, c) => ({ ch, r, c, row }))).filter((l) => l.ch !== ' ').map((l, i) => {
    const geometry = new PlaneGeometry(CELL * 0.9, CELL * 1.1);
    const [u0, v0, u1, v1] = atlas.uv(l.ch);
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array([u0, v1, u1, v1, u0, v0, u1, v0]), 2));
    const mesh = new Mesh(geometry, letterMaterial);
    const x = 0.25 + (l.c - (l.row.length - 1) / 2) * CELL;
    const y = MOULD.y + (ROWS.length - 1) / 2 * CELL * 1.3 - l.r * CELL * 1.3;
    mesh.visible = false;
    stage.scene.add(mesh);
    return { mesh, target: { x, y }, delay: i * 0.11, t: 0, droop: 0 };
  });

  const emberGeometry = new BufferGeometry();
  const emberPos = new Float32Array(EMBERS * 3);
  const emberLife = new Float32Array(EMBERS).map(() => Math.random());
  emberGeometry.setAttribute('position', new BufferAttribute(emberPos, 3));
  const embers = new Points(emberGeometry, new PointsMaterial({ size: 0.07, map: softDotTexture(colors.glow), transparent: true, depthWrite: false, blending: AdditiveBlending, color: colors.accent }));
  stage.scene.add(embers);

  let current: FoundryStage = 'idle';
  let clock = 0;
  const heatColors = [new Color(colors.glow), new Color(colors.accent), new Color(colors.second), new Color('#ffffff')];

  stage.onFrame((dt, time) => {
    const reduced = stage.reducedMotion;
    clock += dt;
    (cup.material as MeshStandardMaterial).emissiveIntensity = 0.15 + (current === 'pour' ? 0.35 : 0.1) * (0.8 + 0.2 * Math.sin(time * 5));
    const mouldGlow = current === 'idle' ? 0 : 0.18;
    const mm = mould.material as MeshStandardMaterial;
    mm.emissiveIntensity += (mouldGlow - mm.emissiveIntensity) * Math.min(1, dt * 4);

    const pouring = current !== 'idle' && current !== 'mould';
    for (const l of letters) {
      l.mesh.visible = pouring;
      if (!pouring) {
        l.t = 0;
        continue;
      }
      l.t = reduced ? 1 : Math.min(1, l.t + Math.max(0, dt) * (clock > l.delay ? 1.4 : 0));
      const k = l.t;
      const droopTarget = current === 'melt' ? 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(l.target.x * 3.1)) : 0;
      l.droop += (droopTarget - l.droop) * Math.min(1, dt * (reduced ? 60 : 2.5));
      const x = LIP.x + (l.target.x - LIP.x) * k;
      const y = LIP.y + (l.target.y - LIP.y) * k + Math.sin(k * Math.PI) * 0.35 - l.droop;
      l.mesh.position.set(x, y, 0.05);
      l.mesh.rotation.z = (1 - k) * 2.5 + (current === 'melt' ? -l.droop * 0.5 : 0);
      l.mesh.scale.y = 1 + l.droop * 0.8;
    }
    if (current === 'glow') letterMaterial.color.copy(heatColors[Math.floor(time * 1.5) % heatColors.length]!);
    else letterMaterial.color.set('#ffffff');

    for (let i = 0; i < EMBERS; i++) {
      emberLife[i] = (emberLife[i]! + dt * (reduced ? 0 : 0.35)) % 1;
      const life = emberLife[i]!;
      emberPos[i * 3] = LIP.x - 0.3 + Math.sin(i * 12.9 + life * 3) * 0.45;
      emberPos[i * 3 + 1] = LIP.y + 0.3 + life * 2.4;
      emberPos[i * 3 + 2] = Math.cos(i * 7.3) * 0.4;
    }
    emberGeometry.attributes.position!.needsUpdate = true;
    stage.scene.rotation.y = stage.pointer.x * 0.12;
    return !reduced;
  });

  return {
    setStage(next) {
      if (next === 'pour' && current !== 'pour' && current !== 'melt' && current !== 'glow') clock = 0;
      current = next;
      stage.invalidate();
    },
    destroy() {
      atlas.texture.dispose();
      stage.destroy();
    },
  };
}

function glyphAtlas(color: string): { texture: CanvasTexture; uv(ch: string): [number, number, number, number] } {
  const chars = [...new Set(ROWS.join('').replace(/ /g, ''))];
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size * chars.length;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '700 104px "Bodoni Moda", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fff3e0';
  chars.forEach((ch, i) => ctx.fillText(ch, i * size + size / 2, size / 2 + 6));
  const texture = new CanvasTexture(canvas);
  return {
    texture,
    uv(ch) {
      const i = chars.indexOf(ch);
      return [i / chars.length, 0, (i + 1) / chars.length, 1];
    },
  };
}
