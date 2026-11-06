/**
 * Content integrity: the story data must stay consistent as chapters are added.
 */
import { describe, expect, it } from 'vitest';
import { ROLLS } from '../src/story/rolls';
import { NEGATIVES } from '../src/story/negatives';
import { STAMPS } from '../src/game/stamps';
import { SCENARIOS } from '../src/chapters/roll-02-bells/trial';
import { CLAIMS } from '../src/chapters/prologue/trial';

const unique = (values: string[]) => new Set(values).size === values.length;

describe('rolls', () => {
  it('have unique ids and sequential frame labels', () => {
    expect(unique(ROLLS.map((r) => r.id))).toBe(true);
    ROLLS.forEach((roll, i) => expect(roll.frame).toBe(String(i).padStart(2, '0')));
  });

  it('use valid hex colours for every print process', () => {
    for (const roll of ROLLS) {
      for (const value of [roll.process.paper, roll.process.ink, roll.process.accent, roll.process.glow, roll.process.second]) {
        expect(value).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('have no gaps: a sealed roll is never followed by a playable one', () => {
    const firstSealed = ROLLS.findIndex((r) => !r.load);
    if (firstSealed === -1) return;
    expect(ROLLS.slice(firstSealed).every((r) => !r.load)).toBe(true);
  });
});

describe('negatives', () => {
  it('have unique ids and belong to a real roll', () => {
    expect(unique(NEGATIVES.map((n) => n.id))).toBe(true);
    const ids = new Set(ROLLS.map((r) => r.id));
    NEGATIVES.forEach((n) => expect(ids.has(n.roll)).toBe(true));
  });

  it('are awarded by a frame unless they are secrets', () => {
    for (const n of NEGATIVES) {
      if (n.rarity === 'secret') expect(n.frame).toBeUndefined();
      else expect(n.frame).toBeDefined();
    }
  });

  it('give every playable roll at least one negative', () => {
    for (const roll of ROLLS.filter((r) => r.load)) {
      expect(NEGATIVES.some((n) => n.roll === roll.id && n.frame)).toBe(true);
    }
  });
});

describe('stamps', () => {
  it('have unique ids and positive silver', () => {
    expect(unique(STAMPS.map((s) => s.id))).toBe(true);
    STAMPS.forEach((s) => expect(s.silver).toBeGreaterThan(0));
  });
});

describe('trials', () => {
  it('bell scenarios each have exactly one right answer and explain every option', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.options.filter((o) => o.correct)).toHaveLength(1);
      scenario.options.forEach((o) => expect(o.why.length).toBeGreaterThan(10));
    }
  });

  it('prologue claims contain exactly the five README use cases', () => {
    expect(CLAIMS.filter((c) => c.fixes)).toHaveLength(5);
    expect(CLAIMS.some((c) => !c.fixes)).toBe(true);
  });
});
