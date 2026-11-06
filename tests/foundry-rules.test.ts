/**
 * Foundry rules, pinned to the Chrome WebGPU guide (webgpu.md), the README
 * IDL and section 5 (geometry is whatever canvasTransform you send).
 */
import { describe, expect, it } from 'vitest';
import {
  boxAt, breaksHitTesting, checkGpuConfig, EFFECT_CARDS, isColourOnly, maxDrift, ORDERS, REQUIRED_FLAGS, seenAt,
  type Effects, type GpuConfig,
} from '../src/chapters/roll-07-foundry/rules';

const calm: Effects = { heat: 1, grain: 1, ripple: 0, melt: 0 };

describe('drift', () => {
  it('colour-only effects never move pixels', () => {
    expect(maxDrift(calm)).toBe(0);
    expect(isColourOnly(calm)).toBe(true);
    for (let u = 0; u <= 320; u += 40) expect(seenAt(u, 100, calm, 3)).toEqual({ u, v: 100 });
  });

  it('melt and ripple move pixels away from the geometry', () => {
    expect(isColourOnly({ ...calm, melt: 30 })).toBe(false);
    expect(isColourOnly({ ...calm, ripple: 10 })).toBe(false);
    const seen = seenAt(100, 150, { ...calm, melt: 40 }, 0);
    expect(seen.u).toBe(100);
    expect(seen.v).toBeLessThan(150); // content from higher up hangs here
    expect(150 - seen.v).toBeLessThanOrEqual(40);
  });

  it('maxDrift bounds the actual displacement', () => {
    const e: Effects = { heat: 0, grain: 0, ripple: 8, melt: 20 };
    for (let u = 0; u <= 320; u += 16) {
      for (let v = 0; v <= 200; v += 20) {
        const s = seenAt(u, v, e, 1.3);
        expect(Math.hypot(s.u - u, s.v - v)).toBeLessThanOrEqual(maxDrift(e) + 1e-9);
      }
    }
  });

  it('boxAt finds the control under a point', () => {
    const boxes = [{ id: 'pour', x: 10, y: 10, width: 50, height: 20 }];
    expect(boxAt(boxes, 20, 20)).toBe('pour');
    expect(boxAt(boxes, 80, 20)).toBeNull();
  });
});

describe('safe or melt', () => {
  it('colour changes are safe; unsynced movement breaks hit testing', () => {
    const verdict = Object.fromEntries(EFFECT_CARDS.map((c) => [c.id, breaksHitTesting(c)]));
    expect(verdict).toEqual({
      tint: false, sag: true, grain: false, ripple: true, vignette: false,
      mirror: true, 'scale-loose': true, 'scale-synced': false, glow: false,
    });
  });
});

describe('checkGpuConfig', () => {
  const recipe: GpuConfig = { usage: [...REQUIRED_FLAGS], format: 'rgba8unorm', size: 'default-ceil', crop: 'none', call: 'drawElementImageToTexture', when: 'paint' };
  const [readout, header] = ORDERS;

  it('accepts the guide’s recipe for the whole element and for a cropped header', () => {
    expect(checkGpuConfig(readout!, recipe)).toEqual([]);
    expect(checkGpuConfig(header!, { ...recipe, crop: 'header-four' })).toEqual([]);
  });

  it('requires each documented usage flag and no extras', () => {
    for (const flag of REQUIRED_FLAGS) {
      expect(checkGpuConfig(readout!, { ...recipe, usage: REQUIRED_FLAGS.filter((f) => f !== flag) }).join(' ')).toContain(flag);
    }
    expect(checkGpuConfig(readout!, { ...recipe, usage: [...REQUIRED_FLAGS, 'STORAGE_BINDING'] })).toHaveLength(1);
  });

  it('rejects partial source rectangles: all four or none', () => {
    expect(checkGpuConfig(header!, { ...recipe, crop: 'header-two' }).join(' ')).toMatch(/all four or none/);
  });

  it('rejects CSS px sizes, legacy and WebGL calls, and uploads outside paint', () => {
    expect(checkGpuConfig(readout!, { ...recipe, size: 'offset-css' })).toHaveLength(1);
    expect(checkGpuConfig(readout!, { ...recipe, size: 'default-raw' })).toHaveLength(1);
    expect(checkGpuConfig(readout!, { ...recipe, call: 'copyElementImageToTexture' }).join(' ')).toMatch(/legacy/);
    expect(checkGpuConfig(readout!, { ...recipe, call: 'texElementSubImage2D' }).join(' ')).toMatch(/WebGL/);
    expect(checkGpuConfig(readout!, { ...recipe, when: 'load' }).join(' ')).toMatch(/paint/);
    expect(checkGpuConfig(readout!, { ...recipe, format: 'depth24plus' })).toHaveLength(1);
  });
});
