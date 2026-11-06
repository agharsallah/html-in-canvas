/**
 * A print hanging from the wire by a wooden peg. It sways on a damped
 * spring, reacts to "wind" from the cursor, and develops over time.
 */
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Vector3,
  type ShaderMaterial,
} from 'three';
import type { Size } from '../hic/projective-geometry';
import { createPrintMaterial, setPrintTexture } from './print-material';
import type { SurfaceHandle } from './surfaces/surface';

export interface PrintOptions {
  plane: Size;
  paper: string;
  light: string;
  /** Per-print phase so the line doesn't sway in lockstep. */
  seed: number;
}

const pegGeometry = new BoxGeometry(0.09, 0.26, 0.07);
const pegMaterial = new MeshLambertMaterial({ color: '#8a6a4a' });
let shadowMaterial: MeshBasicMaterial | null = null;

/** One soft shadow texture shared by every print. */
function getShadowMaterial(): MeshBasicMaterial {
  if (shadowMaterial) return shadowMaterial;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.85)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  shadowMaterial = new MeshBasicMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false });
  return shadowMaterial;
}

export class Print {
  /** Pivot on the wire. Rotate this to swing. */
  readonly pivot = new Group();
  readonly paper: Mesh<PlaneGeometry, ShaderMaterial>;
  private handle: SurfaceHandle | null = null;
  private angle = 0;
  private velocity = 0;
  private twist = 0;
  private develop = 0;
  private developTarget = 0;
  private hover = 0;
  private loupe = 0;
  private turnT = 0;
  private turned = false;
  private dimmed = false;
  private dimAmount = 0;
  hovered = false;

  constructor(private readonly options: PrintOptions) {
    const { plane } = options;
    this.paper = new Mesh(new PlaneGeometry(plane.width, plane.height), createPrintMaterial({ ...options, aspect: plane.width / plane.height }));
    this.paper.position.y = -plane.height / 2 - 0.06;
    this.pivot.add(this.paper);

    // The back of the paper, seen while a print turns over.
    const back = new Mesh(new PlaneGeometry(plane.width, plane.height), new MeshBasicMaterial({ color: options.paper }));
    (back.material.color as Color).multiplyScalar(0.82);
    back.rotation.y = Math.PI;
    back.position.z = -0.002;
    this.paper.add(back);

    // A soft shadow just behind the paper makes it float off the wall.
    const shadow = new Mesh(new PlaneGeometry(plane.width * 1.5, plane.height * 1.35), getShadowMaterial());
    shadow.position.set(0.14, -plane.height / 2 - 0.22, -0.45);
    shadow.renderOrder = -1;
    this.pivot.add(shadow);

    const peg = new Mesh(pegGeometry, pegMaterial);
    peg.position.set(0, -0.02, 0.02);
    this.pivot.add(peg);
    this.angle = Math.sin(options.seed * 12.9898) * 0.05;
  }

  bind(handle: SurfaceHandle): void {
    this.handle = handle;
  }

  /** Where the print should develop to: 0 blank, ~0.12 latent, 1 fixed. */
  setDevelopTarget(target: number, instant = false): void {
    this.developTarget = target;
    if (instant) this.develop = target;
  }

  /** Move the safelight loupe (uv, origin bottom-left). Shows on latent prints only. */
  peek(u: number, v: number): void {
    const loupe = this.paper.material.uniforms.uLoupe!.value as Vector3;
    loupe.x = u;
    loupe.y = v;
  }

  /** Turn the print over to show its back (or hang it face out again). */
  turn(over: boolean): void {
    this.turned = over;
  }

  /** Fade into the dark while another print is in your hands. */
  dim(on: boolean): void {
    this.dimmed = on;
  }

  /** 0 = face out, 1 = turned over; eased. */
  get turnAmount(): number {
    return smooth(this.turnT);
  }

  /** A nudge, e.g. from the cursor or when the print gets focus. */
  push(strength: number): void {
    this.velocity += strength;
  }

  update(dt: number, time: number, wind: number, reducedMotion: boolean): void {
    const k = 18;
    const damping = 2.6;
    const breeze = reducedMotion ? 0 : Math.sin(time * 0.7 + this.options.seed * 3.1) * 0.012 + wind;
    this.turnT = reducedMotion ? (this.turned ? 1 : 0)
      : Math.min(1, Math.max(0, this.turnT + (this.turned ? dt : -dt) * 1.5));
    const turn = smooth(this.turnT);
    this.velocity += (-k * this.angle - damping * this.velocity + breeze * k) * dt;
    this.angle += this.velocity * dt;
    // A print in your hands doesn't swing.
    if (reducedMotion || turn > 0) this.angle *= reducedMotion ? 0.9 : 1 - turn * 0.2;

    const twistTarget = this.hovered || this.turned ? 0.0 : Math.sin(time * 0.5 + this.options.seed) * 0.06;
    this.twist += (twistTarget - this.twist) * Math.min(1, dt * 2);
    this.pivot.rotation.set(0, reducedMotion ? 0 : this.twist, this.angle);

    const developSpeed = this.developTarget > this.develop ? 0.45 : 2.5;
    this.develop += Math.sign(this.developTarget - this.develop) *
      Math.min(Math.abs(this.developTarget - this.develop), dt * developSpeed);
    this.hover += ((this.hovered ? 1 : 0) - this.hover) * Math.min(1, dt * 8);
    // Hovered prints lift toward you. The paper mesh moves, so the DOM
    // geometry follows and the real button stays under the pointer.
    const lift = reducedMotion ? 0 : this.hover * (1 - turn);
    // Turning over: the paper comes off the wall, flips around its vertical
    // axis, and its back (another drawable) faces you.
    this.paper.position.z = lift * 0.45 + Math.sin(turn * Math.PI) * 0.5 + turn * 0.35;
    this.paper.rotation.y = turn * Math.PI;
    this.paper.scale.setScalar(1 + lift * 0.04);

    const latent = this.developTarget < 0.5 && this.hovered && !this.turned;
    this.loupe += ((latent ? 1 : 0) - this.loupe) * Math.min(1, dt * (latent ? 6 : 4));

    const uniforms = this.paper.material.uniforms;
    uniforms.uDevelop!.value = this.develop;
    uniforms.uTime!.value = time;
    uniforms.uHover!.value = this.hover;
    (uniforms.uLoupe!.value as Vector3).z = this.loupe;
    this.dimAmount += ((this.dimmed ? 1 : 0) - this.dimAmount) * Math.min(1, dt * 4);
    uniforms.uDim!.value = this.dimAmount;
    if (this.handle) {
      setPrintTexture(this.paper.material, this.handle.texture, this.handle.isReady());
      this.handle.setDevelop(this.develop);
    }
  }

  dispose(): void {
    this.handle?.detach();
    this.paper.geometry.dispose();
    this.paper.material.dispose();
  }
}

const smooth = (t: number): number => t * t * (3 - 2 * t);
