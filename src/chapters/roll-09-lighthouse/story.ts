import { figureTreeFigure, hidingTableFigure } from '../../ui/charts/lighthouse-figures';
import type { StoryLine } from '../shared/chapter';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'On the last rock of the Canvas Kingdom stands a lighthouse. Its beam does not show ships the way. It reads every element aloud, so nobody is left in the dark.',
  },
  {
    speaker: 'caret',
    text: 'Good news first: a drawable canvas is not a mute bitmap. Its children are real DOM, so they are in the accessibility tree like any other content.',
    concept: {
      id: 'a11y-tree',
      title: 'Accessible like DOM',
      kind: 'rule',
      what: 'Children of a `content="drawable"` canvas are exposed to accessibility like regular DOM, unless you hide them with `aria-hidden="true"`, `inert` and the like.',
      body: [
        'Headings stay headings, buttons stay buttons, and the text stays text: a screen reader reads the real thing, not your pixels.',
      ],
      source: 'README.md, Accessibility; README.md, 1. The canvas content attribute; Chrome docs, concepts.md',
    },
  },
  {
    speaker: 'foe',
    text: 'I am Silence. Draw what you like. I decide who hears it.',
  },
  {
    speaker: 'caret',
    text: 'One special case. A drawable that was never drawn, and never given `updateElementGeometry()`, has no geometry. It is still announced, just without a position.',
    concept: {
      id: 'no-geometry',
      title: 'Announced without geometry',
      kind: 'rule',
      what: 'A drawable whose geometry was never updated, by `drawElementImage` or `updateElementGeometry`, is reported to the accessibility tree without geometry, with its drawable subtree.',
      body: [
        'Screen readers still get the meaning; visual tools such as magnifiers can filter the undrawn element out.',
        '`drawElementImage` updates geometry by default. Drawing with `{ preserveElementGeometry: true }` and never calling `updateElementGeometry` leaves the element without it.',
        'Not settled yet: whether such an element can still take keyboard focus (README open questions).',
      ],
      source: 'README.md, Accessibility; Chrome docs, concepts.md, Understand accessibility of HTML-in-Canvas',
    },
  },
  {
    speaker: 'caret',
    text: 'So you can keep semantics that are never drawn as one piece. A `<figure>` stays a figure while its image and caption are drawn separately.',
    concept: {
      id: 'layout-only',
      title: 'Layout-only parents',
      kind: 'idea',
      what: 'A canvas child does not have to be drawable: a plain wrapper keeps its semantics in the accessibility tree while its drawable children are drawn on their own.',
      figure: figureTreeFigure,
      body: [
        'The wrapper is laid out but never drawn. Its drawable children get geometry from their own `drawElementImage` calls.',
      ],
      code: '<canvas content="drawable">\n  <figure>\n    <img drawable id="image" alt="image alt text">\n    <figcaption drawable id="caption">A caption</figcaption>\n  </figure>\n</canvas>\n\nctx.drawElementImage(image, 0, 0);\nctx.drawElementImage(caption, 0, 200);',
      source: 'README.md, Accessibility (figure example); Chrome docs, concepts.md',
    },
  },
  {
    speaker: 'caret',
    text: 'Focus works inside the canvas, and the browser paints the focus ring and the caret into the snapshot for you. Focus moving even rings the bell.',
    concept: {
      id: 'focus-painted',
      title: 'Focus rings are in the snapshot',
      kind: 'rule',
      what: 'Accessibility indicators such as focus rings and carets are rendered by `drawElementImage` (and the WebGL and WebGPU equivalents).',
      body: [
        'A focus-state change counts as a visual change, so the element shows up in `changedElements` and `paint` fires.',
        'So you never fake the ring of a drawn element. Just redraw on `paint`.',
      ],
      source: 'README.md, Accessibility; Chrome docs, concepts.md, The paint event',
    },
  },
  {
    speaker: 'caret',
    text: 'Custom canvas art has no ring of its own. The pie chart example gives the canvas a role, and each drawable label a role and a tab stop.',
    concept: {
      id: 'roles-tabindex',
      title: 'Roles and tab stops',
      kind: 'idea',
      what: 'Give the canvas a `role` and `aria-label` that describe the whole, and make each drawable part focusable with `tabindex="0"` and a matching `role`.',
      code: '<canvas content="drawable" role="list" aria-label="Pie Chart">\n  <div drawable role="listitem" tabindex="0">45% Apple</div>\n  …\n</canvas>',
      source: 'Examples/pie-chart.html',
    },
  },
  {
    speaker: 'caret',
    text: 'Then, while drawing the wedges, remember the one whose label has focus, and ring it last, on top of everything.',
    concept: {
      id: 'draw-focus',
      title: '`ctx.drawFocusIfNeeded(path, element)`',
      kind: 'method',
      what: 'A standard canvas 2D method: if `element` is focused, it draws the platform focus ring along `path`.',
      body: [
        'It is ordinary canvas API, not part of the proposal. The pie chart example uses it to ring the wedge whose label is focused.',
        'Draw it after the wedges, or the next wedge paints over the ring.',
      ],
      code: 'if (document.activeElement === label) focusedPath = path;\n// …after every wedge and label is drawn:\nif (focusedPath) ctx.drawFocusIfNeeded(focusedPath, document.activeElement);',
      source: 'Examples/pie-chart.html',
    },
  },
  {
    speaker: 'foe',
    text: 'Hide your old views with `aria-hidden` and I will still lead the keyboard into the dark.',
  },
  {
    speaker: 'caret',
    text: 'Silence is right about that. Views you no longer draw must be removed or hidden. `aria-hidden` only silences them; `inert` also takes them out of Tab and clicks.',
    concept: {
      id: 'hide-stale',
      title: 'Hide what you stop drawing',
      kind: 'rule',
      what: 'Canvas children you no longer draw (old views, the back of a card) should be removed from the DOM or hidden with accessibility primitives.',
      figure: hidingTableFigure,
      body: [
        'The README names `aria-hidden="true"`. The WebGL flip-card demo toggles `inert` on each face, which also decides what is hit tested.',
        'In plain HTML, `aria-hidden` does not stop focus: a hidden button can still be tabbed to. `inert` removes focus and clicks too.',
        '`clearElementGeometry()` un-draws an element and marks it offscreen in the accessibility tree.',
      ],
      code: 'face.inert = true;      // the side nobody can see\nvisible.inert = false;  // the side facing you',
      source: 'README.md, Accessibility; Examples/webGL.html (setInert); Chrome docs, concepts.md, Reset geometry',
    },
  },
  {
    speaker: 'caret',
    text: 'The jelly slider shows the other trick: keep the real control, but invisible. The input stays drawable and focusable at opacity 0, while the shader draws the jelly.',
    concept: {
      id: 'invisible-input',
      title: 'The invisible real input',
      kind: 'idea',
      what: 'Keep a real `<input>` as the accessible control, with `opacity: 0`, and draw its look yourself. Make the drawn readout `inert` so it is not a second control.',
      body: [
        'Its geometry is still updated, so clicks and drags land on the real input.',
        'Focus becomes a colour: `#slider:focus` changes a CSS variable that the script reads with `getComputedStyle` on focus.',
      ],
      code: '<canvas content="drawable">\n  <input drawable id="slider" type="range" style="opacity: 0">\n  <div drawable id="value" inert></div>\n</canvas>',
      source: 'Examples/webgpu-jelly-slider/index.html; webgpu-jelly-slider/src/index.ts',
    },
  },
  {
    speaker: 'caret',
    text: 'And where the API is missing, nobody should be left in silence. Detect it, and fall back to something that still speaks.',
    concept: {
      id: 'fallback-strategies',
      title: 'Fallback strategies',
      kind: 'idea',
      what: 'The API shipped in Chrome 157 and may not be supported everywhere: detect it, and fall back to an alternative.',
      body: [
        'The Chrome docs list an alternative UI, floating HTML overlays, three-html-render, html2canvas and dom-to-image.',
        'For accessibility, prefer a fallback that keeps real HTML on the page.',
      ],
      code: "const canvas = document.createElement('canvas');\ncanvas.setAttribute('content', 'drawable');\nif (canvas.content !== 'drawable') showAlternativeUI();",
      source: 'Chrome docs, concepts.md, Fallback strategies',
    },
  },
  {
    speaker: 'caret',
    text: 'Up the stairs, apprentice. Light the lamp, and let every element be heard.',
  },
];
