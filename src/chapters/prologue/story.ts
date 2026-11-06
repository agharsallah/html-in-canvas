import type { StoryLine } from '../shared/chapter';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'Once, everything in the Canvas Kingdom was pixels. Lovely pixels that nobody could select, translate, read aloud, or reach with the Tab key.',
  },
  {
    speaker: 'foe',
    text: 'Text? Draw it yourself with `fillText`. Line breaks? Measure every word. Right-to-left scripts? Good luck with that.',
  },
  {
    speaker: 'caret',
    text: "Psst, down here. I'm Caret. I used to blink inside an input field, until every element was banished to the Fallback.",
  },
  {
    speaker: 'caret',
    text: 'The Smudge has a point. A canvas only paints pixels, so everything HTML does for free has to be rebuilt by hand.',
    concept: {
      id: 'canvas-text',
      title: 'The problem with canvas text',
      kind: 'idea',
      what: 'A canvas has no layout engine: text drawn with `fillText` is just pixels, with no wrapping, no selection, no focus and no meaning for assistive tech.',
      body: [
        'Rich text layout, line breaking, bidirectional scripts, form controls and focus all have to be rebuilt by hand, or skipped.',
        'The result: canvas content suffers in accessibility, internationalization, performance and quality.',
      ],
      source: 'README.md, Motivation',
    },
  },
  {
    speaker: 'caret',
    text: 'HTML-in-Canvas fixes that. A `<canvas>` can draw real, laid-out HTML, in 2D, WebGL and WebGPU, and the HTML stays alive: selectable, focusable, accessible.',
    concept: {
      id: 'hic',
      title: 'HTML-in-Canvas',
      kind: 'idea',
      what: 'A web API that lets a `<canvas>` draw its own HTML children as images, while those children stay real, interactive DOM.',
      body: [
        'You write ordinary HTML inside the canvas, opt it in, and draw it with one call. The browser does layout, text shaping, focus rings and carets for you.',
        'It shipped in Chrome 157, and it might not be supported in every browser yet.',
      ],
      source: 'README.md, Proposed solution; Chrome docs, concepts.md',
    },
  },
  {
    speaker: 'caret',
    text: 'Five problems made people ask for it. Remember them: they come back in later rolls.',
    concept: {
      id: 'use-cases',
      title: 'Five use cases',
      kind: 'idea',
      what: 'Styled content in canvas, accessibility, effects on HTML, HTML in 3D, and exporting HTML as media.',
      body: [
        'Styled, laid-out content: chart legends and axes, rich text boxes in creative tools, in-game menus.',
        'Accessibility, without hand-syncing a hidden DOM with your draw calls.',
        'Composing HTML with effects: WebGL shaders on real elements.',
        'HTML on surfaces inside a 3D scene.',
        'Media export: turning HTML into images or video.',
      ],
      source: 'README.md, Use cases',
    },
  },
  {
    speaker: 'caret',
    text: 'Your visitor’s browser might not support it, so step one is always to ask. The trick: set the `content` attribute, then see if the `content` property reflects it back.',
    concept: {
      id: 'feature-detect',
      title: 'Feature detection',
      kind: 'rule',
      what: 'A browser supports HTML-in-Canvas if a canvas with `content="drawable"` reports `canvas.content === "drawable"`.',
      body: [
        'Use `setAttribute`, not `canvas.content = …`: in an unsupported browser, assigning the property just creates a plain JavaScript property that reads back fine, which gives a false yes.',
        'If the answer is no, fall back: an alternative UI, HTML overlays, or a library.',
      ],
      code: "function supportsHtmlInCanvas() {\n  const canvas = document.createElement('canvas');\n  canvas.setAttribute('content', 'drawable');\n  return canvas.content === 'drawable';\n}",
      source: 'Chrome docs, concepts.md, Fallback strategies',
    },
  },
  {
    speaker: 'caret',
    text: "This darkroom is where the craft survives. Each roll on the wire teaches one part of the API: a story, a lab to play in, code to write by hand, and a trial. Pass the trial and the next print develops.",
  },
  {
    speaker: 'foe',
    text: 'HTML and canvas will never agree on anything.',
  },
  {
    speaker: 'caret',
    text: 'Watch us. First, two shop signs.',
  },
];
