/**
 * Projective geometry for `updateElementGeometry()` in 3D.
 *
 * 2D contexts update element geometry automatically when you call
 * `drawElementImage`. WebGL/WebGPU cannot: the browser has no idea where a
 * texture ends up on screen. So we tell it, with a 4x4 matrix that maps the
 * element's border box (CSS px, y down) to canvas CSS px:
 *
 *   M = Viewport · Projection · View · Model · ElementToPlane
 *
 * It's the same matrix CSS `matrix3d()` would need, which is why hit-testing
 * keeps working on a tilted, perspective-projected print.
 *
 * Kept free of DOM types so it is unit-testable in Node.
 */
import { Matrix4, type Camera } from 'three';

export interface Size {
  width: number;
  height: number;
}

export interface ProjectionInput {
  /** The plane mesh' world matrix (plane centered at origin, in XY). */
  objectMatrixWorld: Matrix4;
  camera: Camera;
  /** Plane size in world units. */
  plane: Size;
  /** Element border-box size in CSS px. */
  element: Size;
  /** Canvas size in CSS px. */
  viewport: Size;
}

/** Column-major 16 numbers, directly usable by `new DOMMatrix(array)`. */
export type Matrix16 = number[];

const tmpA = new Matrix4();
const tmpB = new Matrix4();
const elementToPlane = new Matrix4();
const result = new Matrix4();

export function elementToCanvasMatrix(input: ProjectionInput): Matrix16 {
  const { objectMatrixWorld, camera, plane, element, viewport } = input;

  // Element px (u right, v down) -> plane local units (x right, y up), z = 0.
  elementToPlane
    .makeTranslation(-plane.width / 2, plane.height / 2, 0)
    .multiply(tmpA.makeScale(plane.width / element.width, -plane.height / element.height, 1));

  // Clip space -> canvas CSS px. Being affine in (x, y, w) it can be applied
  // before the perspective divide, so the whole chain stays one matrix.
  // prettier-ignore
  const clipToViewport = tmpB.set(
    viewport.width / 2, 0, 0, viewport.width / 2,
    0, -viewport.height / 2, 0, viewport.height / 2,
    0, 0, 1, 0,
    0, 0, 0, 1,
  );

  camera.updateMatrixWorld();
  result
    .copy(clipToViewport)
    .multiply(camera.projectionMatrix)
    .multiply(camera.matrixWorldInverse)
    .multiply(objectMatrixWorld)
    .multiply(elementToPlane);

  return result.toArray();
}

/**
 * Apply a column-major matrix to an element-space point (z = 0); returns
 * CSS px. Allocation-free maths: it runs for every print, every frame.
 */
export function projectElementPoint(m: Matrix16, u: number, v: number): { x: number; y: number; w: number } {
  const w = m[3]! * u + m[7]! * v + m[15]!;
  return { x: (m[0]! * u + m[4]! * v + m[12]!) / w, y: (m[1]! * u + m[5]! * v + m[13]!) / w, w };
}

/**
 * True when all four corners are in front of the camera. Behind-camera
 * points flip sign under the divide and would produce nonsense hit regions.
 */
export function isInFrontOfCamera(m: Matrix16, element: Size): boolean {
  const corners: Array<[number, number]> = [
    [0, 0],
    [element.width, 0],
    [0, element.height],
    [element.width, element.height],
  ];
  return corners.every(([u, v]) => projectElementPoint(m, u, v).w > 0);
}

/**
 * The inverse of `projectElementPoint`: which element-space point (CSS px,
 * y down) lands at canvas point (x, y)? This is the question the browser
 * answers when it hit-tests through a `canvasTransform`. Returns null when
 * the point is on the horizon of the plane (no finite pre-image).
 */
export function canvasToElementPoint(m: Matrix16, x: number, y: number): { u: number; v: number } | null {
  // The plane z = 0 makes the 4x4 a 3x3 homography: rows (x·w, y·w, w).
  const a = m[0]!, b = m[4]!, c = m[12]!;
  const d = m[1]!, e = m[5]!, f = m[13]!;
  const g = m[3]!, hh = m[7]!, i = m[15]!;
  // Solve (a - g x) u + (b - h x) v = i x - c, (d - g y) u + (e - h y) v = i y - f.
  const a1 = a - g * x, b1 = b - hh * x, c1 = i * x - c;
  const a2 = d - g * y, b2 = e - hh * y, c2 = i * y - f;
  const det = a1 * b2 - b1 * a2;
  if (Math.abs(det) < 1e-12) return null;
  return { u: (c1 * b2 - b1 * c2) / det, v: (a1 * c2 - c1 * a2) / det };
}
