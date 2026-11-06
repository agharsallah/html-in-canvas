import { nestedFigure } from '../../ui/charts/figures';
import type { StoryLine } from '../shared/chapter';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'Beyond the darkroom door lies the Fallback: a grey fog where the children of every canvas wait, unseen and unplaced.',
  },
  {
    speaker: 'caret',
    text: 'By default, a canvas treats its children as fallback content, meant only for browsers that cannot show a canvas at all. They are not laid out.',
    concept: {
      id: 'content-attr',
      title: '`content` attribute',
      kind: 'attribute',
      what: 'An attribute on `<canvas>` that decides what its children are: `fallback` (the default) or `drawable` (laid out, ready to draw).',
      body: [
        'A missing or unknown value means `fallback`.',
        'Older builds used `layoutsubtree` instead. Demos set both for now.',
      ],
      code: '<canvas content="drawable">\n  …children…\n</canvas>',
      source: 'README.md, 1. The canvas content attribute',
    },
  },
  {
    speaker: 'caret',
    text: 'Switch it to `content="drawable"` and the children step out of the fog. The canvas blockifies each direct child and lays it out with static positioning.',
  },
  {
    speaker: 'caret',
    text: "Careful: laid out isn't the same as visible. Nothing appears on the canvas until you draw it.",
    concept: {
      id: 'laid-out',
      title: 'Laid out, not painted',
      kind: 'rule',
      what: 'Opted-in children get real layout, but nothing appears on the canvas until you draw it, and until then they are not hit testable.',
      body: [
        'Layout is the browser’s job; where the pixels go is yours. A laid-out child has a size, but no place on the canvas yet.',
      ],
      source: 'README.md, 1. The canvas content attribute',
    },
  },
  {
    speaker: 'caret',
    text: 'Screen readers can already hear them, though. They just cannot tell where they are.',
    concept: {
      id: 'a11y-no-geometry',
      title: 'Heard, but not placed',
      kind: 'rule',
      what: 'Laid-out canvas children are exposed to accessibility like regular DOM, but until they are drawn they have no geometry: assistive tech knows they exist, not where they are.',
      body: [
        'Drawing a drawable with `drawElementImage` gives it geometry. The Mirror Maze shows how to set it yourself with `updateElementGeometry`.',
        '`aria-hidden="true"` and `inert` work on them like on any DOM. Children you never draw, such as hidden views or old content, should usually be removed or hidden.',
      ],
      source: 'README.md, 1. The canvas content attribute; Accessibility',
    },
  },
  {
    speaker: 'caret',
    text: 'Every child you want to draw needs one more thing: the `drawable` attribute.',
    concept: {
      id: 'drawable-attr',
      title: '`drawable` attribute',
      kind: 'attribute',
      what: 'An attribute on a canvas child that makes it drawable: the browser records a snapshot of it that you can paint.',
      body: [
        'It also implies `isolation: isolate` and makes the element a containing block for all its descendants. Chrome’s docs call each drawable an independent paint root.',
      ],
      code: '<canvas content="drawable">\n  <form drawable>\n    <label for="name">name:</label>\n    <input id="name">\n  </form>\n</canvas>',
      source: 'README.md, 2. The drawable attribute',
    },
  },
  {
    speaker: 'caret',
    text: 'And it is not only for direct children. Any element inside the canvas can carry `drawable`.',
    concept: {
      id: 'drawable-anywhere',
      title: 'Drawables at any depth',
      kind: 'rule',
      what: 'Any descendant of the canvas can be `drawable`, not just its direct children.',
      body: [
        'In the README’s accessibility example, a plain `<figure>` holds a drawable `<img>` and a drawable `<figcaption>`: each is drawn on its own, and the figure keeps their meaning together.',
        'In nested-sparkles, the drawable is a `<span>` deep inside the poem.',
        'Only blockifying is limited to direct children.',
      ],
      code: '<canvas content="drawable">\n  <figure>\n    <img drawable src="…" alt="…">\n    <figcaption drawable>A caption</figcaption>\n  </figure>\n</canvas>',
      source: 'README.md, 2. The drawable attribute; Accessibility; Examples/nested-sparkles.html',
    },
  },
  {
    speaker: 'caret',
    text: 'Then you draw it, with one call on the 2D context: the element, then where its top-left corner should go.',
    concept: {
      id: 'draw-basic',
      title: '`ctx.drawElementImage(element, x, y)`',
      kind: 'method',
      what: "Paints a drawable element's latest snapshot onto the 2D canvas, with its top-left corner at (x, y).",
      body: [
        'x and y are canvas pixels. The Projector Hall teaches the longer forms that crop and scale.',
        'Call `ctx.reset()` first so each frame starts from a clean canvas.',
      ],
      code: "const ctx = canvas.getContext('2d');\nctx.reset();\nctx.drawElementImage(form, 0, 0);",
      source: 'README.md, Basic Example',
    },
  },
  {
    speaker: 'foe',
    text: 'Draw whatever you like, apprentice. Forget one attribute and I swallow it whole.',
  },
  {
    speaker: 'caret',
    text: 'The Fog means exceptions. `drawElementImage` throws instead of drawing nothing, so mistakes are loud.',
    concept: {
      id: 'draw-throws',
      title: 'When drawing throws',
      kind: 'rule',
      what: '`drawElementImage` throws an exception if the element is not drawable, has no snapshot yet, or has another canvas as an ancestor.',
      body: [
        'No `drawable` attribute on the element.',
        'No snapshot yet: for example, the canvas is still `content="fallback"`, or the first rendering update has not happened.',
        'The element sits inside a different canvas. Draw each element into the canvas that owns it: in Chrome’s nested-canvas example, the inner canvas draws its own child.',
        'The explainer says only that “an exception is thrown”, not which type. In Chrome, the lab prints the browser’s real one.',
      ],
      source: 'README.md, 4. drawElementImage; Chrome docs, concepts.md, Nested canvases',
    },
  },
  {
    speaker: 'caret',
    text: 'Drawables can nest. When they do, the outer snapshot leaves the inner drawable out. You draw that one separately.',
    concept: {
      id: 'nested',
      title: 'Nested drawables',
      kind: 'rule',
      what: "A drawable's snapshot skips any drawable descendants. Each one is drawn with its own call.",
      figure: nestedFigure,
      body: [
        'In nested-sparkles, the word keeps its place in the poem’s layout. The demo measures that in-flow spot, paints sparkles there, then draws the word into it.',
        'That is a feature: draw the poem, paint sparkles, then draw the word on top. You can decorate one part without redrawing the rest.',
      ],
      code: 'ctx.drawElementImage(poem, 0, 0);\n// …paint sparkles around the word…\nctx.drawElementImage(you, x, y);',
      source: 'README.md, 2. The drawable attribute; Examples/nested-sparkles.html',
    },
  },
  {
    speaker: 'caret',
    text: 'Into the fog, then. Bring a lamp.',
  },
];
