import { inOrder, type Exercise } from '../shared/exercise';

const DRAW_POEM = /ctx\.drawElementImage\(\s*poem\s*,\s*0\s*,\s*0\s*\)/;
const DRAW_YOU = /ctx\.drawElementImage\(\s*you\s*,\s*x\s*,\s*y\s*\)/;

export const exercises: Exercise[] = [
  {
    id: 'fog-opt-in',
    title: 'Open the canvas',
    task: 'This form sits in the fog. Opt the canvas’ children into layout, and mark the form so it can be drawn.',
    language: 'html',
    starter: `<canvas>
  <form>
    <label for="name">name:</label>
    <input id="name">
  </form>
</canvas>`,
    solution: `<canvas content="drawable">
  <form drawable>
    <label for="name">name:</label>
    <input id="name">
  </form>
</canvas>`,
    checks: [
      { label: 'The canvas opts its children into layout', test: /<canvas\b[^>]*\bcontent\s*=\s*"drawable"/i },
      { label: 'The form is marked drawable', test: /<form\b[^>]*\sdrawable\b/i },
      { label: 'The label and input are still inside the form', test: /<form\b[^>]*>.*<label\b.*<input\b[^>]*>.*<\/form>/i },
    ],
    hints: [
      'You need two attributes: one on `<canvas>`, one on `<form>`.',
      'The canvas attribute has a name and a value. The form attribute is a single word, like `hidden`.',
    ],
    seenIn: 'drawable-attr',
  },
  {
    id: 'fog-fix-throw',
    title: 'Stop the throw',
    task: 'The script calls `ctx.drawElementImage(note, 0, 0)` and it throws an exception. There are two bugs, both in this markup. Fix them without touching the script.',
    language: 'html',
    starter: `<canvas content="fallback">
  <p id="note">Sugar is sweet</p>
</canvas>`,
    solution: `<canvas content="drawable">
  <p id="note" drawable>Sugar is sweet</p>
</canvas>`,
    checks: [
      { label: 'The canvas no longer treats its children as fallback', test: /<canvas\b[^>]*\bcontent\s*=\s*"drawable"/i },
      { label: 'The paragraph can be drawn', test: /<p\b[^>]*\sdrawable\b/i },
      { label: 'The paragraph keeps id="note"', test: /<p\b[^>]*\bid\s*=\s*"note"/i },
    ],
    hints: [
      'Read the three reasons `drawElementImage` throws. Two of them apply here.',
      'One bug is on `<canvas>`, the other on `<p>`.',
    ],
    seenIn: 'draw-throws',
  },
  {
    id: 'fog-nested',
    title: 'Draw the nested word',
    task: '`#you` is a drawable inside the drawable `#poem`, so the poem’s snapshot leaves the word out. Draw the poem at (0, 0), then draw `you` on its own at (x, y).',
    language: 'js',
    starter: `function draw(x, y) {
  ctx.reset();
  // draw the poem at 0, 0

  // draw the nested drawable on its own at x, y

}`,
    solution: `function draw(x, y) {
  ctx.reset();
  ctx.drawElementImage(poem, 0, 0);
  ctx.drawElementImage(you, x, y);
}`,
    checks: [
      { label: 'Draws the poem at (0, 0)', test: DRAW_POEM },
      { label: 'Draws you with its own call at (x, y)', test: DRAW_YOU },
      { label: 'Draws the poem first, so the word lands on top', test: (code) => inOrder(code, DRAW_POEM, DRAW_YOU) },
    ],
    hints: [
      'Two calls to the same method, one per element.',
      'The method is `ctx.drawElementImage(element, x, y)`. Order matters: later calls paint on top.',
    ],
    seenIn: 'nested',
  },
];
