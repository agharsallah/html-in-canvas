/**
 * Native HTML-in-Canvas surfaces (WebGL).
 *
 * Per frame:
 *   prepare(): project every print once. Prints on screen get their
 *              snapshot uploaded when it changed (or was never uploaded);
 *              off-screen prints are skipped and stay "pending", so the
 *              first frame uploads 2–3 textures instead of 13.
 *   finish():  sync DOM geometry for on-screen prints, far to near so the
 *              nearest print ends on top of the hit-test stack. Off-screen
 *              prints get an empty hit-test clip once, then are left alone.
 */
import type { Camera, WebGLRenderer } from 'three';
import { ElementTexture } from '../../hic/element-texture';
import { elementToCanvasMatrix, isInFrontOfCamera, projectElementPoint, type Matrix16 } from '../../hic/projective-geometry';
import type { DrawableCanvas } from '../../hic/types';
import type { Viewport } from '../stage';
import type { SurfaceBackend, SurfaceBinding, SurfaceHandle } from './surface';

interface Entry {
  binding: SurfaceBinding;
  texture: ElementTexture;
  /** This frame's element -> canvas matrix (from prepare). */
  matrix: Matrix16 | null;
  /** On screen this frame. */
  visible: boolean;
  /** Distance to the camera, for hit-test ordering. */
  depth: number;
  /** Last matrix sent to the DOM, to skip redundant geometry updates. */
  sent: Matrix16 | null;
  clipped: boolean;
}

const EMPTY_CLIP = { x: 0, y: 0, width: 0, height: 0 };
/** Treat prints this far outside the viewport (fraction of its size) as visible. */
const MARGIN = 0.15;

export class NativeSurfaces implements SurfaceBackend {
  readonly mode = 'native' as const;
  private readonly entries = new Set<Entry>();
  private readonly canvas: DrawableCanvas;

  constructor(private readonly renderer: WebGLRenderer) {
    this.canvas = renderer.domElement as DrawableCanvas;
  }

  attach(binding: SurfaceBinding): SurfaceHandle {
    const { element } = binding;
    element.setAttribute('drawable', '');
    if (element.parentElement !== this.canvas) this.canvas.appendChild(element);

    const entry: Entry = {
      binding,
      texture: new ElementTexture(this.renderer, element),
      matrix: null,
      visible: false,
      depth: 0,
      sent: null,
      clipped: false,
    };
    this.entries.add(entry);
    this.canvas.requestPaint();

    return {
      texture: entry.texture.texture,
      isReady: () => !entry.texture.needsUpload,
      setDevelop: () => {
        /* the print shader develops the texture; nothing to do in the DOM */
      },
      detach: () => {
        this.entries.delete(entry);
        this.canvas.clearElementGeometry?.(element);
        entry.texture.dispose();
        element.remove();
      },
    };
  }

  prepare(changed: ReadonlySet<Element>, camera: Camera, viewport: Viewport): void {
    camera.updateMatrixWorld();
    for (const entry of this.entries) {
      const { binding } = entry;
      binding.mesh.updateWorldMatrix(true, false);
      entry.matrix = elementToCanvasMatrix({
        objectMatrixWorld: binding.mesh.matrixWorld,
        camera,
        plane: binding.plane,
        element: binding.elementSize,
        viewport,
      });
      entry.visible = binding.mesh.visible && onScreen(entry.matrix, binding.elementSize, viewport);
      entry.depth = binding.mesh.matrixWorld.elements[14]! - camera.position.z;

      if (changed.has(binding.element)) entry.texture.invalidate();
      if (entry.visible && entry.texture.needsUpload) entry.texture.upload();
    }
  }

  /** Mark every snapshot stale, e.g. after the loop was paused. */
  invalidate(): void {
    for (const entry of this.entries) entry.texture.invalidate();
  }

  finish(): void {
    if (!this.canvas.updateElementGeometry) return;

    const visible: Entry[] = [];
    for (const entry of this.entries) {
      if (entry.visible) visible.push(entry);
      else if (!entry.clipped) {
        this.canvas.updateElementGeometry(entry.binding.element, { canvasClip: EMPTY_CLIP });
        entry.clipped = true;
        entry.sent = null;
      }
    }

    // Far to near (more negative depth is farther): each update moves the
    // element to the top of the hit-test stack, so the nearest wins.
    visible.sort((a, b) => a.depth - b.depth);
    for (const entry of visible) {
      const { binding, matrix } = entry;
      if (!matrix) continue;
      const reopen = entry.clipped;
      if (!reopen && entry.sent && sameMatrix(entry.sent, matrix)) {
        this.canvas.updateElementGeometry(binding.element, {}); // re-assert order only
        continue;
      }
      this.canvas.updateElementGeometry(binding.element, {
        canvasTransform: new DOMMatrix(matrix),
        ...(reopen ? { canvasClip: { x: 0, y: 0, ...binding.elementSize } } : {}),
      });
      entry.clipped = false;
      entry.sent = matrix;
    }
  }

  dispose(): void {
    for (const entry of this.entries) entry.texture.dispose();
    this.entries.clear();
  }
}

/** True when the projected print overlaps the viewport (with a margin). */
function onScreen(m: Matrix16, size: { width: number; height: number }, viewport: Viewport): boolean {
  if (!isInFrontOfCamera(m, size)) return false;
  const corners = [[0, 0], [size.width, 0], [0, size.height], [size.width, size.height]] as const;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [u, v] of corners) {
    const p = projectElementPoint(m, u, v);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const mx = (maxX - minX) * MARGIN;
  const my = (maxY - minY) * MARGIN;
  return maxX + mx > 0 && minX - mx < viewport.width && maxY + my > 0 && minY - my < viewport.height;
}

function sameMatrix(a: Matrix16, b: Matrix16): boolean {
  for (let i = 0; i < 16; i++) if (Math.abs(a[i]! - b[i]!) > 1e-4) return false;
  return true;
}
