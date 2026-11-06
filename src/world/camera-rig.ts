/**
 * Camera rig: walks along the wire, leans toward the cursor, and can fly in
 * close to a single print.
 */
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';

export interface RigLimits {
  minX: number;
  maxX: number;
}

const BASE_Y = 1.25;
const BASE_Z = 8.4;
const LOOK_Y = 0.85;

export class CameraRig {
  private x = 0;
  private targetX = 0;
  private lean = { x: 0, y: 0 };
  private focus: { position: Vector3; look: Vector3 } | null = null;
  /** A fixed viewpoint the track can rest at (the developer tray). */
  private anchor: { position: Vector3; look: Vector3 } | null = null;
  private readonly look = new Vector3(0, LOOK_Y, 0);
  private readonly lookCurrent = new Vector3(0, LOOK_Y, 0);

  constructor(
    private readonly camera: PerspectiveCamera,
    private limits: RigLimits,
  ) {
    camera.position.set(0, BASE_Y, BASE_Z);
  }

  /** Where the camera currently looks along the wire. */
  get focusX(): number {
    return this.lookCurrent.x;
  }

  get trackX(): number {
    return this.targetX;
  }

  setLimits(limits: RigLimits): void {
    this.limits = limits;
    this.targetX = MathUtils.clamp(this.targetX, limits.minX, limits.maxX);
  }

  pan(dx: number): void {
    this.setTarget(this.targetX + dx);
  }

  setTarget(x: number, instant = false): void {
    this.targetX = MathUtils.clamp(x, this.limits.minX, this.limits.maxX);
    if (instant) this.x = this.targetX;
  }

  /** Normalised pointer position in [-1, 1]. */
  setLean(nx: number, ny: number): void {
    this.lean = { x: nx, y: ny };
  }

  /** Fly in front of a world point (e.g. a print's centre). */
  focusOn(center: Vector3, distance = 3.4): void {
    this.focus = {
      position: new Vector3(center.x, center.y + 0.05, center.z + distance),
      look: center.clone(),
    };
  }

  release(): void {
    this.focus = null;
  }

  /** Rest at a fixed viewpoint until cleared; a focus (fly-in) still wins. */
  setAnchor(position: Vector3 | null, look?: Vector3): void {
    this.anchor = position && look ? { position, look } : null;
  }

  get anchored(): boolean {
    return this.anchor !== null;
  }

  /** Teleport, e.g. to start the intro high above the tray. */
  jump(position: Vector3, look: Vector3): void {
    this.camera.position.copy(position);
    this.lookCurrent.copy(look);
  }

  update(dt: number, reducedMotion: boolean): void {
    const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 4);
    this.x += (this.targetX - this.x) * ease;

    const leanScale = reducedMotion ? 0 : 1;
    const view = this.focus ?? this.anchor;
    const target = view
      ? view.position.clone().add(new Vector3(this.lean.x * 0.12 * leanScale, 0, this.lean.y * 0.08 * leanScale))
      : new Vector3(this.x + this.lean.x * 0.35 * leanScale, BASE_Y - this.lean.y * 0.2 * leanScale, BASE_Z);
    this.look.copy(view ? view.look : new Vector3(this.x, LOOK_Y, 0));

    // Long moves (tray <-> line) glide; small ones stay snappy.
    const far = this.camera.position.distanceTo(target) > 3;
    const glide = reducedMotion ? 1 : 1 - Math.exp(-dt * (far ? 1.6 : 4));
    this.camera.position.lerp(target, glide);
    this.lookCurrent.lerp(this.look, glide);
    this.camera.lookAt(this.lookCurrent);
  }
}
