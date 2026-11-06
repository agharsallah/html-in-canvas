/**
 * Roll 03 diorama: the lens grinder. Three stacked pixel grids float behind
 * a brass lens: CSS px (dashed, gold), canvas grid px (accent) and device px
 * (ink). A print of text hangs behind them, rendered at the canvas grid's
 * resolution. Set the grid-to-device ratio: the lens grinds, the canvas grid
 * spacing slides, and at exactly 1 the canvas lines land on the device lines,
 * glow, and the print snaps sharp.
 */
import {
  AmbientLight, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DirectionalLight, Float32BufferAttribute,
  Group, LinearFilter, LineBasicMaterial, LineDashedMaterial, LineSegments, MathUtils, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PlaneGeometry, PointLight, SRGBColorSpace, TorusGeometry,
} from 'three';
import { MiniStage } from './mini-stage';

export interface LensScene {
  /** Canvas grid px per device px. 1 = crisp. */
  setRatio(ratio: number): void;
  destroy(): void;
}

interface LensColors { paper: string; ink: string; accent: string; second: string; glow: string }

const W = 3.2;
const H = 1.6;
const DEVICE_CELLS = 16;
const CELL = W / DEVICE_CELLS;

function gridGeometry(spacing: number, offset = 0): BufferGeometry {
  const points: number[] = [];
  for (let x = -W / 2 + offset; x <= W / 2 + 1e-6; x += spacing) points.push(x, -H / 2, 0, x, H / 2, 0);
  for (let y = -H / 2; y <= H / 2 + 1e-6; y += spacing) points.push(-W / 2, y, 0, W / 2, y, 0);
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points, 3));
}

function printTexture(canvas: HTMLCanvasElement, quality: number, colors: LensColors): void {
  const width = Math.max(24, Math.round(320 * quality));
  canvas.width = width;
  canvas.height = Math.round(width / 2);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(width / 320, width / 320);
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, 320, 160);
  ctx.fillStyle = colors.ink;
  ctx.font = '700 46px "Bodoni Moda", serif';
  ctx.fillText('Hello', 26, 74);
  ctx.font = '400 21px "Atkinson Hyperlegible Next", sans-serif';
  ctx.fillText('from the DOM!', 30, 118);
}

export function createLensScene(host: HTMLElement, colors: LensColors): LensScene {
  const stage = new MiniStage(host, { label: 'A lens grinding a canvas pixel grid into line with the device pixel grid', className: 'scene-lens', maxFps: 30 });
  stage.camera.position.set(0.3, 0.2, 4.9);
  stage.camera.lookAt(0, -0.3, 0);
  stage.scene.add(new AmbientLight('#ffffff', 1.4));
  const key = new DirectionalLight('#ffffff', 2.4);
  key.position.set(2, 3, 5);
  const glint = new PointLight(colors.second, 0, 8);
  glint.position.set(0, 0, 2);
  stage.scene.add(key, glint);

  const rig = new Group();
  rig.rotation.set(-0.18, 0.42, 0);
  stage.scene.add(rig);

  // The print, rendered at the canvas grid's resolution.
  const printCanvas = document.createElement('canvas');
  const texture = new CanvasTexture(printCanvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  const print = new Mesh(new PlaneGeometry(W, H), new MeshBasicMaterial({ map: texture }));
  print.position.z = -0.35;
  rig.add(print);

  const device = new LineSegments(gridGeometry(CELL), new LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.45 }));
  device.position.z = -0.3;
  const canvasGrid = new LineSegments(gridGeometry(CELL), new LineBasicMaterial({ color: colors.accent, transparent: true, opacity: 0.9 }));
  canvasGrid.position.z = 0.15;
  const cssGrid = new LineSegments(gridGeometry(CELL * 1.5), new LineDashedMaterial({ color: colors.second, dashSize: 0.05, gapSize: 0.04, transparent: true, opacity: 0.7 }));
  cssGrid.computeLineDistances();
  cssGrid.position.z = 0.55;
  rig.add(device, canvasGrid, cssGrid);

  // The lens: a brass ring around a pale glass disc, in front of the stack.
  const lens = new Group();
  const brass = new MeshStandardMaterial({ color: colors.second, metalness: 0.8, roughness: 0.28 });
  lens.add(new Mesh(new TorusGeometry(0.72, 0.075, 16, 64), brass));
  for (let i = 0; i < 12; i++) {
    const knurl = new Mesh(new CylinderGeometry(0.03, 0.03, 0.16, 6), brass);
    const a = (i / 12) * Math.PI * 2;
    knurl.position.set(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0);
    knurl.rotation.x = Math.PI / 2;
    lens.add(knurl);
  }
  const glass = new Mesh(new CylinderGeometry(0.7, 0.7, 0.05, 48), new MeshStandardMaterial({ color: colors.glow, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.22 }));
  glass.rotation.x = Math.PI / 2;
  lens.add(glass);
  lens.position.set(-0.55, 0.05, 1.3);
  rig.add(lens);

  const accent = new Color(colors.accent);
  const focused = new Color(colors.second);
  let ratio = 0.55;
  let target = 0.55;
  let drawnRatio = -1;
  let drawnQuality = -1;

  stage.onFrame((dt) => {
    const motion = stage.reducedMotion ? 0 : 1;
    rig.rotation.y = 0.42 + stage.pointer.x * 0.2;
    rig.rotation.x = -0.18 + stage.pointer.y * 0.1;
    const before = ratio;
    ratio += (target - ratio) * Math.min(1, dt * (motion ? 2.5 : 20));
    if (Math.abs(target - ratio) < 0.0005) ratio = target;
    lens.rotation.z += (ratio - before) * 9; // grinding: the ring turns as the grid moves

    const crisp = Math.abs(ratio - 1) < 0.002;
    if (ratio !== drawnRatio) {
      canvasGrid.geometry.dispose();
      canvasGrid.geometry = gridGeometry(CELL / ratio);
      canvasGrid.material.color.copy(crisp ? focused : accent);
      glint.intensity = crisp ? 6 : 0;
      device.material.opacity = crisp ? 0.15 : 0.45;
      drawnRatio = ratio;
    }
    // Under-sampled grids lose detail; over-sampled ones are resampled too.
    const quality = Math.round((ratio <= 1 ? ratio : 1 / Math.sqrt(ratio)) * (crisp ? 1 : 0.9) * 40) / 40;
    if (quality !== drawnQuality) {
      printTexture(printCanvas, quality, colors);
      texture.dispose();
      texture.needsUpdate = true;
      drawnQuality = quality;
    }
    return ratio !== before;
  });

  return {
    setRatio: (value) => {
      target = MathUtils.clamp(value, 0.25, 2.5);
      stage.invalidate();
    },
    destroy: () => {
      texture.dispose();
      stage.destroy();
    },
  };
}
