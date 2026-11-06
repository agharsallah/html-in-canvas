/**
 * The projector rules, pinned to the Chrome docs:
 *  - 2d.md overload table (default size, custom destination box, cropped at
 *    default size, source slice to destination);
 *  - concepts.md units table: source rects are CSS px, dx/dy/dw/dh are
 *    canvas grid px.
 */
import { describe, expect, it } from 'vitest';
import {
  argList, call, formatCall, judge, overloadFor, project, ROUNDS, SCALE, TICKET, type DrawCall,
} from '../src/chapters/roll-04-projector/rules';

const el = { w: 90, h: 30 };

describe('overloads (2d.md table)', () => {
  const base: DrawCall = { args: 3, sx: 0, sy: 0, sw: 90, sh: 30, dx: 100, dy: 150, dw: 180, dh: 60, rotate: 0 };

  it('picks the overload from crop and resize', () => {
    expect(overloadFor(false, false)).toBe(3);
    expect(overloadFor(false, true)).toBe(5);
    expect(overloadFor(true, false)).toBe(7);
    expect(overloadFor(true, true)).toBe(9);
  });

  it('formats each form exactly like the docs', () => {
    expect(formatCall({ ...base, args: 3 }, 'targetElement')).toBe('ctx.drawElementImage(targetElement, 100, 150);');
    expect(formatCall({ ...base, args: 5 }, 'targetElement')).toBe('ctx.drawElementImage(targetElement, 100, 150, 180, 60);');
    expect(formatCall({ ...base, args: 7 }, 'targetElement')).toBe('ctx.drawElementImage(targetElement, 0, 0, 90, 30, 100, 150);');
    expect(formatCall({ ...base, args: 9 }, 'targetElement')).toBe('ctx.drawElementImage(targetElement, 0, 0, 90, 30, 100, 150, 180, 60);');
    expect(argList({ ...base, args: 9 })).toHaveLength(8);
  });

  it('puts the rotation before the draw, like complex-text.html', () => {
    expect(formatCall({ ...base, rotate: 15 })).toBe('ctx.rotate(15 * Math.PI / 180);\nctx.drawElementImage(ticket, 100, 150);');
  });

  it('default size: the whole element, CSS size converted to grid px', () => {
    expect(project({ ...base, args: 3 }, el, 2)).toMatchObject({ source: { x: 0, y: 0, w: 90, h: 30 }, dest: { x: 100, y: 150, w: 180, h: 60 } });
  });

  it('custom destination box: the whole element scaled into dw × dh', () => {
    expect(project({ ...base, args: 5, dw: 50, dh: 400 }, el, 2).dest).toEqual({ x: 100, y: 150, w: 50, h: 400 });
  });

  it('cropped: the area at its default size (same scale as the 3-argument form)', () => {
    const p = project({ ...base, args: 7, sx: 10, sy: 5, sw: 40, sh: 20 }, el, 1.5);
    expect(p.source).toEqual({ x: 10, y: 5, w: 40, h: 20 });
    expect(p.dest).toEqual({ x: 100, y: 150, w: 60, h: 30 });
  });

  it('source slice to destination: the crop mapped onto the destination rect', () => {
    const p = project({ ...base, args: 9, sx: 10, sy: 5, sw: 40, sh: 20, dw: 7, dh: 9 }, el, 1.5);
    expect(p.dest).toEqual({ x: 100, y: 150, w: 7, h: 9 });
  });
});

describe('judging a framing', () => {
  const target = call(7, { sx: 140, sy: 0, sw: 60, sh: 100, dx: 240, dy: 50 });

  it('accepts any overload that produces the same framing', () => {
    expect(judge(call(9, { sx: 140, sy: 0, sw: 60, sh: 100, dx: 240, dy: 50, dw: 120, dh: 200 }), target, TICKET, SCALE).matches).toBe(true);
    expect(judge(call(3, { dx: 100, dy: 50 }), call(5, { dx: 100, dy: 50, dw: 400, dh: 200 }), TICKET, SCALE).matches).toBe(true);
  });

  it('allows a small tolerance and no more', () => {
    expect(judge(call(7, { sx: 140, sy: 0, sw: 60, sh: 100, dx: 242, dy: 49 }), target, TICKET, SCALE).matches).toBe(true);
    expect(judge(call(7, { sx: 140, sy: 0, sw: 60, sh: 100, dx: 245, dy: 50 }), target, TICKET, SCALE).matches).toBe(false);
  });

  it('spots a source rect given in grid px', () => {
    const v = judge(call(7, { sx: 280, sy: 0, sw: 120, sh: 200, dx: 240, dy: 50 }), target, TICKET, SCALE);
    expect(v.sourceOk).toBe(false);
    expect(v.hint).toMatch(/CSS px/);
  });

  it('spots a destination given in CSS px', () => {
    const v = judge(call(3, { dx: 50, dy: 25 }), call(3, { dx: 100, dy: 50 }), TICKET, SCALE);
    expect(v.hint).toMatch(/grid px: multiply/);
  });

  it('asks for a crop when the target is partial', () => {
    expect(judge(call(3, { dx: 240, dy: 50 }), target, TICKET, SCALE).hint).toMatch(/source rect/);
  });

  it('asks for an outset when the target includes ink overflow', () => {
    const glow = call(7, { sx: -10, sy: -10, sw: 220, sh: 120, dx: 80, dy: 30 });
    expect(judge(call(3, { dx: 80, dy: 30 }), glow, TICKET, SCALE).hint).toMatch(/beyond the border box/);
  });

  it('checks the rotation', () => {
    const v = judge(call(3, { dx: 180, dy: -50, rotate: -15 }), call(3, { dx: 180, dy: -50, rotate: 15 }), TICKET, SCALE);
    expect(v.rotateOk).toBe(false);
    expect(v.matches).toBe(false);
  });
});

describe('trial rounds', () => {
  it.each(ROUNDS.map((r) => [r.id, r] as const))('%s: target passes, the crooked call fails', (_, round) => {
    expect(judge(round.target, round.target, TICKET, SCALE).matches).toBe(true);
    expect(judge(round.crooked, round.target, TICKET, SCALE).matches).toBe(false);
  });

  it('cover all four overloads', () => {
    expect(new Set(ROUNDS.map((r) => r.target.args))).toEqual(new Set([3, 5, 7, 9]));
  });
});
