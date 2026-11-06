/**
 * Roll 03 rules, pinned to Chrome docs concepts.md "Sizing and units".
 */
import { describe, expect, it } from 'vitest';
import {
  analyzeSizing, borderBoxWidth, centerElement, DEFAULT_GRID, defaultDrawSize, devicePixels, observedGrid, presetGrid, scaleFactors,
} from '../src/chapters/roll-03-lens/rules';
import { centerAnswer, checkCenter, checkGrid, gridAnswer, ROUNDS, type CenterRound, type GridRound } from '../src/chapters/roll-03-lens/rounds';
import { classify, LEDGER, type Unit } from '../src/chapters/roll-03-lens/units';
import { storyRatio } from '../src/chapters/roll-03-lens/diorama';
import { story } from '../src/chapters/roll-03-lens/story';

const round = <T extends GridRound | CenterRound>(id: string) => ROUNDS.find((r) => r.id === id) as T;

describe('the three grids (CC:274)', () => {
  const css = { width: 360, height: 180 };
  const device = devicePixels(css, 1.5);

  it('a 360 × 180 CSS px canvas at DPR 1.5 covers 540 × 270 device px', () => {
    expect(device).toEqual({ width: 540, height: 270 });
  });

  it('with the default 300 × 150 grid, one canvas px is 1.2 CSS px and 1.8 device px, blended twice', () => {
    const report = analyzeSizing(css, DEFAULT_GRID, device);
    expect(report.cssPerGrid).toBeCloseTo(1.2);
    expect(report.devicePerGrid).toBeCloseTo(1.8);
    expect(report.blends).toBe(2);
    expect(report.verdict).not.toBe('crisp');
  });

  it('a 540 × 270 grid is crisp: one blend, no resampling', () => {
    const report = analyzeSizing(css, { width: 540, height: 270 }, device);
    expect(report).toMatchObject({ blends: 1, resampled: false, sharpness: 100, verdict: 'crisp' });
  });

  it('the CC:284 card: 400 × 200 CSS px at DPR 1.5 needs a 600 × 300 grid', () => {
    const cardCss = { width: 400, height: 200 };
    expect(devicePixels(cardCss, 1.5)).toEqual({ width: 600, height: 300 });
    expect(analyzeSizing(cardCss, cardCss, devicePixels(cardCss, 1.5)).verdict).not.toBe('crisp');
  });

  it('is only 100 for an exact match; off by one pixel is already soft', () => {
    expect(analyzeSizing(css, { width: 539, height: 270 }, device).sharpness).toBeLessThan(100);
    expect(analyzeSizing(css, { width: 1080, height: 540 }, device).sharpness).toBeLessThan(100);
  });

  it('flags a grid whose axes scale differently', () => {
    expect(analyzeSizing(css, { width: 540, height: 150 }, device).stretched).toBe(true);
  });
});

describe('sizing helpers', () => {
  it('the observer prefers devicePixelContentBoxSize, else rounds contentRect × DPR (CC:292-304)', () => {
    expect(observedGrid({ width: 333, height: 100 }, 1.5, { width: 500, height: 150 })).toEqual({ width: 500, height: 150 });
    expect(observedGrid({ width: 333, height: 100 }, 1.5)).toEqual({ width: 500, height: 150 });
  });

  it('presets', () => {
    const css = { width: 360, height: 180 };
    const device = { width: 720, height: 360 };
    expect(presetGrid('default', css, device)).toEqual({ width: 300, height: 150 });
    expect(presetGrid('css', css, device)).toEqual(css);
    expect(presetGrid('device', css, device)).toEqual(device);
    expect(presetGrid('custom', css, device, 1.5)).toEqual({ width: 540, height: 270 });
  });

  it('scale factors are grid / CSS size (CC:347-348) and centre the card (CC:364-376)', () => {
    const scale = scaleFactors({ width: 600, height: 300 }, { width: 400, height: 200 });
    expect(scale).toEqual({ scaleX: 1.5, scaleY: 1.5 });
    expect(centerElement({ width: 600, height: 300 }, scale, { width: 200, height: 100 })).toEqual({ width: 300, height: 150, x: 150, y: 75 });
    expect(defaultDrawSize({ width: 200, height: 100 }, scale)).toEqual({ width: 300, height: 150 });
  });

  it('box-sizing: border-box makes the drawn box equal width (CC:379-388)', () => {
    expect(borderBoxWidth({ width: 200, padding: 16, border: 0, boxSizing: 'border-box' })).toBe(200);
    expect(borderBoxWidth({ width: 200, padding: 16, border: 0, boxSizing: 'content-box' })).toBe(232);
  });
});

