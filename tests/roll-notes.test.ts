/**
 * The notes on the back of each print must cover exactly what the front
 * promises, so turning a print over never shows a concept without a gist.
 */
import { describe, expect, it } from 'vitest';
import { FRAMES } from '../src/game/state';
import { FRAME_NOTES, ROLL_NOTES } from '../src/story/roll-notes';
import { ROLLS } from '../src/story/rolls';

describe('roll notes', () => {
  it('exist for every roll and no others', () => {
    expect(Object.keys(ROLL_NOTES).sort()).toEqual(ROLLS.map((r) => r.id).sort());
  });

  it('explain every concept on the front, and only those', () => {
    for (const roll of ROLLS) {
      expect(Object.keys(ROLL_NOTES[roll.id].gists), roll.id).toEqual(roll.concepts);
    }
  });

  it('keep each gist to one short sentence or two', () => {
    for (const roll of ROLLS) {
      for (const [concept, gist] of Object.entries(ROLL_NOTES[roll.id].gists)) {
        expect(gist.length, `${roll.id}: ${concept}`).toBeGreaterThan(20);
        expect(gist.length, `${roll.id}: ${concept}`).toBeLessThanOrEqual(130);
      }
      expect(ROLL_NOTES[roll.id].build.length).toBeLessThanOrEqual(80);
    }
  });

  it('describe every frame on the contact sheet', () => {
    expect(Object.keys(FRAME_NOTES)).toEqual([...FRAMES]);
  });
});
