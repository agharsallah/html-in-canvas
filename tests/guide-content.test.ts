/**
 * The one-page guide: its content must stay consistent as concepts are added.
 * Entry ids double as DOM ids and URL fragments, so they must be unique and
 * must never collide with the page's own landmarks.
 */
import { describe, expect, it } from 'vitest';
import { CHEAT_SHEET, ENTRIES, GROUPS } from '../src/guide/content';
import { FIGURES } from '../src/guide/figures';
import { tokenize } from '../src/ui/editor/highlight';

const RESERVED = ['guide', 'g-main', 'g-rail', 'g-title', 'everything', 'cheat-sheet'];

describe('guide content', () => {
  it('uses unique DOM ids for groups and entries, clear of the page landmarks', () => {
    const ids = [...GROUPS.map((g) => g.id), ...ENTRIES.map((e) => e.id)];
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => {
      expect(RESERVED).not.toContain(id);
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    });
  });

  it('gives every group at least one entry', () => {
    GROUPS.forEach((g) => expect(g.entries.length).toBeGreaterThan(0));
  });

  it('gives every entry a one-sentence definition, facts and a source', () => {
    for (const entry of ENTRIES) {
      expect(entry.what, entry.id).toMatch(/[.!]$/);
      expect(entry.points.length, entry.id).toBeGreaterThan(0);
      expect(entry.source.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('wires every figure to exactly one entry, and every entry figure exists', () => {
    const used = ENTRIES.flatMap((e) => (e.figure ? [e.figure] : []));
    expect(new Set(used).size).toBe(used.length);
    expect([...used].sort()).toEqual(Object.keys(FIGURES).sort());
  });

  it('highlights every code sample losslessly', () => {
    const samples = [...ENTRIES.flatMap((e) => (e.code ? [{ code: e.code, lang: e.lang ?? 'js' }] : [])), { code: CHEAT_SHEET, lang: 'html' as const }];
    for (const { code, lang } of samples) {
      expect(tokenize(code, lang).map((t) => t.text).join('')).toBe(code);
    }
  });
});