describe('the Unit Ledger (CC:313-324)', () => {
  const unitOf = (id: string) => LEDGER.find((item) => item.id === id)!.unit;

  it('files every value under the docs’ unit', () => {
    const expected: Record<string, Unit> = {
      'canvas-width': 'grid', dx: 'grid', dwidth: 'grid', translate: 'grid', 'default-size': 'grid',
      sx: 'css', 'gpu-source': 'css', 'canvas-transform': 'css', 'offset-width': 'css', 'content-box': 'css',
      'device-box': 'device', 'tex-width': 'texture',
    };
    expect(Object.fromEntries(LEDGER.map((item) => [item.id, item.unit]))).toEqual(expected);
    expect(unitOf('sx')).not.toBe(unitOf('dx')); // one call, two units
  });

  it('has unique ids and every unit appears', () => {
    expect(new Set(LEDGER.map((i) => i.id)).size).toBe(LEDGER.length);
    expect(new Set(LEDGER.map((i) => i.unit))).toEqual(new Set(['css', 'grid', 'device', 'texture']));
  });

  it('classify explains both right and wrong answers', () => {
    const item = LEDGER.find((i) => i.id === 'sx')!;
    expect(classify(item, 'css').correct).toBe(true);
    const wrong = classify(item, 'grid');
    expect(wrong.correct).toBe(false);
    expect(wrong.why).toContain('Not Canvas grid px');
  });
});

describe('the grinding wheel', () => {
  it('grid rounds expect the device-pixel size', () => {
    expect(gridAnswer(round<GridRound>('worked-example'))).toEqual({ width: 540, height: 270 });
    expect(gridAnswer(round<GridRound>('hello-card'))).toEqual({ width: 600, height: 300 });
    expect(gridAnswer(round<GridRound>('zoomed'))).toEqual({ width: 400, height: 200 });
  });

  it('cannot be passed with the starting grid or the CSS size', () => {
    for (const r of ROUNDS.filter((x): x is GridRound => x.kind === 'grid')) {
      expect(checkGrid(r, r.start).ok).toBe(false);
      expect(checkGrid(r, r.css).ok).toBe(false);
      expect(checkGrid(r, gridAnswer(r)).ok).toBe(true);
    }
    expect(checkGrid(round<GridRound>('hello-card'), { width: 800, height: 400 }).ok).toBe(false); // the CC:282 alt text
  });

  it('centre rounds use offsetWidth × scaleX, border box included', () => {
    expect(centerAnswer(round<CenterRound>('center-border-box'))).toMatchObject({ offset: { width: 200, height: 80 }, x: 120, y: 80 });
    expect(centerAnswer(round<CenterRound>('center-content-box'))).toMatchObject({ offset: { width: 236, height: 96 }, x: 123, y: 78 });
  });

  it('rejects the classic mistakes with a specific hint', () => {
    const r = round<CenterRound>('center-content-box');
    expect(checkCenter(r, 123, 78).ok).toBe(true);
    expect(checkCenter(r, 182, 102).message).toContain('scaleX'); // raw offsetWidth: (600 - 236) / 2
    expect(checkCenter(r, 150, 78).message).toContain('content-box'); // width only: (600 - 300) / 2
    expect(checkCenter(r, 0, 0).ok).toBe(false);
  });
});

describe('the diorama follows the story', () => {
  it('starts at the docs’ blurry ratio and ends crisp', () => {
    expect(storyRatio(0)).toBeCloseTo(300 / 540);
    expect(storyRatio(story.length - 1)).toBe(1);
    expect(storyRatio(story.findIndex((l) => l.concept?.id === 'match-device'))).toBe(1);
  });
});
