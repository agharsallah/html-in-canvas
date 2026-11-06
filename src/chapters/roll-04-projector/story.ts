import { projectorMapFigure } from '../../ui/charts/projector-map';
import type { StoryLine } from '../shared/chapter';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'Red velvet, a hum of fans, and a single beam. In the projector hall, every snapshot can be thrown anywhere on the canvas: cropped, stretched, or spun.',
  },
  {
    speaker: 'caret',
    text: 'In the fog you used the short form: element, x, y. The projector has four. Count the numbers after the element: two, four, six or eight.',
    concept: {
      id: 'draw-overloads',
      title: 'The four forms of `drawElementImage`',
      kind: 'method',
      what: 'One method, four overloads: position only, position and size, crop then position, and crop then position and size.',
      body: [
        '`(el, dx, dy)` draws the whole element at its default size.',
        '`(el, dx, dy, dw, dh)` scales the whole element into a `dw × dh` box.',
        '`(el, sx, sy, sw, sh, dx, dy)` draws only that area, at the same scale as the default-size form.',
        '`(el, sx, sy, sw, sh, dx, dy, dw, dh)` crops, then maps the area onto the destination rect.',
      ],
      code: 'ctx.drawElementImage(targetElement, 100, 150);\nctx.drawElementImage(targetElement, 100, 150, 180, 60);\nctx.drawElementImage(targetElement, 0, 0, 90, 30, 100, 150);\nctx.drawElementImage(targetElement, 0, 0, 90, 30, 100, 150, 180, 60);',
      source: 'README.md, IDL changes (CanvasDrawElementImage); Chrome docs, 2d.md',
    },
  },
  {
    speaker: 'caret',
    text: 'What goes through the gate is the element’s last snapshot, starting at its border box, before CSS transforms. A `transform` on the element itself is not what you project.',
    concept: {
      id: 'border-box-origin',
      title: 'Border box, before transforms',
      kind: 'rule',
      what: '`drawElementImage` draws the element’s most recent snapshot, starting at its border box, before CSS transformations.',
      body: [
        'Padding and border are part of the drawn rectangle. With `box-sizing: border-box`, the `width` you set is the width that gets drawn.',
        'To move, scale or turn it on the canvas, use the call’s numbers and the context transform, not CSS `transform`.',
      ],
      code: '#card {\n  box-sizing: border-box;\n  width: 200px;\n  padding: 16px;\n}',
      source: 'README.md, 4. drawElementImage; Chrome docs, concepts.md (Sizing and units)',
    },
  },
  {
    speaker: 'caret',
    text: 'Now the trap. The source rect is measured in CSS pixels, on the element. The destination is in canvas grid pixels, on the canvas. One call, two units.',
    concept: {
      id: 'source-dest-units',
      title: 'Source in CSS px, destination in grid px',
      kind: 'rule',
      what: '`sx, sy, sw, sh` are CSS pixels of the element; `dx, dy, dw, dh` are canvas grid pixels.',
      figure: projectorMapFigure,
      body: [
        'The default size is the element’s CSS size converted to grid pixels. On a grid with 2 grid px per CSS px, a 60 CSS px crop draws 120 grid px wide.',
        'The Lens Grinder showed how to compute that scale: `canvas.width / cssContentWidth`.',
      ],
      source: 'Chrome docs, concepts.md (Convert CSS pixels to canvas grid coordinates)',
    },
  },
  {
    speaker: 'foe',
    text: 'I am the Crooked Reel. I feed your source rects grid pixels and your destinations CSS pixels, and your pictures come out half-size, double-size, and askew.',
  },
  {
    speaker: 'caret',
    text: 'A source rect crops. And because it is a rect of its own, it can also reach outside the border box, to catch a shadow or a glow that overflows it.',
    concept: {
      id: 'source-rect',
      title: 'Source rect: crop or outset',
      kind: 'idea',
      what: '`sx, sy, sw, sh` choose which part of the element’s snapshot to draw, relative to its border box.',
      body: [
        'Inside the border box, it clips. The README says the same parameters can apply outsets “to include ink overflow extending beyond the element’s border box”.',
        'So a negative `sx, sy` and a larger `sw, sh` should take in a glow or shadow. That reading is ours; check it in a real browser before relying on exact pixels.',
      ],
      code: '// the ticket plus its 10px glow\nctx.drawElementImage(ticket, -10, -10, 220, 120, 80, 30);',
      source: 'README.md, 4. drawElementImage; Chrome docs, 2d.md',
    },
  },
  {
    speaker: 'caret',
    text: 'The destination rect positions and scales. Give it a width and height and the picture stretches to fit, even if that squashes it.',
    concept: {
      id: 'dest-rect',
      title: 'Destination rect: position and scale',
      kind: 'idea',
      what: '`dx, dy` place the top-left corner; `dw, dh` (optional) set the drawn size, in canvas grid pixels.',
      body: ['Leave out `dw, dh` and you get the default size. Use a different aspect ratio and the snapshot stretches non-uniformly.'],
      code: '// fill the whole canvas with the poster\nctx.drawElementImage(poster, 0, 0, canvas.width, canvas.height);',
      source: 'README.md, 4. drawElementImage; Chrome docs, 2d.md',
    },
  },
  {
    speaker: 'caret',
    text: 'The context’s transform applies too. The official complex-text demo turns a whole paragraph of emoji, Persian and vertical Chinese by rotating the context first.',
    concept: {
      id: 'ctx-transforms',
      title: 'Context transforms apply',
      kind: 'rule',
      what: 'Whatever `ctx.translate`, `ctx.rotate` or `ctx.scale` set before the call moves the drawn element too.',
      body: [
        'Call `ctx.reset()` at the start of each paint so transforms do not pile up from frame to frame.',
        'The demo multiplies its offsets by `devicePixelRatio` because its grid is sized in device pixels.',
      ],
      code: 'canvas.onpaint = () => {\n  ctx.reset();\n  ctx.rotate((15 * Math.PI) / 180);\n  ctx.translate(80 * devicePixelRatio, -20 * devicePixelRatio);\n  ctx.drawElementImage(draw_element, 0, 0);\n};',
      source: 'Examples/complex-text.html',
    },
  },
  {
    speaker: 'caret',
    text: 'The pie chart demo uses both: it translates to the centre, then places each label at its wedge’s midpoint, converting the label’s CSS width to grid pixels first.',
    concept: {
      id: 'pie-labels',
      title: 'Placing by measurement',
      kind: 'idea',
      what: 'Measure the element in CSS px, convert to grid px, then compute `dx, dy` from it.',
      code: 'ctx.translate(canvas.width / 2, canvas.height / 2);\nconst label_width = label.offsetWidth * devicePixelRatio;\nconst label_height = label.offsetHeight * devicePixelRatio;\nconst x = Math.cos(mid) * radius * 0.60 - label_width / 2;\nconst y = Math.sin(mid) * radius * 0.60 - label_height / 2;\nctx.drawElementImage(label, x, y);',
      source: 'Examples/pie-chart.html',
    },
  },
  {
    speaker: 'caret',
    text: 'Two more slots. The first argument may be an `ElementImage` instead of an element, and the last may be an options object. The mirror maze will need that one.',
    concept: {
      id: 'draw-args',
      title: 'First and last arguments',
      kind: 'idea',
      what: 'The first argument is an `Element` or an `ElementImage`; every form ends with an optional `DrawElementImageOptions` dictionary.',
      body: [
        'An `ElementImage` comes from `canvas.captureElementImage(element)` and can be sent to a worker. The worker railway covers it.',
        'In 2D, drawing also updates the element’s geometry for hit testing. `{ preserveElementGeometry: true }` turns that off: that is a story for the mirror maze.',
      ],
      code: 'ctx.drawElementImage(targetElement, elementX, 200, { preserveElementGeometry: true });',
      source: 'README.md, IDL changes; Chrome docs, 2d.md (Manually update element geometry)',
    },
  },
  {
    speaker: 'caret',
    text: 'And the hall’s secret: a projector inside a projector. A drawable canvas can sit inside a drawable wrapper, inside another canvas. The inner one paints first.',
    concept: {
      id: 'nested-canvases',
      title: 'Nested canvases',
      kind: 'rule',
      what: 'With a `content="drawable"` canvas nested inside another, the inner canvas gets `paint` first, so the outer one draws its fresh pixels.',
      body: [
        'The inner listener draws its own child with its own context. The outer listener draws the wrapper, which contains the freshly painted inner canvas.',
      ],
      code: 'nestedCanvas.addEventListener("paint", () => {\n  nestedCtx.clearRect(0, 0, nestedCanvas.width, nestedCanvas.height);\n  nestedCtx.drawElementImage(nestedElement, 10, 10);\n});\nparentCanvas.addEventListener("paint", () => {\n  parentCtx.clearRect(0, 0, parentCanvas.width, parentCanvas.height);\n  parentCtx.drawElementImage(wrapperElement, 50, 50);\n});',
      source: 'Chrome docs, concepts.md (Nested canvases)',
    },
  },
  {
    speaker: 'foe',
    text: 'Fine words. But can you frame a picture by hand, number by number, with my reel jammed crooked?',
  },
  {
    speaker: 'caret',
    text: 'Lights down. Let’s run the projector.',
  },
];
