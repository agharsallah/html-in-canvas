import { pipelineFigure } from '../../ui/charts/figures';
import type { StoryLine } from '../shared/chapter';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'High above the darkroom hangs a bronze bell. Every time the page renders and a drawable looks different, it rings.',
  },
  {
    speaker: 'caret',
    text: 'First, what you actually draw. Not the live element: a recording of it.',
    concept: {
      id: 'snapshot',
      title: 'Snapshot',
      kind: 'idea',
      what: 'A recording of how a drawable element (and its non-drawable descendants) looks, made by the browser on every rendering update.',
      body: ['`drawElementImage` always draws the most recent snapshot.'],
      source: 'README.md, 3. The paint event',
    },
  },
  {
    speaker: 'caret',
    text: 'When a new snapshot would look different from the last one, the canvas fires `paint`. That is your moment to redraw.',
    concept: {
      id: 'paint-event',
      title: '`paint` event',
      kind: 'event',
      what: 'An event fired on the canvas when any of its drawable children would be drawn differently. Redraw inside it.',
      body: [
        'It fires once per rendering update, right after the browser paints.',
        'Browsers may fire it when nothing changed, but should avoid it.',
      ],
      code: "canvas.addEventListener('paint', () => {\n  ctx.reset();\n  ctx.drawElementImage(form, 100, 0);\n});",
      source: 'README.md, 3. The paint event; Basic Example',
    },
  },
  {
    speaker: 'caret',
    text: 'The event tells you exactly who changed, so you can skip work for everything else.',
    concept: {
      id: 'changed-elements',
      title: '`event.changedElements`',
      kind: 'property',
      what: 'The list of drawable children whose snapshot changed in this update. Empty when nothing changed.',
      body: [
        'The WebGL demo uses it to re-upload only the textures that changed.',
        'On the very first paint nothing has been drawn yet. The WebGL demo uploads a texture only when its element is in the list, so it relies on the first paint listing its drawables. The docs never say so outright: expect it, but check it in your own code.',
      ],
      code: "canvas.onpaint = (event) => {\n  if (event.changedElements.includes(choice)) {\n    updateTexture(gl, texture, choice);\n  }\n  render();\n};",
      source: 'README.md, IDL (CanvasPaintEvent); Examples/webGL.html',
    },
  },
  {
    speaker: 'caret',
    text: 'So what counts as a change? Anything that would make the snapshot look different.',
    concept: {
      id: 'what-changes',
      title: 'What counts as a change',
      kind: 'rule',
      what: 'A drawable is listed as changed when its snapshot would be drawn differently: style changes, layout shifts, text edits, focus state changes.',
      body: [
        'Typing a letter, tabbing into a field, or a class that recolours a button all count.',
        'A change anywhere else on the page does not: the list only holds this canvas’ own drawable descendants.',
        'A focused field’s blinking caret is part of the snapshot too. Caret blink rate is deliberately not treated as sensitive, so it may keep the bell ringing.',
      ],
      source: 'Chrome docs, concepts.md, Understand the paint event; README.md, 3. The paint event; Read-back-allowed rendering',
    },
  },
  {
    speaker: 'foe',
    text: 'Ring, ring, ring. I will make it ring forever, and every chime will cost you a frame.',
  },
  {
    speaker: 'caret',
    text: 'Timing matters. What you draw in `paint` shows now. What you change in the DOM inside `paint` shows next time.',
    concept: {
      id: 'paint-timing',
      title: 'This frame or the next',
      kind: 'rule',
      what: 'Canvas drawing inside `paint` appears in the current frame. DOM changes inside `paint` appear in the next frame.',
      figure: pipelineFigure,
      body: [
        'By the time `paint` runs, the frame’s DOM is locked in. A DOM edit lands in the next update, which then fires another `paint`.',
      ],
      source: 'README.md, 3. The paint event; Option C',
    },
  },
  {
    speaker: 'caret',
    text: 'And when nothing changes but you still want to animate? Ask for a paint yourself.',
    concept: {
      id: 'request-paint',
      title: '`canvas.requestPaint()`',
      kind: 'method',
      what: 'Asks for one `paint` event at the next rendering update, even if nothing changed. The canvas version of `requestAnimationFrame`.',
      body: [
        'It is one-shot. To animate, call it again at the end of every paint.',
        'The demos also call it once after setting the handler, “to request an initial paint”. Whether a first paint would come on its own is not spelled out, so ask for one, as the demos do.',
      ],
      code: "canvas.onpaint = () => {\n  draw();\n  canvas.requestPaint(); // keep going\n};\ncanvas.requestPaint(); // request an initial paint",
      source: 'README.md, 3. The paint event',
    },
  },
  {
    speaker: 'caret',
    text: 'A warning about `onpaint`, while we are here. It has room for exactly one handler.',
    concept: {
      id: 'onpaint-slot',
      title: 'One `onpaint`, many listeners',
      kind: 'rule',
      what: '`canvas.onpaint` holds a single handler, so a later assignment (yours or a library’s) silently replaces the earlier one. `addEventListener("paint", …)` lets listeners coexist.',
      body: [
        'The demos use `onpaint` because each owns its whole page. In an app that mixes libraries, prefer `addEventListener`.',
        'This darkroom learned it the hard way: three.js’ `HTMLTexture` assigns `canvas.onpaint`, so our own helpers only ever use `addEventListener`.',
      ],
      code: "canvas.onpaint = drawScene;\ncanvas.onpaint = drawHud; // drawScene is gone\n\ncanvas.addEventListener('paint', drawScene);\ncanvas.addEventListener('paint', drawHud); // both run",
      source: 'README.md, IDL (`attribute EventHandler onpaint`); this site’s src/hic/paint.ts',
    },
  },
  {
    speaker: 'caret',
    text: 'One last rule. When several canvases ring at once, `paint` fires in reverse order: innermost first, and iframes before the page that holds them. So nested content is ready before its parent draws it.',
    concept: {
      id: 'reverse-order',
      title: 'Reverse tree order',
      kind: 'rule',
      what: 'When several canvases need a paint, descendants fire before their ancestors: reverse tree order within a document, and child frames before their parent documents.',
      body: [
        'In Chrome’s nested-canvas example, the inner canvas redraws its element first; then the outer canvas draws the wrapper that holds the freshly drawn inner canvas.',
        'Reverse tree order also means a later sibling canvas fires before an earlier one. That follows from the definition; the docs don’t spell out the sibling case.',
      ],
      source: 'README.md, 3. The paint event; Chrome docs, concepts.md, Nested canvases',
    },
  },
  {
    speaker: 'caret',
    text: 'Up the tower. Learn the bell’s rhythm and the Restless Bell loses its power.',
  },
];
