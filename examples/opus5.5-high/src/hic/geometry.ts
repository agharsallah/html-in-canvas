/**
 * Geometry for 3D contexts. WebGL and WebGPU can't tell the browser where a
 * texture lands, so we hand `updateElementGeometry()` a `canvasTransform`:
 * a full projective 4×4 matrix mapping the element's border box (CSS px, y down)
 * to canvas CSS px.
 *
 *   canvasTransform = Viewport · Projection · View · Model · ElementToPlane
 *
 * The viewport step is affine in (x, y, w), so it can be applied before the
 * perspective divide, and the browser divides for us when it hit-tests.
 * Verified in Chrome 157: elementFromPoint() lands on the right child of a
 * perspective-tilted element.
 */
import { mul, scaling, translation, type Mat4 } from './mat4';

export interface Size {
  width: number;
  height: number;
}

/**
 * @param mvp      projection · view · model, for a plane centered at its origin in XY (world units = CSS px)
 * @param element  border-box size in CSS px (the plane has the same size in world units)
 * @param viewport canvas size in CSS px
 */
export function elementToCanvas(mvp: Mat4, element: Size, viewport: Size): DOMMatrix {
  // Element px (u right, v down) → plane local (x right, y up), z = 0.
  const elementToPlane = mul(translation(-element.width / 2, element.height / 2, 0), scaling(1, -1, 1));
  // Clip space → canvas CSS px (y down).
  // prettier-ignore
  const clipToViewport = new Float32Array([
    viewport.width / 2, 0, 0, 0,
    0, -viewport.height / 2, 0, 0,
    0, 0, 1, 0,
    viewport.width / 2, viewport.height / 2, 0, 1,
  ]);
  const m = mul(clipToViewport, mvp, elementToPlane);
  return new DOMMatrix(Array.from(m));
}

/** True when every corner of the element is in front of the camera (w > 0). */
export function inFront(m: DOMMatrix, element: Size): boolean {
  return [
    [0, 0],
    [element.width, 0],
    [0, element.height],
    [element.width, element.height],
  ].every(([u, v]) => m.transformPoint(new DOMPoint(u, v, 0, 1)).w > 0);
}
