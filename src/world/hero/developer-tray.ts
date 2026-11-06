/**
 * The developer tray: the opening shot of the site.
 *
 * A shallow tray of chemistry with the hero card lying in it. The card is a
 * drawable child of the world canvas like every print; its snapshot feeds
 * the liquid shader, and an invisible plane at the paper's exact position
 * carries the DOM geometry, so the real input and button under the liquid
 * receive clicks and keystrokes.
 *
 * Ripples come from the card's own pointer events: `offsetX`/`offsetY` are
 * in the element's coordinate space, which only works because the browser
 * knows where the element lies in 3D (updateElementGeometry).
 */
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, type ShaderMaterial, Vector4 } from 'three';
import type { SurfaceBackend, SurfaceHandle } from '../surfaces/surface';
import { createLiquidMaterial, MAX_RIPPLES, setLiquidTexture } from './liquid-material';

export interface TrayOptions {
  surfaces: SurfaceBackend;
  element: HTMLElement;
  elementSize: { width: number; height: number };
  colors: { paper: string; tint: string; glint: string };
}

const LIQUID = { width: 4.2, height: 3.1 };
const PAPER_WIDTH = 3.3;

export class DeveloperTray {
  readonly root = new Group();
  private readonly liquid: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly hitPlane: Mesh;
  private readonly handle: SurfaceHandle;
  private readonly ripples: Vector4[];
  private next = 0;
  private time = 0;
  private develop = 0;
  private developTarget = 1;
  private lastRippleAt = 0;

  constructor({ surfaces, element, elementSize, colors }: TrayOptions) {
    const paperHeight = (PAPER_WIDTH * elementSize.height) / elementSize.width;
    const paperRect: [number, number, number, number] = [
      (LIQUID.width - PAPER_WIDTH) / 2 / LIQUID.width,
      (LIQUID.height - paperHeight) / 2 / LIQUID.height,
      PAPER_WIDTH / LIQUID.width,
      paperHeight / LIQUID.height,
    ];

    // Liquid surface, lying flat (local XY rotated to the floor).
    this.liquid = new Mesh(
      new PlaneGeometry(LIQUID.width, LIQUID.height),
      createLiquidMaterial({ ...colors, floor: '#0d0a0d', aspect: LIQUID.width / LIQUID.height, paperRect }),
    );
    this.liquid.rotation.x = -Math.PI / 2;
    this.root.add(this.liquid);
    this.ripples = this.liquid.material.uniforms.uRipples!.value as Vector4[];

    // The paper's true position for hit testing and accessibility geometry.
    // Invisible (material, not mesh, so the surface backend still culls it).
    this.hitPlane = new Mesh(
      new PlaneGeometry(PAPER_WIDTH, paperHeight),
      new MeshBasicMaterial({ visible: false }),
    );
    this.hitPlane.rotation.x = -Math.PI / 2;
    this.hitPlane.position.y = 0.001;
    this.root.add(this.hitPlane);

    this.root.add(this.createWalls());
    this.root.updateMatrixWorld(true);

    this.handle = surfaces.attach({ element, mesh: this.hitPlane, plane: { width: PAPER_WIDTH, height: paperHeight }, elementSize });
    this.bindRipples(element, elementSize);
  }

  /** Drop a ripple at liquid uv (0..1), strength ~0.5–2. */
  ripple(u: number, v: number, strength = 1): void {
    this.ripples[this.next]!.set(u, v, this.time, strength);
    this.next = (this.next + 1) % MAX_RIPPLES;
  }

  /** Start the print blank and develop it over a few seconds. */
  developFromBlank(): void {
    this.develop = 0;
    this.developTarget = 1;
  }

  setDeveloped(): void {
    this.develop = 1;
    this.developTarget = 1;
  }

  update(dt: number, reducedMotion: boolean): void {
    this.time += dt;
    const speed = reducedMotion ? 10 : 0.32;
    this.develop = Math.min(this.developTarget, this.develop + dt * speed);
    // A drip now and then while the print develops, so the liquid is alive.
    if (!reducedMotion && this.develop < 1 && this.time - this.lastRippleAt > 1.1) {
      this.lastRippleAt = this.time;
      this.ripple(0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.6, 0.8);
    }
    const u = this.liquid.material.uniforms;
    u.uTime!.value = this.time;
    u.uDevelop!.value = this.develop;
    setLiquidTexture(this.liquid.material, this.handle.texture, this.handle.isReady());
    this.handle.setDevelop(this.develop);
  }

  private createWalls(): Group {
    const walls = new Group();
    const material = new MeshLambertMaterial({ color: '#2a1529' });
    const t = 0.12;
    const hgt = 0.32;
    const w = LIQUID.width + t * 2;
    const d = LIQUID.height + t * 2;
    const parts: Array<[number, number, number, number, number]> = [
      [w, hgt, t, 0, -d / 2 + t / 2],
      [w, hgt, t, 0, d / 2 - t / 2],
      [t, hgt, d, -w / 2 + t / 2, 0],
      [t, hgt, d, w / 2 - t / 2, 0],
    ];
    for (const [sx, sy, sz, x, z] of parts) {
      const wall = new Mesh(new BoxGeometry(sx, sy, sz), material);
      wall.position.set(x, hgt / 2 - 0.08, z);
      walls.add(wall);
    }
    const base = new Mesh(new BoxGeometry(w + 0.6, 0.06, d + 0.6), new MeshLambertMaterial({ color: '#160b14' }));
    base.position.y = -0.11;
    // The darkroom bench the tray stands on, wide enough to fill the view.
    const bench = new Mesh(new BoxGeometry(16, 0.12, 9), new MeshLambertMaterial({ color: '#241020' }));
    bench.position.set(0, -0.2, -1.2);
    walls.add(base, bench);
    return walls;
  }

  /** Pointer events arrive in the element's own coordinates, even on 3D liquid. */
  private bindRipples(element: HTMLElement, size: { width: number; height: number }): void {
    const toLiquid = (event: PointerEvent): [number, number] => {
      const rect = this.liquid.material.uniforms.uPaperRect!.value as Vector4;
      const pu = event.offsetX / size.width;
      const pv = 1 - event.offsetY / size.height;
      return [rect.x + pu * rect.z, rect.y + pv * rect.w];
    };
    element.addEventListener('pointermove', (event) => {
      if (event.target !== element || this.time - this.lastRippleAt < 0.12) return;
      this.lastRippleAt = this.time;
      this.ripple(...toLiquid(event), 0.6);
    });
    element.addEventListener('pointerdown', (event) => {
      if (event.target === element) this.ripple(...toLiquid(event), 1.8);
    });
    // Typing sends a small ripple out from the field you are typing in.
    element.addEventListener('input', (event) => {
      const field = event.target as HTMLElement;
      // Card-relative layout position (the card is the offsetParent).
      const px = (field.offsetLeft + field.offsetWidth * 0.5) / size.width;
      const py = 1 - (field.offsetTop + field.offsetHeight * 0.5) / size.height;
      const rect = this.liquid.material.uniforms.uPaperRect!.value as Vector4;
      this.ripple(rect.x + px * rect.z, rect.y + py * rect.w, 0.35);
    });
  }
}
