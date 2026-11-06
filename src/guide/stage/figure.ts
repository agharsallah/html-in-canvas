/**
 * Figure: a small 3D scene that explains one concept.
 *
 * Every figure is a `content="drawable"` canvas (a LabCanvas, the same one the
 * chapters' labs use). Each paint it:
 *   1. renders its three.js scene with the page's shared WebGL renderer,
 *   2. copies the pixels in with `drawImage`,
 *   3. draws its labels on top. Labels are real HTML: in a browser with
 *      HTML-in-Canvas they are `drawable` children drawn with
 *      `drawElementImage`, so they stay selectable text, crisp at any DPR and
 *      in the accessibility tree. Elsewhere LabCanvas places the same
 *      elements in a CSS layer over the canvas.
 *
 * So the guide uses the API to explain the API, and degrades to the "old way"
 * honestly where it has to.
 *
 * Figures are built lazily when they come near the viewport, tick only while
 * visible, and skip the GPU entirely when their scene reports it is at rest.
 */
import { Object3D, PerspectiveCamera, Scene, Vector3 } from 'three';
import { createLabCanvas, type LabCanvas } from '../../chapters/shared/lab-canvas';
import type { Capabilities } from '../../core/capabilities';
import { h, prefersReducedMotion } from '../../ui/dom';
import { SharedRenderer } from './shared-renderer';
import { onTick } from './ticker';

export type Anchor = Object3D | Vector3 | (() => Vector3);
export type LabelTone = 'tag' | 'code' | 'note' | 'good' | 'bad' | 'accent';

export interface FigureLabel {
  readonly el: HTMLElement;
  visible: boolean;
  anchor: Anchor;
  set(text: string): void;
  tone(tone: LabelTone): void;
}

export interface FigureEnv {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly reducedMotion: boolean;
  /** Pointer over the figure in [-1, 1], for gentle parallax. */
  readonly pointer: { x: number; y: number };
  /** An HTML label pinned to a point in the scene. */
  label(text: string, anchor: Anchor, tone?: LabelTone): FigureLabel;
  /** Something changed outside `update` (a control): draw next frame. */
  invalidate(): void;
}

export interface FigureInstance {
  /** Advance the scene. Return `false` when nothing moved, to skip drawing. */
  update?(dt: number, time: number): boolean | void;
  /** Controls built from the component kit, shown under the figure. */
  controls?: Node[];
}

export interface FigureSpec {
  /** Accessible description of what the figure shows. */
  label: string;
  /** The width / height the scene was composed for. Default 16 / 10. */
  aspect?: number;
  build(env: FigureEnv): FigureInstance;
}

export interface MountedFigure {
  readonly el: HTMLElement;
}

const worldPos = new Vector3();

function resolveAnchor(anchor: Anchor): Vector3 {
  if (anchor instanceof Object3D) return anchor.getWorldPosition(worldPos);
  if (anchor instanceof Vector3) return worldPos.copy(anchor);
  return worldPos.copy(anchor());
}

export function mountFigure(host: HTMLElement, spec: FigureSpec, caps: Capabilities): MountedFigure {
  const stageSlot = h('div', { class: 'g-figure-stage' });
  const controlsSlot = h('div', { class: 'g-figure-controls' });
  const el = h('div', { class: 'g-figure-body' }, stageSlot, controlsSlot);
  host.append(el);

  let built = false;
  const io = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting || built) return;
    built = true;
    io.disconnect();
    build(stageSlot, controlsSlot, spec, caps);
  }, { rootMargin: '400px 0px' });
  io.observe(stageSlot);
  return { el };
}

function build(stageSlot: HTMLElement, controlsSlot: HTMLElement, spec: FigureSpec, caps: Capabilities): void {
  const lab: LabCanvas = createLabCanvas(stageSlot, caps, spec.label, { maxScale: 2 });
  lab.root.classList.add('g-figure-surface');

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 16 / 10, 0.1, 100);
  camera.position.set(0, 0, 9);
  const pointer = { x: 0, y: 0 };
  const labels: FigureLabel[] = [];
  let dirty = true;

  const env: FigureEnv = {
    scene,
    camera,
    reducedMotion: prefersReducedMotion(),
    pointer,
    invalidate: () => {
      dirty = true;
    },
    label(text, anchor, tone = 'tag') {
      const node = h('span', { class: 'g-label', drawable: true, 'data-tone': tone }, text);
      lab.adopt(node);
      const label: FigureLabel = {
        el: node,
        visible: true,
        anchor,
        set: (next) => {
          if (node.textContent !== next) {
            node.textContent = next;
            lab.simulateChange(node); // native: the browser notices on its own
            dirty = true;
          }
        },
        tone: (next) => {
          if (node.dataset.tone !== next) {
            node.dataset.tone = next;
            lab.simulateChange(node);
            dirty = true;
          }
        },
      };
      labels.push(label);
      return label;
    },
  };

  const instance = spec.build(env);
  // On narrower figures (phones) widen the vertical FOV so the scene keeps
  // its composed horizontal extent instead of cropping its sides.
  const baseFov = camera.fov;
  const refAspect = spec.aspect ?? 16 / 10;
  if (instance.controls?.length) controlsSlot.append(...instance.controls);
  else controlsSlot.remove();

  lab.root.addEventListener('pointermove', (event) => {
    const rect = lab.root.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    dirty = true;
  });
  lab.root.addEventListener('pointerleave', () => {
    pointer.x = 0;
    pointer.y = 0;
    dirty = true;
  });

  const draw = () => {
    const { canvas, ctx } = lab;
    const width = canvas.width;
    const height = canvas.height;
    if (width < 2 || height < 2) return;
    const scale = lab.scale();
    const cssW = width / scale;
    const cssH = height / scale;
    const aspect = cssW / cssH;
    if (Math.abs(camera.aspect - aspect) > 1e-3) {
      camera.aspect = aspect;
      const halfTan = Math.tan((baseFov * Math.PI) / 360) * Math.max(1, refAspect / aspect);
      camera.fov = (Math.atan(halfTan) * 360) / Math.PI;
      camera.updateProjectionMatrix();
    }

    lab.beginFrame();
    const { source, sy } = SharedRenderer.get().render(scene, camera, width, height);
    ctx.drawImage(source, 0, sy, width, height, 0, 0, width, height);

    camera.updateMatrixWorld();
    for (const label of labels) {
      if (!label.visible) continue;
      const p = resolveAnchor(label.anchor).project(camera);
      if (p.z > 1) continue;
      const x = ((p.x + 1) / 2) * cssW - label.el.offsetWidth / 2;
      const y = ((1 - p.y) / 2) * cssH - label.el.offsetHeight / 2;
      try {
        lab.drawElement(label.el, Math.round(x), Math.round(y));
      } catch {
        // Native: no snapshot recorded yet for a brand-new label. Next paint.
        dirty = true;
      }
    }
  };
  lab.onPaint(draw);

  // Tick only while on screen.
  let visible = false;
  let stopTick: (() => void) | null = null;
  const io = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (visible && !stopTick) {
      dirty = true;
      stopTick = onTick((dt, time) => {
        const moved = instance.update?.(dt, time) !== false;
        if (moved || dirty) {
          dirty = false;
          lab.requestPaint();
        }
      });
    } else if (!visible && stopTick) {
      stopTick();
      stopTick = null;
    }
  });
  io.observe(lab.root);
}
