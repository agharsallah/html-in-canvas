/**
 * The endless reel's rules: the boss rush reducer, the question bank's
 * coverage of every roll, the escape hatch, feature detection, and the
 * coverage radar's numbers. Fallback options are pinned to the Chrome docs.
 */
import { describe, expect, it } from 'vitest';
import { BANK_EARLY } from '../src/chapters/roll-12-epilogue/bank-early';
import { BANK_LATE } from '../src/chapters/roll-12-epilogue/bank-late';
import { coverageFor } from '../src/chapters/roll-12-epilogue/coverage';
import {
  answerRush, detectSupport, HATCH_LABELS, HATCH_OPTIONS, HATCH_SCENARIOS, hatchQuestions, isCorrect, judgeHatch,
  LIVES, pathFor, pickRush, startRush, supportsHtmlInCanvas, type DetectEnv,
} from '../src/chapters/roll-12-epilogue/rules';
import { ROLLS } from '../src/story/rolls';
import { NEGATIVES } from '../src/story/negatives';
import concepts from '../docs-llm/html-in-canvas-blogs/concepts.md?raw';

const BANK = [...BANK_EARLY, ...BANK_LATE];

describe('the question bank', () => {
  it('has unique ids and exactly one right answer per question', () => {
    expect(new Set(BANK.map((q) => q.id)).size).toBe(BANK.length);
    BANK.forEach((q) => {
      expect(q.options.filter((o) => o.correct).length, q.id).toBe(1);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.source.length).toBeGreaterThan(0);
    });
  });

  it('covers every roll of the journey', () => {
    for (const roll of ROLLS) expect(BANK.some((q) => q.roll === roll.id), roll.id).toBe(true);
  });
});

describe('the boss rush', () => {
  const order = pickRush(BANK, ROLLS.map((r) => r.id), () => 0);

  it('deals one question per roll, in journey order', () => {
    expect(order).toHaveLength(ROLLS.length);
    order.forEach((id, i) => expect(BANK.find((q) => q.id === id)!.roll).toBe(ROLLS[i]!.id));
    const last = pickRush(BANK, ROLLS.map((r) => r.id), () => 0.999);
    expect(last).not.toEqual(order);
  });

  it('wins when every question is answered', () => {
    let rush = startRush(['a', 'b']);
    rush = answerRush(rush, true);
    expect(rush.status).toBe('playing');
    rush = answerRush(rush, true);
    expect(rush.status).toBe('won');
    expect(answerRush(rush, false)).toBe(rush);
  });

  it('stays on the question and costs a life when wrong', () => {
    const rush = answerRush(startRush(['a', 'b']), false);
    expect(rush.index).toBe(0);
    expect(rush.lives).toBe(LIVES - 1);
    expect(rush.mistakes).toBe(1);
  });

  it('is lost after three wrong answers, so guessing cannot win', () => {
    let rush = startRush(['a']);
    for (let i = 0; i < LIVES; i++) rush = answerRush(rush, false);
    expect(rush.status).toBe('lost');
  });

  it('judges answers by the option flagged correct', () => {
    const q = BANK[0]!;
    const right = q.options.findIndex((o) => o.correct);
    expect(isCorrect(q, right)).toBe(true);
    expect(isCorrect(q, (right + 1) % q.options.length)).toBe(false);
    expect(isCorrect(q, 99)).toBe(false);
  });
});

describe('the escape hatch', () => {
  it('offers every fallback the Chrome docs list', () => {
    for (const name of ['three-html-render', 'html2canvas', 'dom-to-image']) expect(concepts).toContain(name);
    expect(concepts).toContain('An alternative UI');
    expect(concepts).toContain('Floating HTML overlays');
    expect(HATCH_OPTIONS).toEqual(expect.arrayContaining(['alt-ui', 'overlay', 'three-html-render', 'html2canvas', 'dom-to-image']));
  });

  it('accepts the fitting fallback and rejects the rest', () => {
    expect(judgeHatch('export', 'html2canvas')).toBe(true);
    expect(judgeHatch('export', 'dom-to-image')).toBe(true);
    expect(judgeHatch('export', 'overlay')).toBe(false);
    expect(judgeHatch('overlay', 'overlay')).toBe(true);
    expect(judgeHatch('overlay', 'html2canvas')).toBe(false);
    expect(judgeHatch('supported', 'native')).toBe(true);
    expect(judgeHatch('nope', 'native')).toBe(false);
  });

  it('turns every scenario into a question with at least one right answer', () => {
    const questions = hatchQuestions();
    expect(questions).toHaveLength(HATCH_SCENARIOS.length);
    questions.forEach((q) => {
      expect(q.options).toHaveLength(Object.keys(HATCH_LABELS).length);
      expect(q.options.some((o) => o.correct)).toBe(true);
      expect(q.options.some((o) => !o.correct)).toBe(true);
    });
  });
});

describe('feature detection', () => {
  const fakeDoc = (reflects: boolean) => ({
    createElement: () => {
      const el = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v; },
        get content() { return reflects ? this.attrs.content : undefined; } };
      return el as unknown as HTMLCanvasElement;
    },
  });

  it('follows the Chrome docs: set the attribute, read the property', () => {
    expect(supportsHtmlInCanvas(undefined)).toBe(false);
    expect(supportsHtmlInCanvas(fakeDoc(true))).toBe(true);
    expect(supportsHtmlInCanvas(fakeDoc(false))).toBe(false);
  });

  it('probes each context’s own method', () => {
    const env: DetectEnv = {
      document: fakeDoc(true),
      CanvasRenderingContext2D: { prototype: { drawElementImage() {} } },
      WebGL2RenderingContext: { prototype: {} },
      HTMLCanvasElement: { prototype: { updateElementGeometry() {} } },
    };
    const report = detectSupport(env);
    expect(report).toMatchObject({ content: true, '2d': true, webgl: false, webgpu: false, worker: false, geometry: true });
    expect(pathFor(report, '2d')).toBe('native');
    expect(pathFor(report, 'webgl')).toBe('escape-hatch');
    expect(pathFor({ ...report, content: false }, '2d')).toBe('escape-hatch');
  });
});

describe('coverage', () => {
  it('blends frames developed and negatives collected, ignoring secrets', () => {
    const pool = NEGATIVES.filter((n) => n.roll === 'bells' && n.rarity !== 'secret');
    const none = coverageFor({ frames: {}, negatives: [] }, 'bells');
    expect(none.value).toBe(0);
    const all = coverageFor({ frames: { bells: ['story', 'lab', 'practice', 'trial'] }, negatives: pool.map((n) => n.id) }, 'bells');
    expect(all.value).toBe(1);
    const half = coverageFor({ frames: { bells: ['story', 'lab'] }, negatives: [] }, 'bells');
    expect(half.value).toBeCloseTo(0.25);
  });
});
