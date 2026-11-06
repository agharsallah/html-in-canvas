/**
 * The guide's content: every HTML-in-Canvas concept, grouped the way the
 * data flows (opt in → paint → draw → sync back → 3D → workers → care).
 *
 * Every fact here is backed by the WICG explainer (README) or the Chrome
 * developer docs, as audited in docs/research/01-file-map-and-concepts.md.
 * `backticks` in text become inline code.
 */
import type { ConceptKind } from '../chapters/shared/chapter';

export type FigureId =
  | 'content-attr' | 'drawable-attr' | 'nested'
  | 'paint-pipeline' | 'changed-elements' | 'request-paint' | 'next-frame' | 'reverse-order'
  | 'overloads' | 'ink-overflow' | 'units'
  | 'sync-geometry' | 'canvas-clip' | 'hit-order'
  | 'webgl' | 'workers' | 'accessibility' | 'read-back';

export interface GuideEntry {
  id: string;
  name: string;
  kind: ConceptKind;
  /** The one sentence to remember. */
  what: string;
  /** Short facts, one line each. */
  points: string[];
  code?: string;
  lang?: 'js' | 'html';
  source: string;
  figure?: FigureId;
}

export interface GuideGroup {
  id: string;
  title: string;
  /** A few words for the overview wall and the rail. */
  short: string;
  intro: string;
  entries: GuideEntry[];
}

