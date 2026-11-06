import { describe, expect, it } from 'vitest';
import { drawError, exposePoem, reflectContent, type PoemConfig } from '../src/chapters/roll-01-fog/rules';
import { renderMarkup } from '../src/chapters/roll-01-fog/markup';

const solved: PoemConfig = {
  content: 'drawable',
  drawable: { poem: true, you: true, advert: false },
  draw: { poem: true, you: true, advert: false },
};
const tweak = (patch: (c: PoemConfig) => void): PoemConfig => {
  const copy = structuredClone(solved);
  patch(copy);
  return copy;
};

describe('content attribute reflection', () => {
  it('treats missing and invalid values as fallback', () => {
    expect(reflectContent(null)).toBe('fallback');
    expect(reflectContent('')).toBe('fallback');
    expect(reflectContent('yes please')).toBe('fallback');
    expect(reflectContent('DRAWABLE')).toBe('drawable');
  });
});

describe('drawError', () => {
  it('throws for fallback content and for non-drawable elements', () => {
    expect(drawError('fallback', true)).toMatch(/no snapshot/);
    expect(drawError('drawable', false)).toMatch(/no drawable attribute/);
    expect(drawError('drawable', true)).toBeNull();
  });
});

describe('exposePoem', () => {
  it('solves with poem and #you both drawable and drawn, advert untouched', () => {
    const o = exposePoem(solved);
    expect(o.solved).toBe(true);
    expect(o.you).toBe('separate');
    expect(o.sparkles).toBe(true);
  });

  it('leaves a hole when #you is drawable but not drawn (nested subtree rule)', () => {
    const o = exposePoem(tweak((c) => (c.draw.you = false)));
    expect(o.you).toBe('missing');
    expect(o.solved).toBe(false);
    expect(o.hint).toMatch(/drawable descendants/);
  });

  it('keeps “you” inside the poem when #you is not drawable, but without sparkles', () => {
    const o = exposePoem(tweak((c) => {
      c.drawable.you = false;
      c.draw.you = false;
    }));
    expect(o.you).toBe('with-poem');
    expect(o.sparkles).toBe(false);
    expect(o.solved).toBe(false);
  });

  it('reports an error for drawing a non-drawable element', () => {
    const o = exposePoem(tweak((c) => (c.draw.advert = true)));
    expect(o.errors).toHaveLength(1);
    expect(o.errors[0]).toMatch(/#advert/);
    expect(o.advertShown).toBe(false);
  });

  it('fails when the advert is drawn', () => {
    const o = exposePoem(tweak((c) => {
      c.drawable.advert = true;
      c.draw.advert = true;
    }));
    expect(o.advertShown).toBe(true);
    expect(o.solved).toBe(false);
  });

  it('everything throws in fallback mode', () => {
    const o = exposePoem(tweak((c) => (c.content = 'fallback')));
    expect(o.errors).toHaveLength(2);
    expect(o.hint).toMatch(/fog/);
  });
});

describe('renderMarkup', () => {
  it('reflects the content mode and drawable flags', () => {
    const out = renderMarkup('drawable', [{ tag: '<h3>', drawable: true }, { tag: '<input>', drawable: false }]);
    expect(out).toContain('<canvas content="drawable">');
    expect(out).toContain('<h3 drawable>…</h3>');
    expect(out).toContain('<input>');
  });
});

describe('fog diorama follows the story', () => {
  it('starts in the fog, lays out, draws, throws once, then resolves', async () => {
    const { storyStates } = await import('../src/chapters/roll-01-fog/diorama');
    const { story } = await import('../src/chapters/roll-01-fog/story');
    const contentLine = story.findIndex((l) => l.concept?.id === 'content-attr');
    const throwsLine = story.findIndex((l) => l.concept?.id === 'draw-throws');
    expect(storyStates(contentLine)).toEqual(['fog', 'fog', 'fog']);
    expect(storyStates(contentLine + 1)).toEqual(['laid-out', 'laid-out', 'laid-out']);
    expect(storyStates(throwsLine)).toContain('error');
    expect(storyStates(story.length - 1)).toEqual(['drawn', 'drawn', 'drawn']);
  });
});
