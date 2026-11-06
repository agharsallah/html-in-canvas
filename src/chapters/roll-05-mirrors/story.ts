import { ghostFigure, stackFigure } from '../../ui/charts/mirror-figures';
import type { StoryLine } from '../shared/chapter';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'Past the projector hall lies a maze of tin mirrors. Every button in it has a double, and only one of them answers when you click.',
  },
  {
    speaker: 'caret',
    text: 'You decide where an element is drawn. The browser can’t read that off its CSS, so it needs to be told: that is its geometry.',
    concept: {
      id: 'geometry',
      title: 'Element geometry',
      kind: 'idea',
      what: 'Where a drawn element sits on screen, which the browser needs for hit testing, layout queries such as `getBoundingClientRect()`, and assistive-tech bounds.',
      body: [
        'Canvas children start with no geometry, so they are not hit testable until drawn or given a transform.',
        'Without it, clicks, magnifiers and layout queries all aim at the wrong place.',
      ],
      source: 'README.md, 1. The canvas content attribute; Chrome docs, concepts.md, Update an element’s geometry',
    },
  },
  {
    speaker: 'caret',
    text: 'In 2D you rarely think about it. Each `drawElementImage` call updates the geometry to exactly where it drew.',
    concept: {
      id: 'auto-sync',
      title: '2D syncs itself',
      kind: 'rule',
      what: 'In a 2D context, `drawElementImage` updates the element’s geometry automatically, from its arguments, the element’s computed style and the context’s current transform.',
      body: ['So a drawn button is clickable exactly where it appears, rotated and scaled included.'],
      code: 'ctx.translate(200, 80);\nctx.rotate(-0.15);\nctx.drawElementImage(button, 0, 0); // geometry follows',
      source: 'README.md, 5. Synchronizing the DOM and drawing; Chrome docs, concepts.md',
    },
  },
  {
    speaker: 'foe',
    text: 'Clever. Then let me whisper an option into your draw call. One little flag, and the double stays behind.',
  },
  {
    speaker: 'caret',
    text: 'That flag is real. `preserveElementGeometry: true` stops the automatic update. Move the drawing and the hit area stays where it was.',
    concept: {
      id: 'preserve-geometry',
      title: '`{ preserveElementGeometry: true }`',
      kind: 'property',
      what: 'An option for `drawElementImage` that draws without updating the element’s geometry, so you can set it yourself.',
      figure: ghostFigure,
      body: [
        'It defaults to `false`. Turn it on only when you will call `updateElementGeometry` yourself.',
        'Forget that call and the geometry gets out of sync: the drawing moves, the clicks don’t.',
      ],
      code: 'ctx.drawElementImage(card, x, y, { preserveElementGeometry: true });\ncanvas.updateElementGeometry(card, { canvasTransform: m });',
      source: 'README.md, IDL (DrawElementImageOptions); Chrome docs, 2d.md, Manually update element geometry',
    },
  },
  {
    speaker: 'caret',
    text: 'The manual lever is `updateElementGeometry`. It takes a transform, an optional hit-test clip, and a say in the stacking order.',
    concept: {
      id: 'update-geometry',
      title: '`canvas.updateElementGeometry(el, options)`',
      kind: 'method',
      what: 'Tells the browser where an element is drawn: `canvasTransform` maps its border box (before CSS transforms) to the canvas.',
      body: [
        'Options: `canvasTransform` (a `DOMMatrix`), `canvasClip` (a `DOMRect`) and `preserveHitTestOrder` (default `false`). An omitted transform or clip keeps its previous value.',
        'It is not used for rendering, so changing it does not fire `paint`. Setting the transform also gives the element geometry for accessibility.',
      ],
      code: 'canvas.updateElementGeometry(card, {\n  canvasTransform: new DOMMatrix().translate(120, 40),\n});',
      source: 'README.md, 5. Synchronizing the DOM and drawing; IDL (UpdateElementGeometryOptions)',
    },
  },
  {
    speaker: 'caret',
    text: 'Mind the units. You draw in canvas grid px, but geometry speaks CSS px. On a 2x screen, forget to divide and the double lands twice as far away.',
    concept: {
      id: 'geometry-units',
      title: 'Geometry is CSS px',
      kind: 'rule',
      what: '`canvasTransform`, `canvasClip` and `getElementTransform()` are in CSS px; `drawElementImage`’s `dx, dy` are canvas grid px.',
      body: ['Divide grid px by the grid-per-CSS-px scale (`canvas.width / cssWidth`) before you put them in a transform.'],
      code: 'const m = new DOMMatrix();\nm.e = x / scaleX; // grid px → CSS px\nm.f = y / scaleY;',
      source: 'Chrome docs, concepts.md, Sizing and units; 2d.md, Manually update element geometry',
    },
  },
  {
    speaker: 'caret',
    text: 'To see what the browser believes, ask it. `getElementTransform` hands back the current matrix, or identity if none was set.',
    concept: {
      id: 'get-transform',
      title: '`canvas.getElementTransform(el)`',
      kind: 'method',
      what: 'Returns a new `DOMMatrix`: the transform currently mapping the element’s border box to the canvas, or an identity matrix if none was set.',
      body: ['It takes one argument. Updated by `updateElementGeometry`, cleared by `clearElementGeometry`. Some library snippets pass a second argument; the README’s IDL has one.'],
      code: 'const m = canvas.getElementTransform(card);\nconsole.log(m.e, m.f); // CSS px',
      source: 'README.md, IDL (getElementTransform)',
    },
  },
  {
    speaker: 'caret',
    text: 'When doubles overlap, order decides. The canvas keeps a hit-test stack, and each update lifts an element to the top.',
    concept: {
      id: 'hit-order',
      title: 'Hit-test order',
      kind: 'rule',
      what: 'The canvas keeps an ordered stack of drawables; every geometry update moves the element to the top, so the last drawn is the topmost click target.',
      figure: stackFigure,
      body: [
        '`preserveHitTestOrder: true` leaves an element where it is if it is already in the stack. If it isn’t, it still goes on top.',
        'Use it for backgrounds you update after the foreground. Hit testing goes straight from the canvas to each child, skipping clips and transforms in between.',
      ],
      code: 'canvas.updateElementGeometry(backdrop, {\n  canvasTransform: parallax,\n  preserveHitTestOrder: true,\n});',
      source: 'README.md, 5. Synchronizing the DOM and drawing; IDL; Chrome docs, concepts.md, Manage hit-test stacking order',
    },
  },
  {
    speaker: 'caret',
    text: 'Draw only half a mirror and the other half still catches clicks, unless you clip the hit area too.',
    concept: {
      id: 'canvas-clip',
      title: '`canvasClip`',
      kind: 'property',
      what: 'A `DOMRect` that limits an element’s hit testing to the part you actually drew. It does not clip the drawing.',
      body: ['It is evaluated in the coordinate space of `canvasTransform`. Whether that means the element’s space or the canvas’ is still an open question in the README; our simulation reads it in element px.'],
      code: 'ctx.drawElementImage(card, 0, 0, w, h / 2, x, y); // top half\ncanvas.updateElementGeometry(card, { canvasClip: { x: 0, y: 0, width: w, height: h / 2 } });',
      source: 'README.md, 5. Synchronizing the DOM and drawing; IDL; open questions',
    },
  },
  {
    speaker: 'caret',
    text: 'And to banish a double for good, clear it. The element stays in the DOM, but stops catching clicks.',
    concept: {
      id: 'clear-geometry',
      title: '`canvas.clearElementGeometry(el)`',
      kind: 'method',
      what: 'Un-draws an element without removing it from the DOM: resets its canvas transform, takes it out of hit testing and marks it offscreen for accessibility.',
      body: ['In 2D, drawing it again restores geometry, so clear what you have stopped drawing.'],
      code: 'canvas.clearElementGeometry(menu);',
      source: 'README.md, 5. Synchronizing the DOM and drawing; Chrome docs, concepts.md, Reset geometry',
    },
  },
  {
    speaker: 'caret',
    text: 'In 3D, nobody syncs for you. Pass the whole chain as one 4x4 matrix and a tilted card stays clickable, perspective and all.',
    concept: {
      id: 'projective',
      title: '3D geometry: one projective matrix',
      kind: 'idea',
      what: 'WebGL and WebGPU must call `updateElementGeometry` themselves, with a 4x4 `DOMMatrix` from the element’s px to canvas CSS px.',
      body: [
        'The chain is viewport × projection × view × model × element-to-plane. This site’s darkroom does exactly that for every hanging print (`src/hic/projective-geometry.ts`).',
        'Stop calling it and the card keeps turning while clicks still land where it used to be.',
      ],
      code: 'const m = elementToCanvasMatrix({ objectMatrixWorld, camera, plane, element, viewport });\ncanvas.updateElementGeometry(card, { canvasTransform: new DOMMatrix(m) });',
      source: 'README.md, 5. Synchronizing the DOM and drawing; Chrome docs, concepts.md and webgl.md; this repo',
    },
  },
  {
    speaker: 'caret',
    text: 'You may meet a relic in older demos: no `updateElementGeometry` at all, just the matrix written into `style.transform`. Recognise it; don’t copy it.',
    concept: {
      id: 'legacy-transform',
      title: 'The `style.transform` relic',
      kind: 'idea',
      what: 'Before `updateElementGeometry`, demos moved the element’s CSS `transform` to where it was drawn. The WebGL demo keeps it only as a fallback, marked “do not use”.',
      code: "if (canvas.updateElementGeometry !== undefined) {\n  canvas.updateElementGeometry(el, { canvasTransform: m });\n} else {\n  // Older approach (do not use).\n  el.style.transform = m.toString();\n}",
      source: 'Examples/webGL.html; Examples/webgpu-jelly-slider/src/index.ts',
    },
  },
];