export const GROUPS: readonly GuideGroup[] = [
  {
    id: 'opt-in',
    title: 'Opt in',
    short: 'Markup',
    intro: 'Two attributes decide what the canvas may draw. Nothing changes for existing pages until you add them.',
    entries: [
      {
        id: 'content-drawable', name: 'content="drawable"', kind: 'attribute',
        what: 'Opts the canvas\'s children into layout, so they can be snapshotted and drawn.',
        points: [
          'The default, `fallback`, keeps children as classic fallback content: never laid out, never drawn.',
          'Immediate children are blockified and laid out with static positioning.',
          'Any unknown value reads as `fallback`, so `canvas.content === "drawable"` is a usable check.',
          'Older builds used `layoutsubtree`; set both while the API settles.',
        ],
        code: '<canvas content="drawable" layoutsubtree>\n  <form drawable>…</form>\n</canvas>',
        lang: 'html', source: 'README · content attribute, IDL', figure: 'content-attr',
      },
      {
        id: 'drawable', name: 'drawable', kind: 'attribute',
        what: 'Marks a descendant as something you may draw. Each one is its own paint root.',
        points: [
          'Drawing an element without it throws.',
          'Implies `isolation: isolate`: blend modes never leak in or out.',
          'Is a containing block for all descendants, so absolute and fixed children stay inside the snapshot.',
          'Has no IDL property: use `toggleAttribute("drawable")`.',
        ],
        code: '<canvas content="drawable">\n  <div drawable>Drawn</div>\n  <div>Laid out, not drawable</div>\n</canvas>',
        lang: 'html', source: 'README · drawable attribute', figure: 'drawable-attr',
      },
      {
        id: 'nested-drawables', name: 'Nested drawables', kind: 'rule',
        what: 'A drawable subtree stops at drawable descendants: draw those with their own call.',
        points: [
          'The outer snapshot leaves the inner drawable out, but its space in the layout stays.',
          'Use it to give one word, or one widget, its own effect or position.',
          'The official nested-sparkles demo draws a poem, then the word "you" with sparkles behind it.',
        ],
        code: 'ctx.drawElementImage(poem, 0, 0);   // without "you"\nctx.drawElementImage(you, x, y);    // "you", on its own',
        lang: 'js', source: 'README · drawable subtree; Examples/nested-sparkles.html', figure: 'nested',
      },
    ],
  },
  {
    id: 'paint-loop',
    title: 'The paint loop',
    short: 'Paint',
    intro: 'The browser records a snapshot of every drawable each rendering update, then tells the canvas with one event.',
    entries: [
      {
        id: 'paint-event', name: 'paint', kind: 'event',
        what: 'Fires on the canvas once per rendering update, right after the browser\'s Paint step, when a drawable would look different.',
        points: [
          'Draw inside it and the canvas is in sync with the DOM in the same frame.',
          'Browsers may fire it with nothing changed, so keep handlers idempotent.',
          'Start every handler with `ctx.reset()`: each paint is a full redraw.',
        ],
        code: "canvas.addEventListener('paint', () => {\n  ctx.reset();\n  ctx.drawElementImage(form, 0, 0);\n});",
        lang: 'js', source: 'README · paint event; alternatives, option C', figure: 'paint-pipeline',
      },
      {
        id: 'changed-elements', name: 'changedElements', kind: 'property',
        what: 'The drawable descendants whose snapshot changed in this update.',
        points: [
          'A frozen array that returns the same object every read.',
          'Use it to re-upload only what changed, as the WebGL demo does with textures.',
          'It may be empty: never assume a paint means a change.',
        ],
        code: "canvas.onpaint = (event) => {\n  for (const el of event.changedElements) upload(el);\n};",
        lang: 'js', source: 'README · CanvasPaintEvent IDL', figure: 'changed-elements',
      },
      {
        id: 'request-paint', name: 'requestPaint()', kind: 'method',
        what: 'Asks for one `paint` event at the next rendering opportunity, even if nothing changed.',
        points: [
          'The canvas\'s `requestAnimationFrame`: call it inside the handler to animate.',
          'Call it once at start and after a resize, since resizing clears the canvas.',
          'Every request costs a full rendering update. Cap the rate when idle.',
        ],
        code: "canvas.onpaint = () => {\n  draw(performance.now());\n  canvas.requestPaint(); // keep going\n};\ncanvas.requestPaint();",
        lang: 'js', source: 'README · requestPaint()', figure: 'request-paint',
      },
      {
        id: 'next-frame', name: 'Canvas now, DOM next frame', kind: 'rule',
        what: 'Drawing in `paint` shows this frame. DOM changes made in `paint` show next frame.',
        points: [
          'The update\'s DOM is locked in before `paint` runs; the canvas is the one carve-out.',
          'A DOM edit in `paint` schedules another update, and another `paint` if a snapshot changes.',
          'Chosen over looping designs because WebGL calls that flush could deadlock on half-painted content.',
        ],
        code: "canvas.onpaint = () => {\n  ctx.drawElementImage(card, 0, 0); // this frame\n  card.textContent = 'Hi';          // next frame\n};",
        lang: 'js', source: 'README · paint event; alternatives A, B, C', figure: 'next-frame',
      },
      {
        id: 'reverse-order', name: 'Reverse tree order', kind: 'rule',
        what: '`paint` fires on inner canvases before outer ones, so descendants paint before ancestors.',
        points: [
          'Child frames before their parent document, reverse tree order within a document.',
          'An outer canvas can draw an inner canvas\'s fresh pixels in the same frame.',
        ],
        code: '<canvas id="outer" content="drawable">\n  <div drawable>\n    <canvas id="inner" content="drawable">…</canvas>\n  </div>\n</canvas>',
        lang: 'html', source: 'README · paint event; Chrome docs · nested canvases', figure: 'reverse-order',
      },
    ],
  },
  {
    id: 'drawing',
    title: 'Drawing in 2D',
    short: 'Draw',
    intro: 'One method, four overloads, mirroring drawImage. Positions are canvas grid pixels, so size the grid to the device.',
    entries: [
      {
        id: 'draw-element-image', name: 'drawElementImage()', kind: 'method',
        what: 'Draws an element\'s last snapshot into a 2D canvas, starting at its border box, before CSS transforms.',
        points: [
          'Overloads by argument count: 3, 5, 7 or 9 numbers, plus optional options.',
          'Throws for an element without `drawable`, before its first snapshot, or with another canvas ancestor.',
          'Takes an `Element` or an `ElementImage` (a captured snapshot).',
          'On both `CanvasRenderingContext2D` and `OffscreenCanvasRenderingContext2D`.',
        ],
        code: 'ctx.drawElementImage(el, dx, dy);\nctx.drawElementImage(el, dx, dy, dw, dh);\nctx.drawElementImage(el, sx, sy, sw, sh, dx, dy);\nctx.drawElementImage(el, sx, sy, sw, sh, dx, dy, dw, dh);',
        lang: 'js', source: 'README · drawElementImage IDL; Chrome docs · 2D', figure: 'overloads',
      },
      {
        id: 'source-rect', name: 'Source rect and ink overflow', kind: 'idea',
        what: 'The source rect crops the snapshot, or reaches past the border box to keep shadows and glows.',
        points: [
          'Inside the border box: a crop. Negative `sx`/`sy` or a bigger size: outsets that include ink overflow.',
          'By default only the border box is drawn, so a `box-shadow` is cut off.',
          'Source rects are CSS px; destination rects are canvas grid px.',
        ],
        code: '// keep a 20px glow around the card\nctx.drawElementImage(card, -20, -20, w + 40, h + 40, dx, dy);',
        lang: 'js', source: 'README · drawElementImage; Chrome docs · units table', figure: 'ink-overflow',
      },
      {
        id: 'units', name: 'Canvas grid vs CSS px', kind: 'idea',
        what: 'Size the canvas grid to device pixels, or every drawn element is resampled and blurry.',
        points: [
          'Observe `device-pixel-content-box`: it reports the exact physical pixels the canvas covers.',
          'Draw positions and sizes are canvas grid px. `canvasTransform`, `canvasClip` and source rects are CSS px.',
          'Resizing a canvas clears it: `requestPaint()` afterwards.',
        ],
        code: "new ResizeObserver(([e]) => {\n  const box = e.devicePixelContentBoxSize[0];\n  canvas.width = box.inlineSize;\n  canvas.height = box.blockSize;\n  canvas.requestPaint();\n}).observe(canvas, { box: 'device-pixel-content-box' });",
        lang: 'js', source: 'Chrome docs · sizing and units', figure: 'units',
      },
      {
        id: 'default-size', name: 'getElementImageDefaultSize()', kind: 'method',
        what: 'An element\'s natural size in canvas grid coordinates: what to allocate for a texture.',
        points: [
          'Values are doubles: round up with `Math.ceil` before allocating.',
          'Also on `OffscreenCanvas`, so a worker can size a destination from an `ElementImage`.',
        ],
        code: 'const { width, height } = canvas.getElementImageDefaultSize(el);',
        lang: 'js', source: 'README · IDL; Chrome docs · WebGL',
      },
    ],
  },
  {
    id: 'geometry',
    title: 'Geometry: canvas to DOM',
    short: 'Sync',
    intro: 'You can draw an element anywhere, so you tell the DOM where it went. Hit testing, focus rings and accessibility follow.',
    entries: [
      {
        id: 'update-geometry', name: 'updateElementGeometry()', kind: 'method',
        what: 'Tells the DOM where an element was drawn, so clicks, hovers and a11y bounds line up with the pixels.',
        points: [
          '`canvasTransform` maps the border box to its drawn place, in canvas CSS px. A full 4×4 matrix works, even in perspective.',
          'In 2D, `drawElementImage` calls it for you. WebGL and WebGPU must call it: only your shader knows where the texture went.',
          'Geometry never triggers a `paint`: it is interaction metadata only.',
          'Until an element has geometry, pointer events skip it.',
        ],
        code: 'canvas.updateElementGeometry(card, {\n  canvasTransform: new DOMMatrix(cardToCanvas),\n});',
        lang: 'js', source: 'README · synchronizing geometry; Examples/webGL.html', figure: 'sync-geometry',
      },
      {
        id: 'canvas-clip', name: 'canvasClip', kind: 'property',
        what: 'Limits hit testing to the part of the element you actually drew.',
        points: [
          'Evaluated in the coordinate space of `canvasTransform`.',
          'Use it with a cropping source rect, so the hidden part takes no clicks.',
          'Hit testing only; it never changes what is drawn.',
        ],
        code: 'canvas.updateElementGeometry(card, {\n  canvasTransform: m,\n  canvasClip: { x: 0, y: 0, width: 120, height: 80 },\n});',
        lang: 'js', source: 'README · UpdateElementGeometryOptions', figure: 'canvas-clip',
      },
      {
        id: 'hit-order', name: 'Hit-test order', kind: 'rule',
        what: 'The last element you update goes on top of the canvas\'s hit-test stack.',
        points: [
          'Hit testing goes straight from the canvas to each drawable, skipping intervening clips and transforms.',
          '`preserveHitTestOrder: true` keeps an element already in the stack where it is.',
          'For 3D, update far to near so the nearest element wins.',
        ],
        code: 'for (const el of farToNear) canvas.updateElementGeometry(el, { canvasTransform: m(el) });',
        lang: 'js', source: 'README · preserveHitTestOrder', figure: 'hit-order',
      },
      {
        id: 'preserve-geometry', name: 'preserveElementGeometry', kind: 'property',
        what: 'An option of `drawElementImage` that stops it from moving the element\'s DOM geometry.',
        points: [
          'Default `false`: every 2D draw also updates geometry from the arguments and the context transform.',
          'Set `true` for decorative copies (a reflection, a thumbnail) so clicks stay on the real one.',
        ],
        code: '// the reflection must not steal clicks\nctx.drawElementImage(card, x, y + h, { preserveElementGeometry: true });',
        lang: 'js', source: 'README · DrawElementImageOptions; Chrome docs · 2D',
      },
      {
        id: 'transform-queries', name: 'getElementTransform() · clearElementGeometry()', kind: 'method',
        what: 'Read back the transform you set, or take an element out of the canvas\'s geometry altogether.',
        points: [
          '`getElementTransform` returns an identity `DOMMatrix` when nothing is set. Main thread only.',
          '`clearElementGeometry` removes the hit-test entry, transform and clip, and marks the element offscreen for a11y.',
        ],
        code: 'canvas.getElementTransform(card);  // DOMMatrix\ncanvas.clearElementGeometry(card); // un-draw, keep in DOM',
        lang: 'js', source: 'README · IDL; Chrome docs · geometry',
      },
    ],
  },
  {
    id: 'gpu',
    title: '3D and the GPU',
    short: '3D',
    intro: 'WebGL and WebGPU copy snapshots into textures. Wrap HTML on anything, run shaders over it, and keep it clickable.',
    entries: [
      {
        id: 'tex-element', name: 'texElementSubImage2D()', kind: 'method',
        what: 'Uploads an element\'s snapshot into a region of a WebGL texture, like `texSubImage2D` for HTML.',
        points: [
          'Allocate first with `texImage2D(…, null)` at `getElementImageDefaultSize()`.',
          'Re-upload only elements in `changedElements`.',
          'Then call `updateElementGeometry` with your model-view-projection matrix, or clicks miss.',
          'Early builds named it `texElementImage2D`.',
        ],
        code: "canvas.onpaint = (e) => {\n  if (!e.changedElements.includes(card)) return;\n  gl.bindTexture(gl.TEXTURE_2D, tex);\n  gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, card);\n};",
        lang: 'js', source: 'README · WebGL IDL; Chrome docs · WebGL; Examples/webGL.html', figure: 'webgl',
      },
      {
        id: 'webgpu', name: 'drawElementImageToTexture()', kind: 'method',
        what: 'The WebGPU queue method that copies an element\'s snapshot into a `GPUTexture`.',
        points: [
          'The texture needs `COPY_DST` and `RENDER_ATTACHMENT` usage.',
          'Source rect: all four of `sourceX/Y/Width/Height`, or none.',
          'Manual geometry, as in WebGL.',
        ],
        code: 'device.queue.drawElementImageToTexture(\n  { source: el },\n  { texture, size: [w, h] },\n);',
        lang: 'js', source: 'README · WebGPU IDL; Chrome docs · WebGPU',
      },
    ],
  },
  {
    id: 'workers',
    title: 'Workers',
    short: 'Workers',
    intro: 'A worker has no DOM, so it gets snapshots instead of elements, and its geometry comes back in batches.',
    entries: [
      {
        id: 'element-image', name: 'captureElementImage() · ElementImage', kind: 'method',
        what: 'Captures a transferable snapshot you can post to a worker and draw into an `OffscreenCanvas`.',
        points: [
          'Capture inside `paint`, post with the transfer list, draw with `drawElementImage` in the worker.',
          '`ElementImage` lives on the window and in workers. Call `close()` when done.',
          'Only `ElementImage`s cross to workers: they have no `Element`s.',
        ],
        code: "canvas.onpaint = () => {\n  const img = canvas.captureElementImage(form);\n  worker.postMessage({ img }, [img]);\n};",
        lang: 'js', source: 'README · ElementImage; OffscreenCanvas example', figure: 'workers',
      },
      {
        id: 'geometry-batching', name: 'elementgeometryupdate', kind: 'event',
        what: 'Fires on the canvas once a batch of geometry updates from an `OffscreenCanvas` has been applied.',
        points: [
          'Worker updates queue up, a microtask batches them, a task applies them on the main thread at once.',
          'Like observers: no other task interleaves halfway through a batch.',
          '`event.elements` omits elements that no longer exist.',
        ],
        code: "canvas.onelementgeometryupdate = (e) => {\n  console.log(e.elements); // now hit-testable\n};",
        lang: 'js', source: 'README · OffscreenCanvas, ElementGeometryUpdateEvent',
      },
    ],
  },
  {
    id: 'care',
    title: 'Accessibility and privacy',
    short: 'Care',
    intro: 'Real HTML means real semantics, and it means the snapshot must never show what script could not already see.',
    entries: [
      {
        id: 'accessibility', name: 'Accessible by default', kind: 'idea',
        what: 'Drawable content is in the accessibility tree like any DOM, with geometry once you draw it.',
        points: [
          'Never-drawn drawables are reported without geometry, so tools can filter them.',
          'Hide content you no longer draw with `inert` or `aria-hidden="true"`, or remove it.',
          'The WebGL demo makes the face turned away `inert`.',
        ],
        code: "back.inert = facing === 'front';\nfront.inert = facing === 'back';",
        lang: 'js', source: 'README · accessibility; Examples/webGL.html', figure: 'accessibility',
      },
      {
        id: 'focus-rings', name: 'Focus rings and carets', kind: 'idea',
        what: 'Focus rings and carets are painted into the snapshot, so they show up with no extra work.',
        points: [
          'A caret blinks in a drawn `<input>`: caret blink rate is not sensitive.',
          '`ctx.drawFocusIfNeeded(path, el)` draws a ring on a custom shape, as the pie chart demo does.',
        ],
        code: 'ctx.drawElementImage(label, x, y);\nctx.drawFocusIfNeeded(wedgePath, label);',
        lang: 'js', source: 'README · accessibility; Examples/pie-chart.html',
      },
      {
        id: 'read-back', name: 'Read-back-allowed rendering', kind: 'rule',
        what: 'Snapshots and `paint` timing never reveal anything script couldn\'t already learn, so pixels are always safe to read back.',
        points: [
          'Left out: cross-origin images, iframes and CSS urls, tainted canvases, `:visited` styles, spelling markers, autofill previews, system colors, subpixel AA, media controls, IME UI.',
          'Kept: scrollbars and form controls, find-in-page markers, caret blink, `forced-colors`.',
          'Excluded from invalidation too, so `paint` can\'t be used as a timing side channel.',
        ],
        source: 'README · read-back-allowed rendering; security questionnaire', figure: 'read-back',
      },
      {
        id: 'feature-detect', name: 'Feature detection', kind: 'idea',
        what: 'Check the methods, keep a fallback, and the same markup works everywhere.',
        points: [
          'Shipped in Chrome 157. Elsewhere, drawable children are just fallback content.',
          'three.js, Babylon.js, PixiJS and PlayCanvas have HTML texture helpers.',
        ],
        code: "const supported =\n  'requestPaint' in HTMLCanvasElement.prototype &&\n  'drawElementImage' in CanvasRenderingContext2D.prototype;",
        lang: 'js', source: 'Chrome docs · fallback strategies, library support',
      },
    ],
  },
];

export const ENTRIES: readonly GuideEntry[] = GROUPS.flatMap((g) => g.entries);

export function groupOf(entryId: string): GuideGroup | undefined {
  return GROUPS.find((g) => g.entries.some((e) => e.id === entryId));
}

/** The whole API in one listing: the cheat sheet at the end of the page. */
export const CHEAT_SHEET = `<canvas id="c" content="drawable" layoutsubtree>
  <form id="form" drawable>
    <label>Name <input></label>
  </form>
</canvas>

<script>
const ctx = c.getContext('2d');

// 1. Keep the canvas grid on device pixels.
new ResizeObserver(([e]) => {
  const box = e.devicePixelContentBoxSize[0];
  c.width = box.inlineSize;
  c.height = box.blockSize;
  c.requestPaint();
}).observe(c, { box: 'device-pixel-content-box' });

// 2. Redraw on every paint. Geometry follows for free in 2D.
c.onpaint = () => {
  ctx.reset();
  ctx.rotate(0.1);
  ctx.drawElementImage(form, 100, 0);
};
</script>`;
