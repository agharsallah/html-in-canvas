/**
 * The darkroom: an umber wall, a sagging wire, an amber safelight, the teal
 * glow of the developer tray, and dust drifting through the light.
 */
import { LightShafts } from './light-shafts';
import { createLampShade, createTrays } from './props';
import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from 'three';

export const SAFELIGHT = '#ff5a36';
export const AMBER = '#ffb547';
export const TRAY_GLOW = '#2ee6c0';
export const STAIN = '#ff4fa3';

export interface WireShape {
  start: number;
  end: number;
  height: number;
  sag: number;
}

/** Height of the wire at x: a parabola is close enough to a catenary. */
export function wireY(shape: WireShape, x: number): number {
  const mid = (shape.start + shape.end) / 2;
  const half = (shape.end - shape.start) / 2 || 1;
  const t = (x - mid) / half;
  return shape.height - shape.sag * (1 - t * t);
}

export class DarkroomSet {
  readonly root = new Group();
  private readonly dust: Points;
  /**
   * The few real lights. Every PointLight adds a shading pass to every lit
   * pixel (and the wall fills the screen), so instead of one light per lamp
   * (13 in total) a rig of 4 travels with the camera and snaps the key
   * light to the nearest lamp. Lamps off screen never lit anything visible.
   */
  private readonly lightRig = new Group();
  private readonly key = new PointLight(SAFELIGHT, 18, 16, 1.6);
  private readonly lampXs: number[] = [];
  private shafts: LightShafts | null = null;
  private time = 0;

  constructor(private readonly wire: WireShape) {
    this.root.add(this.createWall(), this.createWire(), this.createLights(), this.createTray(), createTrays(this.wire.start, this.wire.end));
    this.dust = this.createDust();
    this.root.add(this.dust);
    // Behind the wire, so the paper occludes the haze instead of being tinted by it.
    this.shafts = new LightShafts(this.lampXs, SAFELIGHT, 3.0, -0.9);
    this.root.add(this.shafts.root);
  }

  /** `focusX`: where the camera is looking along the wire. */
  update(dt: number, reducedMotion: boolean, focusX: number): void {
    this.lightRig.position.x = focusX;
    const nearest = this.lampXs.reduce((best, x) => (Math.abs(x - focusX) < Math.abs(best - focusX) ? x : best), this.lampXs[0] ?? 0);
    this.key.position.x = nearest - focusX;
    this.time += dt;
    this.shafts?.update(this.time);
    if (reducedMotion) return;
    this.dust.rotation.y += dt * 0.01;
    this.dust.position.y = Math.sin(performance.now() / 6000) * 0.15;
  }

  private createWall(): Mesh {
    const length = this.wire.end - this.wire.start + 30;
    const wall = new Mesh(
      new PlaneGeometry(length, 22),
      new MeshLambertMaterial({ color: '#4a1a2e' }), // matte wall: no need for PBR
    );
    wall.position.set((this.wire.start + this.wire.end) / 2, 1, -3.2);
    return wall;
  }

  private createWire(): Mesh {
    const points: Vector3[] = [];
    for (let x = this.wire.start - 2; x <= this.wire.end + 2; x += 0.5) {
      points.push(new Vector3(x, wireY(this.wire, x), 0));
    }
    return new Mesh(
      new TubeGeometry(new CatmullRomCurve3(points), points.length * 2, 0.012, 6),
      new MeshStandardMaterial({ color: '#c9b9a2', metalness: 0.6, roughness: 0.4 }),
    );
  }

  private createLights(): Group {
    const group = new Group();
    group.add(new AmbientLight('#ffd9e6', 0.45));
    // Decorative lamps: a glowing bulb sprite and a shade, no light each.
    const glowMap = glowTexture(SAFELIGHT);
    const span = this.wire.end - this.wire.start;
    for (let i = 0; i <= Math.ceil(span / 8.1); i++) {
      const x = this.wire.start + 1.35 + i * 8.1;
      this.lampXs.push(x);
      const glow = new Sprite(new SpriteMaterial({ map: glowMap, blending: AdditiveBlending, depthWrite: false }));
      glow.scale.setScalar(1.8);
      glow.position.set(x, 3.05, 1.2);
      const shade = createLampShade();
      shade.position.set(x, 3.35, 1.2);
      group.add(glow, shade);
    }
    // The real lights, carried along with the camera.
    this.key.position.set(0, 3.05, 1.2);
    const amber = new PointLight(AMBER, 6, 14, 1.8);
    amber.position.set(-6, 2.5, 3);
    const stain = new PointLight(STAIN, 6, 14, 1.8);
    stain.position.set(6, 2.5, 3);
    const tray = new PointLight(TRAY_GLOW, 6, 10, 2);
    tray.position.set(0, -1.6, 2.5);
    this.lightRig.add(this.key, amber, stain, tray);
    group.add(this.lightRig);
    return group;
  }

  private createTray(): Group {
    const group = new Group();
    const span = this.wire.end - this.wire.start;
    const tray = new Mesh(
      new PlaneGeometry(span + 10, 3),
      new MeshBasicMaterial({ color: TRAY_GLOW, transparent: true, opacity: 0.06 }),
    );
    tray.rotation.x = -Math.PI / 2;
    tray.position.set((this.wire.start + this.wire.end) / 2, -2.5, 0.5);
    group.add(tray);
    return group;
  }

  private createDust(): Points {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = this.wire.start - 4 + Math.random() * (this.wire.end - this.wire.start + 8);
      positions[i * 3 + 1] = -3 + Math.random() * 8;
      positions[i * 3 + 2] = -2.5 + Math.random() * 5.5;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return new Points(
      geometry,
      new PointsMaterial({ color: '#ffc3a0', size: 0.025, transparent: true, opacity: 0.55, depthWrite: false }),
    );
  }
}

function glowTexture(color: string): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.25, `${color}88`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}
