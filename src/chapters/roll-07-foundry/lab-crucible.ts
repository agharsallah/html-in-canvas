/**
 * The crucible: a live HTML card through the melt shader.
 *
 * native:    the stage canvas is the drawable host; the card is uploaded with
 *            hic/ElementTexture (texElementSubImage2D) when it changes, and
 *            its geometry is the *unmelted* plane, sent with
 *            updateElementGeometry. So the browser's own hit testing shows
 *            what the Melt does to clicks.
 * simulated: the card sits in the side panel and a stand-in texture is
 *            painted from it; clicks are mapped through the same geometry and
 *            forwarded to the control under them.
 *
 * Either way, each click reports two controls: the one the browser hit
 * (geometry) and the one you saw (geometry pushed through the shader maths).
 */
import { Mesh, NoColorSpace, PlaneGeometry } from 'three';
import type { Capabilities } from '../../core/capabilities';
import { ElementTexture } from '../../hic/element-texture';
import { onPaint } from '../../hic/paint';
import { canvasToElementPoint, elementToCanvasMatrix, type Matrix16 } from '../../hic/projective-geometry';
import { isDrawableCanvas, makeDrawableHost } from '../../hic/types';
import { createStandIn } from '../../scenes/element-standin';
import { MiniStage } from '../../scenes/mini-stage';
import { createMeltMaterial } from './melt-material';
import { boxAt, seenAt, type Box, type Effects } from './rules';

export interface CrucibleClick {
  hit: string | null;
  seen: string | null;
  drift: number;
}

export interface Crucible {
  readonly native: boolean;
  readonly effects: Effects;
  setEffects(patch: Partial<Effects>): void;
  /** Re-read the theme from CSS (the jelly slider pattern). */
  readTheme(): string;
  markChanged(): void;
  destroy(): void;
}

const PLANE = { width: 1.6, height: 1.0 };

export function mountCrucible(host: HTMLElement, opts: {
  caps: Capabilities;
  card: HTMLElement;
  boxes(): Box[];
  onUpload(): void;
  onClick(click: CrucibleClick): void;
}): Crucible {
  const { card } = opts;
  const stage = new MiniStage(host, { label: 'The crucible: a live card under a shader', className: 'scene-crucible' });
  stage.camera.position.set(0, 0, 2.35);
  const canvas = stage.canvas;
  const native = opts.caps.webgl && isDrawableCanvas(canvas);
  const size = () => ({ width: Math.max(1, card.offsetWidth), height: Math.max(1, card.offsetHeight) });
  const melt = createMeltMaterial(size(), PLANE);
  const mesh = new Mesh(new PlaneGeometry(PLANE.width, PLANE.height, 96, 60), melt.material);
  stage.scene.add(mesh);
  const effects: Effects = { heat: 0.6, grain: 0.2, ripple: 0, melt: 0 };
  const cleanups: Array<() => void> = [];
  let time = 0;
  let matrix: Matrix16 | null = null;
  let pending = true;

  if (native) {
    canvas.removeAttribute('role');
    canvas.setAttribute('aria-label', 'Crucible canvas with a live card');
    makeDrawableHost(canvas);
    card.setAttribute('drawable', '');
    canvas.append(card);
  }
  const elementTexture = native ? new ElementTexture(stage.renderer, card) : null;
  const standIn = native ? null : createStandIn(card);
  if (standIn) standIn.texture.colorSpace = NoColorSpace; // raw sRGB, like the native snapshot
  melt.setMap(elementTexture?.texture ?? standIn!.texture);

  const readTheme = () => {
    const heat = getComputedStyle(card).getPropertyValue('--heat');
    melt.setHeatColor(heat);
    stage.invalidate();
    return heat.trim();
  };
  readTheme();

  const sendGeometry = () => {
    if (native && matrix && isDrawableCanvas(canvas) && canvas.updateElementGeometry) {
      canvas.updateElementGeometry(card, { canvasTransform: new DOMMatrix(matrix) });
    }
  };

  stage.onFrame((dt) => {
    const moving = effects.ripple > 0 || effects.melt > 0 || effects.grain > 0 || effects.heat > 0;
    if (moving && !stage.reducedMotion) time += dt;
    melt.setSize(size().width, size().height);
    melt.set({ ...effects, time });
    const next = elementToCanvasMatrix({
      objectMatrixWorld: mesh.matrixWorld, camera: stage.camera, plane: PLANE, element: size(),
      viewport: { width: canvas.clientWidth, height: canvas.clientHeight },
    });
    const changed = !matrix || next.some((v, i) => Math.abs(v - matrix![i]!) > 1e-4);
    matrix = next;
    if (native && changed && isDrawableCanvas(canvas)) canvas.requestPaint();
    if (!native && pending) {
      standIn!.paint();
      opts.onUpload();
      pending = false;
    }
    return moving && !stage.reducedMotion;
  });

  if (native && isDrawableCanvas(canvas)) {
    cleanups.push(onPaint(canvas, (changed) => {
      if (changed.includes(card)) elementTexture!.invalidate();
      if (elementTexture!.needsUpload && elementTexture!.upload()) opts.onUpload();
      sendGeometry();
      stage.invalidate();
    }));
    canvas.requestPaint();
  }

  const onPointer = (event: PointerEvent) => {
    if (!matrix) return;
    const rect = canvas.getBoundingClientRect();
    const g = canvasToElementPoint(matrix, event.clientX - rect.left, event.clientY - rect.top);
    const boxes = opts.boxes();
    const seenPoint = g ? seenAt(g.u, g.v, effects, time) : null;
    const seen = seenPoint ? boxAt(boxes, seenPoint.u, seenPoint.v) : null;
    let hit: string | null;
    if (native) {
      // The browser decides; we only read what it found.
      hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-control]')?.dataset.control ?? null;
    } else {
      hit = g ? boxAt(boxes, g.u, g.v) : null;
      const control = hit ? card.querySelector<HTMLElement>(`[data-control="${hit}"]`) : null;
      if (control) {
        event.preventDefault();
        control.focus({ preventScroll: true });
        control.click();
      }
    }
    const drift = g && seenPoint ? Math.hypot(seenPoint.u - g.u, seenPoint.v - g.v) : 0;
    opts.onClick({ hit, seen, drift });
  };
  stage.el.addEventListener('pointerdown', onPointer, true);
  cleanups.push(() => stage.el.removeEventListener('pointerdown', onPointer, true));

  return {
    native,
    effects,
    setEffects(patch) {
      Object.assign(effects, patch);
      stage.invalidate();
    },
    readTheme,
    markChanged() {
      pending = true;
      stage.invalidate();
    },
    destroy() {
      cleanups.forEach((fn) => fn());
      if (native) canvas.clearElementGeometry?.(card);
      elementTexture?.dispose();
      standIn?.dispose();
      stage.destroy();
    },
  };
}
