/**
 * Every exercise must be solvable by its own solution, not by its starter,
 * and must point at a concept card that exists in its chapter's story.
 */
import { describe, expect, it } from 'vitest';
import { conceptsOf } from '../src/chapters/shared/chapter';
import { evaluate, normalizeCode, type Exercise } from '../src/chapters/shared/exercise';
import type { StoryLine } from '../src/chapters/shared/chapter';
import { exercises as prologue } from '../src/chapters/prologue/exercises';
import { exercises as fog } from '../src/chapters/roll-01-fog/exercises';
import { exercises as bells } from '../src/chapters/roll-02-bells/exercises';

// Every chapter folder with an exercises.ts and a story.ts is checked, so
// new rolls are covered without editing this file.
const exerciseModules = import.meta.glob<{ exercises: Exercise[] }>('../src/chapters/*/exercises.ts', { eager: true });
const storyModules = import.meta.glob<{ story: StoryLine[] }>('../src/chapters/*/story.ts', { eager: true });
const chapters = Object.entries(exerciseModules).map(([path, mod]) => {
  const dir = path.split('/').at(-2)!;
  const story = storyModules[path.replace('exercises.ts', 'story.ts')]?.story ?? [];
  return { name: dir, exercises: mod.exercises, story };
});

const byId = (list: Exercise[], id: string) => list.find((e) => e.id === id)!;

describe.each(chapters)('$name exercises', ({ exercises, story }) => {
  it.each(exercises.map((e) => [e.id, e] as const))('%s: solution passes every check', (_, exercise) => {
    const { results, passed } = evaluate(exercise, exercise.solution);
    expect(results.filter((r) => !r.passed).map((r) => r.label)).toEqual([]);
    expect(passed).toBe(true);
  });

  it.each(exercises.map((e) => [e.id, e] as const))('%s: starter does not pass', (_, exercise) => {
    expect(evaluate(exercise, exercise.starter).passed).toBe(false);
  });

  it.each(exercises.map((e) => [e.id, e] as const))('%s: points at a concept the story taught', (_, exercise) => {
    expect(conceptsOf({ story }).map((c) => c.id)).toContain(exercise.seenIn);
    expect(exercise.hints.length).toBeGreaterThan(0);
  });
});

describe('exercise ids', () => {
  it('are unique across chapters', () => {
    const ids = chapters.flatMap((c) => c.exercises.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('formatting does not matter, meaning does', () => {
  it('accepts single quotes, extra spaces and comments', () => {
    const ex = byId(bells, 'bells-handler');
    const code = `const canvas=document.querySelector("canvas")
      // a comment
      canvas.onpaint = () => {  ctx.reset() ;  ctx.drawElementImage( form , 100 , 0 ) }`;
    expect(evaluate(ex, code).passed).toBe(true);
  });

  it('rejects drawing before clearing', () => {
    const ex = byId(bells, 'bells-handler');
    const code = "canvas.addEventListener('paint', () => { ctx.drawElementImage(form, 100, 0); ctx.reset(); });";
    expect(evaluate(ex, code).results.find((r) => r.label === 'Clears before drawing')!.passed).toBe(false);
  });

  it('rejects the false-positive feature check that assigns the property', () => {
    const ex = byId(prologue, 'prologue-detect');
    const code = 'function f(){ const canvas = document.createElement("canvas"); canvas.content = "drawable"; return canvas.content === "drawable"; }';
    expect(evaluate(ex, code).passed).toBe(false);
  });

  it('rejects drawing the nested word before the poem', () => {
    const ex = byId(fog, 'fog-nested');
    const code = 'function draw(x, y) { ctx.reset(); ctx.drawElementImage(you, x, y); ctx.drawElementImage(poem, 0, 0); }';
    expect(evaluate(ex, code).passed).toBe(false);
  });

  it('rejects rendering only when the element changed', () => {
    const ex = byId(bells, 'bells-changed');
    const code = 'canvas.onpaint = (event) => { if (event.changedElements.includes(choice)) { updateTexture(gl, texture, choice); render(); } };';
    expect(evaluate(ex, code).passed).toBe(false);
  });

  it('accepts Array.from around changedElements', () => {
    const ex = byId(bells, 'bells-changed');
    const code = 'canvas.onpaint = (event) => { if (Array.from(event.changedElements).includes(choice)) { updateTexture(gl, texture, choice); } render(); };';
    expect(evaluate(ex, code).passed).toBe(true);
  });
});

describe('normalizeCode', () => {
  it('strips comments, unifies quotes and collapses whitespace', () => {
    expect(normalizeCode("a('x') // note\n/* block */  b", 'js')).toBe('a("x") b');
    expect(normalizeCode('<p   id=\'n\'><!-- hi --></p>', 'html')).toBe('<p id="n"> </p>');
  });
});
