import { describe, expect, it } from 'vitest';
import { Mesh, PerspectiveCamera, PlaneGeometry, Vector3 } from 'three';
import {
  elementToCanvasMatrix,
  isInFrontOfCamera,
  projectElementPoint,
} from '../src/hic/projective-geometry';

const viewport = { width: 1200, height: 800 };
const element = { width: 340, height: 460 };
const plane = { width: 1.7, height: 2.3 };

function setup(rotationY = 0.4, rotationZ = 0.1) {
  const camera = new PerspectiveCamera(38, viewport.width / viewport.height, 0.1, 100);
  camera.position.set(0.5, 0.3, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  const mesh = new Mesh(new PlaneGeometry(plane.width, plane.height));
  mesh.position.set(0.8, -0.4, 0.2);
  mesh.rotation.set(0, rotationY, rotationZ);
  mesh.updateMatrixWorld(true);
  return { camera, mesh };
}

/** Ground truth: project a plane-local point with three.js, then to CSS px. */
function expected(camera: PerspectiveCamera, mesh: Mesh, u: number, v: number) {
  const local = new Vector3(
    (u / element.width - 0.5) * plane.width,
    (0.5 - v / element.height) * plane.height,
    0,
  );
  const ndc = local.applyMatrix4(mesh.matrixWorld).project(camera);
  return { x: ((ndc.x + 1) / 2) * viewport.width, y: ((1 - ndc.y) / 2) * viewport.height };
}

describe('elementToCanvasMatrix', () => {
  it('maps every element corner and the centre to where three.js draws it', () => {
    const { camera, mesh } = setup();
    const m = elementToCanvasMatrix({ objectMatrixWorld: mesh.matrixWorld, camera, plane, element, viewport });
    const points: Array<[number, number]> = [
      [0, 0], [element.width, 0], [0, element.height], [element.width, element.height],
      [element.width / 2, element.height / 2], [37, 211],
    ];
    for (const [u, v] of points) {
      const got = projectElementPoint(m, u, v);
      const want = expected(camera, mesh, u, v);
      expect(got.x).toBeCloseTo(want.x, 3);
      expect(got.y).toBeCloseTo(want.y, 3);
    }
  });

  it('keeps the element top-left at the plane top-left (y grows downward)', () => {
    const { camera, mesh } = setup(0, 0);
    const m = elementToCanvasMatrix({ objectMatrixWorld: mesh.matrixWorld, camera, plane, element, viewport });
    const top = projectElementPoint(m, 0, 0);
    const bottom = projectElementPoint(m, 0, element.height);
    expect(top.y).toBeLessThan(bottom.y);
  });

  it('returns 16 column-major numbers, as DOMMatrix expects', () => {
    const { camera, mesh } = setup();
    const m = elementToCanvasMatrix({ objectMatrixWorld: mesh.matrixWorld, camera, plane, element, viewport });
    expect(m).toHaveLength(16);
    expect(m.every(Number.isFinite)).toBe(true);
  });
});

describe('isInFrontOfCamera', () => {
  it('is true for a print in view', () => {
    const { camera, mesh } = setup();
    const m = elementToCanvasMatrix({ objectMatrixWorld: mesh.matrixWorld, camera, plane, element, viewport });
    expect(isInFrontOfCamera(m, element)).toBe(true);
  });

  it('is false once the print is behind the camera', () => {
    const { camera, mesh } = setup();
    mesh.position.set(0, 0, 9);
    mesh.updateMatrixWorld(true);
    const m = elementToCanvasMatrix({ objectMatrixWorld: mesh.matrixWorld, camera, plane, element, viewport });
    expect(isInFrontOfCamera(m, element)).toBe(false);
  });
});
