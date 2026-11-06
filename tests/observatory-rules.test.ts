/**
 * Observatory rules, pinned to the Chrome WebGL guide (webgl.md), the README
 * (3D contexts must call updateElementGeometry) and Examples/webGL.html.
 */
import { describe, expect, it } from 'vitest';
import { canvasToElementPoint, projectElementPoint, type Matrix16 } from '../src/hic/projective-geometry';
import {
  checkPipeline, flatMatrix, hitThrough, needsAllocation, shouldUpload, textureBytes,
  PAINT_ORDER, SETUP_ORDER, type ControlBox,
} from '../src/chapters/roll-06-observatory/rules';

const element = { width: 320, height: 200 };
const controls: ControlBox[] = [{ id: 'send', label: 'Send', x: 200, y: 140, width: 100, height: 40 }];
// Column-major affine: scale 2, translate (50, 30).
const affine: Matrix16 = [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 50, 30, 0, 1];
// A perspective homography (non-zero w row).
const tilted: Matrix16 = [1.2, 0.1, 0, 0.0008, 0.05, 1, 0, 0.0004, 0, 0, 1, 0, 40, 20, 0, 1];

describe('canvasToElementPoint', () => {
  it('inverts projectElementPoint for affine and projective matrices', () => {
    for (const m of [affine, tilted]) {
      for (const [u, v] of [[0, 0], [160, 100], [319, 7], [20, 190]] as const) {
        const p = projectElementPoint(m, u, v);
        const back = canvasToElementPoint(m, p.x, p.y)!;
        expect(back.u).toBeCloseTo(u, 6);
        expect(back.v).toBeCloseTo(v, 6);
      }
    }
  });
});

describe('hitThrough', () => {
  it('maps a canvas click back to the control under it', () => {
    const p = projectElementPoint(tilted, 250, 160);
    expect(hitThrough(tilted, element, controls, p.x, p.y).target).toBe('send');
    const q = projectElementPoint(tilted, 40, 40);
    expect(hitThrough(tilted, element, controls, q.x, q.y).target).toBe('card');
    expect(hitThrough(tilted, element, controls, -500, -500).target).toBe('space');
  });

  it('hits nothing without geometry: drawable children start with none', () => {
    expect(hitThrough(null, element, controls, 100, 100).target).toBe('space');
  });

  it('the flat matrix is exact for an unrotated card and wrong for a tilted one', () => {
    expect(flatMatrix(affine, element)).toEqual(affine);
    const p = projectElementPoint(tilted, 250, 160);
    const flat = flatMatrix(tilted, element);
    const viaFlat = canvasToElementPoint(flat, p.x, p.y)!;
    expect(Math.abs(viaFlat.u - 250) + Math.abs(viaFlat.v - 160)).toBeGreaterThan(5);
  });
});

describe('upload gating and allocation (webGL.html, webgl.md)', () => {
  it('uploads the first time and on change, never otherwise when gated', () => {
    const base = { onlyChanged: true, changed: false, neverUploaded: false, sizeChanged: false };
    expect(shouldUpload(base)).toBe(false);
    expect(shouldUpload({ ...base, changed: true })).toBe(true);
    expect(shouldUpload({ ...base, neverUploaded: true })).toBe(true);
    expect(shouldUpload({ ...base, onlyChanged: false })).toBe(true);
  });

  it('allocates once, or when the element changes size', () => {
    expect(needsAllocation({ preallocate: true, allocated: true, sizeChanged: false })).toBe(false);
    expect(needsAllocation({ preallocate: true, allocated: true, sizeChanged: true })).toBe(true);
    expect(needsAllocation({ preallocate: false, allocated: true, sizeChanged: false })).toBe(true);
  });

  it('counts RGBA8 bytes from rounded-up texture sizes', () => {
    expect(textureBytes(640, 400)).toBe(1_024_000);
    expect(textureBytes(10.2, 1)).toBe(44);
  });
});

describe('checkPipeline', () => {
  const good = { setup: [...SETUP_ORDER], paint: [...PAINT_ORDER] };

  it('accepts the documented pipeline', () => {
    expect(checkPipeline(good)).toEqual({ ok: true, problems: [] });
  });

  it('rejects every decoy', () => {
    for (const decoy of ['decoy-2d', 'decoy-gpu', 'decoy-teximage'] as const) {
      expect(checkPipeline({ ...good, paint: [...good.paint, decoy] }).ok).toBe(false);
    }
  });

  it('rejects allocating every paint, as the guide warns', () => {
    const v = checkPipeline({ setup: ['create', 'bind', 'filter'], paint: ['gate', 'allocate', 'upload', 'draw', 'geometry'] });
    expect(v.ok).toBe(false);
    expect(v.problems.join(' ')).toMatch(/re-allocates/);
  });

  it('rejects a missing geometry update: 3D must call updateElementGeometry', () => {
    expect(checkPipeline({ ...good, paint: ['gate', 'upload', 'draw'] }).problems.join(' ')).toMatch(/updateElementGeometry/);
  });

  it('rejects wrong order', () => {
    expect(checkPipeline({ ...good, paint: ['upload', 'gate', 'draw', 'geometry'] }).ok).toBe(false);
    expect(checkPipeline({ ...good, paint: ['gate', 'upload', 'geometry', 'draw'] }).ok).toBe(false);
    expect(checkPipeline({ setup: ['create', 'allocate', 'bind', 'filter'], paint: [...PAINT_ORDER] }).ok).toBe(false);
  });

  it('rejects uploading once at setup', () => {
    expect(checkPipeline({ setup: [...SETUP_ORDER, 'upload'], paint: ['gate', 'draw', 'geometry'] }).ok).toBe(false);
  });
});
