/**
 * The rules of the fog, as pure functions. They drive the simulated lab, the
 * trial, and the unit tests, so the game can't drift from the explainer.
 *
 * README.md, "The canvas content attribute" and "The drawable attribute":
 *  - content="fallback" (default): children are fallback content, no layout.
 *  - content="drawable": children are laid out (blockified, static position).
 *  - drawElementImage throws for elements without `drawable`, before an
 *    initial snapshot exists, or for elements with other canvas ancestors.
 *    The explainer only says "an exception is thrown" and never names the
 *    type, so the simulation doesn't invent one: it reports "Exception".
 *    Natively, the lab prints whatever the browser really throws.
 *  - A drawable subtree excludes drawable descendants and their subtrees.
 */
export type ContentMode = 'fallback' | 'drawable';

/** Reflects like the IDL: missing or invalid values mean "fallback". */
export function reflectContent(value: string | null): ContentMode {
  return value?.toLowerCase() === 'drawable' ? 'drawable' : 'fallback';
}

export function drawError(content: ContentMode, isDrawable: boolean): string | null {
  if (content !== 'drawable') {
    return 'Exception: no snapshot. With content="fallback" the children are not laid out, so there is nothing to draw.';
  }
  if (!isDrawable) return 'Exception: the element has no drawable attribute.';
  return null;
}

export type ElementState = 'fog' | 'laid-out' | 'drawn' | 'error';

export function describeState(state: ElementState): string {
  switch (state) {
    case 'fog': return 'In the fog: fallback content, no layout';
    case 'laid-out': return 'Laid out, not drawn, not hit-testable';
    case 'drawn': return 'Drawn into the canvas';
    case 'error': return 'Draw call threw';
  }
}

// ---------------------------------------------------------------- the trial

export type PoemPart = 'poem' | 'you' | 'advert';
export const POEM_PARTS: readonly PoemPart[] = ['poem', 'you', 'advert'];

export interface PoemConfig {
  content: ContentMode;
  drawable: Record<PoemPart, boolean>;
  draw: Record<PoemPart, boolean>;
}

export interface PoemOutcome {
  errors: string[];
  poemShown: boolean;
  /** How the word "you" (the nested #you span) ends up in the print. */
  you: 'with-poem' | 'separate' | 'missing';
  sparkles: boolean;
  advertShown: boolean;
  solved: boolean;
  hint: string;
}

export function exposePoem(config: PoemConfig): PoemOutcome {
  const errors: string[] = [];
  const drawn = (part: PoemPart): boolean => {
    if (!config.draw[part]) return false;
    const error = drawError(config.content, config.drawable[part]);
    if (error) errors.push(`drawElementImage(#${part}): ${error}`);
    return !error;
  };

  const poemShown = drawn('poem');
  const youDrawn = drawn('you');
  const advertShown = drawn('advert');

  // #you is inside #poem. If #you is drawable, it is cut out of #poem's subtree.
  const you: PoemOutcome['you'] = youDrawn
    ? 'separate'
    : poemShown && !config.drawable.you
      ? 'with-poem'
      : 'missing';

  const solved = errors.length === 0 && poemShown && youDrawn && !advertShown;
  return { errors, poemShown, you, sparkles: youDrawn, advertShown, solved, hint: hintFor(config, { poemShown, you, advertShown, errors, solved }) };
}

function hintFor(config: PoemConfig, o: Pick<PoemOutcome, 'poemShown' | 'you' | 'advertShown' | 'errors' | 'solved'>): string {
  if (o.solved) return 'A perfect print: the poem, a sparkling “you”, and no advert.';
  if (config.content !== 'drawable') return 'Everything is still in the fog. The canvas has to opt its children into layout first.';
  if (o.errors.length) return 'A draw call threw. Every element you draw needs the drawable attribute.';
  if (!o.poemShown) return 'The poem itself is missing from the print.';
  if (o.you === 'missing') return 'The word “you” vanished. A drawable subtree stops at drawable descendants, so #you must be drawn on its own.';
  if (o.you === 'with-poem') return '“You” is there but not sparkling. To decorate it separately it must be its own drawable, drawn on its own.';
  if (o.advertShown) return 'The advert made it into the print. Only draw what belongs there.';
  return 'Close. Check each toggle against the goal.';
}
