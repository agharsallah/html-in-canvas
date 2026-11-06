/**
 * The inspector: take a print off the line and turn it over.
 *
 * The camera flies in, the paper lifts off the wall and flips, and its back
 * (a second drawable, shared by every print) faces you. The face turned away
 * becomes `inert`, the same trick as the official WebGL demo's flip card:
 * hidden faces leave the tab order and the accessibility tree.
 *
 * Keys: Esc hangs it back, ← and → turn over the neighbouring print.
 */
import { Mesh, PlaneGeometry, Vector3, type PerspectiveCamera, type ShaderMaterial } from 'three';
import type { Size } from '../hic/projective-geometry';
import type { RollId } from '../story/rolls';
import type { PrintView } from '../ui/print-card';
import { createVerso, renderVerso, VERSO_SIZE } from '../ui/print-verso';
import type { Roll } from '../story/rolls';
import type { CameraRig } from './camera-rig';
import { SAFELIGHT } from './darkroom-set';
import type { Print } from './print';
import { createPrintMaterial, setPrintTexture } from './print-material';
import type { SurfaceBackend, SurfaceHandle } from './surfaces/surface';

export interface InspectorItem {
  roll: Roll;
  print: Print;
  card: HTMLElement;
}

export interface InspectorOptions {
  surfaces: SurfaceBackend;
  camera: PerspectiveCamera;
  rig: CameraRig;
  plane: Size;
  items: InspectorItem[];
  viewOf(roll: Roll, index: number): PrintView;
  /** Called after opening or closing, e.g. to pause walking the line. */
  onChange(open: boolean): void;
}

const HINT = 'Esc or click the wall to hang it back. ← → turns over the next print.';

export class Inspector {
  private readonly verso = createVerso();
  private readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly handle: SurfaceHandle;
  private current: InspectorItem | null = null;
  private develop = 0;
  private savedHint: string | null = null;
  private returnFocus: HTMLElement | null = null;

  constructor(private readonly o: InspectorOptions) {
    const { plane } = o;
    this.mesh = new Mesh(
      new PlaneGeometry(plane.width, plane.height),
      createPrintMaterial({ paper: '#ffffff', light: SAFELIGHT, aspect: plane.width / plane.height }),
    );
    // Facing the other way, just behind the front: the back of the paper.
    this.mesh.rotation.y = Math.PI;
    this.mesh.position.z = -0.006;
    this.mesh.visible = false;
    this.handle = o.surfaces.attach({ element: this.verso, mesh: this.mesh, plane, elementSize: VERSO_SIZE });

    this.verso.addEventListener('click', (event) => {
      const action = (event.target as Element).closest<HTMLElement>('[data-verso]')?.dataset.verso;
      if (action === 'close') this.close();
      if (action === 'prev') this.step(-1);
      if (action === 'next') this.step(1);
    });
    window.addEventListener('keydown', (event) => {
      if (!this.current) return;
      if (event.key === 'Escape') this.close();
      else if (event.key === 'ArrowLeft') this.step(-1);
      else if (event.key === 'ArrowRight') this.step(1);
      else return;
      event.preventDefault();
    });
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  open(id: RollId, focus = false): void {
    const index = this.o.items.findIndex((item) => item.roll.id === id);
    const item = this.o.items[index];
    if (!item || item === this.current) return;
    if (!this.current) {
      this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    this.current?.print.turn(false);
    this.current?.card.removeAttribute('inert');
    this.current = item;

    renderVerso(this.verso, item.roll, this.o.viewOf(item.roll, index), { index, total: this.o.items.length });
    (this.mesh.material.uniforms.uPaper!.value as { set(c: string): void }).set(item.roll.process.paper);
    item.print.paper.add(this.mesh);
    this.mesh.visible = true;
    this.develop = 0;
    item.print.turn(true);
    for (const other of this.o.items) other.print.dim(other !== item);
    item.card.setAttribute('inert', '');
    this.verso.inert = false;
    this.verso.removeAttribute('aria-hidden');

    this.o.rig.focusOn(this.frameCenter(item), this.frameDistance());
    document.body.dataset.inspect = item.roll.id;
    this.setHint(true);
    this.o.onChange(true);
    if (focus) {
      // Keyboard users land on the main action of the back.
      this.verso.querySelector<HTMLElement>('[data-enter], [data-verso="close"]')?.focus({ preventScroll: true });
    }
  }

  close(): void {
    const item = this.current;
    if (!item) return;
    this.current = null;
    item.print.turn(false);
    item.card.removeAttribute('inert');
    for (const other of this.o.items) other.print.dim(false);
    this.verso.inert = true;
    this.verso.setAttribute('aria-hidden', 'true');
    this.o.rig.release();
    delete document.body.dataset.inspect;
    this.setHint(false);
    this.o.onChange(false);
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = null;
  }

  /** Refresh the back if progress changed while it was open. */
  refresh(): void {
    const item = this.current;
    if (!item) return;
    const index = this.o.items.indexOf(item);
    renderVerso(this.verso, item.roll, this.o.viewOf(item.roll, index), { index, total: this.o.items.length });
  }

  update(dt: number): void {
    // Once a print has finished turning back, take the verso off it.
    const holder = this.mesh.parent;
    const owner = this.o.items.find((item) => item.print.paper === holder);
    if (!this.current && owner && owner.print.turnAmount === 0) {
      holder?.remove(this.mesh);
      this.mesh.visible = false;
    }
    // The back develops like a print: blank first, notes emerging.
    this.develop = Math.min(1, this.develop + dt * 1.4);
    const ready = this.handle.isReady();
    setPrintTexture(this.mesh.material, this.handle.texture, ready);
    this.mesh.material.uniforms.uDevelop!.value = ready ? this.develop : 0;
    this.handle.setDevelop(this.develop);
  }

  private step(delta: number): void {
    if (!this.current) return;
    const next = this.o.items[this.o.items.indexOf(this.current) + delta];
    if (next) this.open(next.roll.id, this.verso.contains(document.activeElement));
  }

  /** Where the turned print's centre will be, in world space. */
  private frameCenter(item: InspectorItem): Vector3 {
    const pivot = item.print.pivot.getWorldPosition(new Vector3());
    // Aim a little above the centre, so the print sits below the HUD.
    return new Vector3(pivot.x, pivot.y - this.o.plane.height * 0.44 - 0.06, pivot.z + 0.35);
  }

  /** Close enough to fill most of the screen, on any aspect ratio. */
  private frameDistance(): number {
    const { camera, plane } = this.o;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const byHeight = plane.height / 0.8 / (2 * tan);
    const byWidth = plane.width / 0.86 / (2 * tan * camera.aspect);
    return Math.max(byHeight, byWidth);
  }

  private setHint(open: boolean): void {
    const hint = document.querySelector<HTMLElement>('.hud-hint');
    if (!hint) return;
    if (open) {
      this.savedHint ??= hint.textContent ?? '';
      hint.textContent = HINT;
    } else if (this.savedHint !== null) {
      hint.textContent = this.savedHint;
      this.savedHint = null;
    }
  }
}
