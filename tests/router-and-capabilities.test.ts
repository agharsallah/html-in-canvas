import { describe, expect, it } from 'vitest';
import { formatRoute, parseRoute } from '../src/app/router';
import { detectCapabilities, type CapabilityEnv } from '../src/core/capabilities';

describe('router', () => {
  it('parses hub, roll and roll+frame routes', () => {
    expect(parseRoute('')).toEqual({ name: 'hub' });
    expect(parseRoute('#/')).toEqual({ name: 'hub' });
    expect(parseRoute('#/roll/fog')).toEqual({ name: 'roll', roll: 'fog' });
    expect(parseRoute('#/roll/fog/lab')).toEqual({ name: 'roll', roll: 'fog', frame: 'lab' });
  });

  it('falls back to the hub for unknown rolls and ignores unknown frames', () => {
    expect(parseRoute('#/roll/atlantis')).toEqual({ name: 'hub' });
    expect(parseRoute('#/roll/fog/boss')).toEqual({ name: 'roll', roll: 'fog' });
  });

  it('round-trips', () => {
    for (const hash of ['#/', '#/roll/bells', '#/roll/bells/trial', '#/roll/fog/practice']) {
      expect(formatRoute(parseRoute(hash))).toBe(hash);
    }
  });
});

const proto = (...keys: string[]) => ({ prototype: Object.fromEntries(keys.map((k) => [k, () => {}])) });

describe('detectCapabilities', () => {
  const full: CapabilityEnv = {
    HTMLCanvasElement: proto('requestPaint', 'captureElementImage'),
    CanvasRenderingContext2D: proto('drawElementImage'),
    WebGL2RenderingContext: proto('texElementSubImage2D'),
    GPUQueue: proto('drawElementImageToTexture'),
  };

  it('is native when 2D and WebGL support exist', () => {
    const caps = detectCapabilities(full, '');
    expect(caps.mode).toBe('native');
    expect(caps).toMatchObject({ canvas2d: true, webgl: true, webgpu: true, elementImage: true, webglLegacyOnly: false });
  });

  it('is simulated in a browser without the API', () => {
    const caps = detectCapabilities({ HTMLCanvasElement: proto(), CanvasRenderingContext2D: proto() }, '');
    expect(caps.mode).toBe('simulated');
    expect(caps.forcedSimulation).toBe(false);
  });

  it('can be forced into simulation with ?sim', () => {
    const caps = detectCapabilities(full, '?sim');
    expect(caps.mode).toBe('simulated');
    expect(caps.forcedSimulation).toBe(true);
    expect(caps.canvas2d).toBe(false);
  });

  it('flags builds that only have the legacy WebGL upload', () => {
    const caps = detectCapabilities({ ...full, WebGL2RenderingContext: proto('texElementImage2D') }, '');
    expect(caps.mode).toBe('native');
    expect(caps.webglLegacyOnly).toBe(true);
  });
});
