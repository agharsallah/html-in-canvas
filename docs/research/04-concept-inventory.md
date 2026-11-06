# Concept inventory for rolls 03-12: HTML-in-Canvas ("Drawable")

Method: I read every file in `docs-llm/` (README, questionnaire, all five Chrome pages, all five examples, the jelly slider's HTML-in-Canvas call sites). I re-read `rolls.ts`, the prologue, fog and bells story, exercises, trials and labs, `negatives.ts`, and `src/hic/*`. I checked the prior research notes against the sources. Nothing was run in a browser.

## 0. Legend and top findings

**Citation prefixes.** All paths are under `/Users/agharsallah/Desktop/git/html-in-canvas/docs-llm/`. I cite per-page line numbers and never cite `bundle.md`, which is a concatenated duplicate.

| Prefix | File |
|---|---|
| `R:` | `git-official-docs/README.md` (the WICG explainer) |
| `S:` | `git-official-docs/security-privacy-questionnaire.md` |
| `CC:` | `html-in-canvas-blogs/concepts.md` |
| `2D:` | `html-in-canvas-blogs/2d.md` |
| `GL:` | `html-in-canvas-blogs/webgl.md` |
| `GPU:` | `html-in-canvas-blogs/webgpu.md` |
| `IDX:` | `html-in-canvas-blogs/index.md` |
| `pie:` | `git-official-docs/Examples/pie-chart.html` |
| `ct:` | `git-official-docs/Examples/complex-text.html` |
| `ns:` | `git-official-docs/Examples/nested-sparkles.html` |
| `gl:` | `git-official-docs/Examples/webGL.html` |
| `gls:` | `git-official-docs/Examples/webGLSetup.js` |
| `jh:` | `git-official-docs/Examples/webgpu-jelly-slider/index.html` |
| `jm:` | `git-official-docs/Examples/webgpu-jelly-slider/src/index.ts` |

**Tags.** An untagged statement is stated by the cited source.
- `[I]` is my inference. Verify it natively before teaching it.
- `[X]` is general web-platform knowledge that is not in the corpus.
- `[OPEN]` means the docs are silent or contradict each other. Never score it in a trial.
- `[PROJ]` is a fact from this repo, not from `docs-llm`.

### Top findings

1. **Roll order differs from the brief.** `src/story/rolls.ts` now has `lens` = 03 and `projector` = 04, which is the swap the research plan recommended. Your brief and `docs/CONCEPTS.md` table (rows 03/04) still list projector first. I follow `rolls.ts`. The `CONCEPTS.md` table is stale.
2. **Unsupported claim in built chapters.** Fog says `drawElementImage` throws `InvalidStateError` (`fog exercises.ts:38`, `rules.ts:21,23`, `shared/lab-canvas.ts:123`). The docs say only "An exception is thrown" (R:37). The type is never given.
3. **Unsupported claim in the prologue.** `prologue/story.ts:41` says "Other browsers do not support it yet." The docs say only "it might not be supported in all browsers" (CC:426).
4. **Concepts in the docs that `rolls.ts` never lists** (full table in section 5):
   - `preserveElementGeometry`, `preserveHitTestOrder`, `getElementTransform`, `clearElementGeometry`.
   - `ElementImage.close()`, nested canvases, library support, fallback strategies.
   - Legacy names (`texElementImage2D`, `copyElementImageToTexture`, `style.transform`).
   - WebGL pre-allocation and `UNPACK_FLIP_Y_WEBGL`, WebGPU destination properties.
   - The units table, `box-sizing`, the rejected worker design.
5. **The docs contradict themselves in a few places** (section 7):
   - `getElementTransform` arity.
   - The CC:282 image alt text versus the CC:284 caption.
   - The `2D:75-89` snippet's variable names.
   - README paint-trigger wording versus Chrome's wording.

## 1. Verified spellings

| Thing | Exact name | Source | Do not write |
|---|---|---|---|
| 2D draw | `ctx.drawElementImage(...)` | R:171-195; 2D:36 | `drawElement`, `drawHTML` |
| WebGL upload | `gl.texElementSubImage2D(target, level, xoffset, yoffset, element, config?)` | R:211-215; GL:88-94 | `texElementImage2D` (legacy, see section 4, roll 06) |
| WebGPU upload | `device.queue.drawElementImageToTexture(source, destination)` | R:233-235; GPU:105 | `copyElementImageToTexture` (legacy, see section 4, roll 07) |
| Paint event | type `"paint"`, handler `onpaint`, class `CanvasPaintEvent`, field `event.changedElements` | R:113, R:238-247 | `changed`, `dirtyElements` |
| Request paint | `canvas.requestPaint()` | R:115 | none |
| Snapshot handle | `canvas.captureElementImage(element)` returns `ElementImage` | R:117, R:249-252 | none |
| Geometry | `canvas.updateElementGeometry(el, { canvasTransform, canvasClip, preserveHitTestOrder })` | R:85-101, R:119-122 | none |
| Clear geometry | `canvas.clearElementGeometry(el)` | R:124 | none |
| Read geometry | `canvas.getElementTransform(el)` returns `DOMMatrix` | R:126-130 | none |
| Default size | `canvas.getElementImageDefaultSize(el)` returns `{width, height}` | R:103-106, R:136-138 | none |
| 2D draw option | `{ preserveElementGeometry: true }` | R:162-168 | none |
| Worker geometry event | `canvas.onelementgeometryupdate`, event type `elementgeometryupdate`, class `ElementGeometryUpdateEvent`, field `event.elements` | R:132-134, R:254-265 | none |
| Attributes | `<canvas content="drawable">` plus `drawable` on children; legacy `layoutsubtree` | R:26-29; `ct:13-15` | none |
| WebGL config | dictionary `WebGLCopyElementImageConfig { sx, sy, swidth, sheight, width, height }` | R:201-208 | none |
| WebGPU dictionaries | `GPUDrawElementImageSource`, `GPUDrawElementImageDestination` | R:220-230 | none |
| Worker draw | `OffscreenCanvasRenderingContext2D` also has `drawElementImage` | R:198-199 | none |

**Return values.** All of these return `void`/`undefined`: `requestPaint`, `updateElementGeometry`, `clearElementGeometry`, `drawElementImage`, `texElementSubImage2D`, `drawElementImageToTexture`, `ElementImage.close()`.
- `captureElementImage` returns an `ElementImage`.
- `getElementTransform` returns a new `DOMMatrix`, and an identity matrix if no transform was set (R:126-129).
- `getElementImageDefaultSize` returns a dictionary of two doubles.

**Chrome version.** The Chrome docs say "The HTML-in-Canvas API shipped in Chrome 157" (CC:426, IDX:19). The README has no ship status (R:5-7). No page gives per-API version notes. `src/hic/types.ts:4` still says "ships behind a flag" `[PROJ]`, which is stale.

## 2. Units cheat sheet (CC:313-324)

| Value | Units |
|---|---|
| `canvas.width`, `canvas.height` | canvas grid px |
| 2D `dx, dy, dwidth, dheight` of `drawElementImage` | canvas grid px |
| `getElementImageDefaultSize()` width and height | canvas grid px |
| Source rects: `sx, sy, swidth, sheight` (2D and WebGL), `sourceX/Y/Width/Height` (WebGPU) | **CSS px** |
| Texture sizes: `width`, `height` of `texElementSubImage2D`; `size` of `drawElementImageToTexture` | texture px, default = element size in grid px, rounded up |
| `getElementTransform()`, `canvasTransform`, `canvasClip` | **CSS px** |
| `offsetWidth`, `clientWidth`, `getBoundingClientRect()`, pointer coords, RO `contentBoxSize` | CSS px |
| RO `devicePixelContentBoxSize` | device px |

**Cross-roll ordering rules**
- Canvas drawing inside `paint` lands this update. DOM changes inside `paint` land next update (R:32; CC:112-123; R:443).
- ResizeObserver runs before the `paint` event in the same rendering update (R:411-425 step list) `[I]`.
- Draw or upload from the `paint` event. A snapshot only exists after the first rendering update, and drawing before it throws (R:37).
- GL:80 says uploads can happen "inside your render loop or `paint` listener". The jelly keeps a rAF render loop and uploads in `onpaint` (`jm:773-800`).

**Exceptions.** Only one is documented: `drawElementImage` throws "with an element without the `drawable` attribute, before an initial snapshot has been recorded, or for elements with other canvas ancestors" (R:37).
- Exception types are never given.
- No page says whether the other APIs throw for the same reasons `[OPEN]`.

## 3. A note on the overload and option facts used below

`drawElementImage` takes `(Element or ElementImage)` as its first argument and `unrestricted double` numbers, with a trailing optional `DrawElementImageOptions` (R:170-196). `unrestricted double` means NaN and Infinity do not throw at the binding layer, as with `drawImage` `[X]`.

## 4. Roll by roll (current `rolls.ts` order)

### Roll 03: The lens grinder (Blur)
`rolls.ts` concepts: `device-pixel-content-box`, `devicePixelRatio`, `getElementImageDefaultSize()`.

**API facts**
1. **Three coordinate systems** (CC:260-267).
   - CSS px are for layout.
   - Device px = CSS px x `devicePixelRatio`.
   - The canvas grid is set by `width` and `height` attributes, "separate from both".
   - The browser snaps boxes, borders and layer offsets to whole device px, and anti-aliases glyphs, curves and transformed edges (CC:264-265).
2. **Why blur happens** (CC:269-280). Drawable HTML is laid out in CSS px, then goes CSS to grid and grid to device. Each non-1:1 step re-blends.
   - Fix: make the grid match the physical grid (CC:269-272, CC:280).
   - Worked example (CC:274): canvas element 360x180 CSS px, grid 300x150, DPR 1.5, so 540x270 device px. One canvas px = 1.2 CSS px = 1.8 device px. Fix = a 540x270 grid.
   - Second figure caption (CC:284): 400x200 CSS px at DPR 1.5; the fix grid is 600x300.
3. **Default grid is 300x150** (CC:274, image alt CC:282 "default 300 by 150 canvas grid"; `[X]` the standard canvas default).
4. **Always size the grid with a ResizeObserver on `device-pixel-content-box`.** Verbatim from CC:292-304:
```js
const observer = new ResizeObserver(([entry]) => {
  const dpc = entry.devicePixelContentBoxSize;
  canvas.width = dpc ? dpc[0].inlineSize : Math.round(entry.contentRect.width * window.devicePixelRatio);
  canvas.height = dpc ? dpc[0].blockSize : Math.round(entry.contentRect.height * window.devicePixelRatio);
});
const supportsDevicePixelContentBox =
  typeof ResizeObserverEntry !== 'undefined' &&
  'devicePixelContentBoxSize' in ResizeObserverEntry.prototype;
const options = supportsDevicePixelContentBox ? { box: 'device-pixel-content-box' } : {};
observer.observe(canvas, options);
```
   - The grid size "may change when the layout changes, when the user zooms the page, or when the user moves the window to a different display" (CC:288).
   - The README's Basic Example is unguarded: `entries[0].devicePixelContentBoxSize[0].inlineSize` (R:75-79). It throws where the box is unsupported.
   - `pie:87` passes `{box: ['device-pixel-content-box']}` (array form). It works only through string coercion `[I]`. Teach the string form.
5. **Units.** `devicePixelContentBoxSize` is device px. `contentBoxSize` and `contentRect` are CSS px (CC:323-324).
6. **Convert with scale factors, not just `devicePixelRatio`** (CC:326-356):
```js
scaleX = canvas.width / cssContentWidth;  scaleY = canvas.height / cssContentHeight;
```
   - The demos multiply by `devicePixelRatio` instead (`pie:67-68`, `ct:41`, `ns:54,86-90`). That is only equal when the grid is exactly device px.
   - Centering recipe (CC:364-376): `const width = card.offsetWidth * scaleX; const x = (canvas.width - width) / 2; ctx.drawElementImage(card, x, y);`
7. **`box-sizing: border-box`** (CC:379-388). The drawn rectangle is the border box, so use `border-box` or `width: 200px` plus padding draws wider than 200.
8. **`getElementImageDefaultSize`.**
   - Signature: `ElementImageDefaultSize getElementImageDefaultSize((Element or ElementImage) element)` (R:136-138).
   - The return dictionary is `{ double width; double height; }` (R:103-106).
   - It is "the default size of the element in canvas grid coordinates".
   - It also exists on `OffscreenCanvas` (R:157-159).
   - The Chrome docs use `Math.ceil(size.width)` to pre-allocate textures (GL:62-70; GPU:40-42).
   - The default 2D draw size is "the whole element at its default size" (2D:60).
   - The texture default is this value rounded up (CC:321).
9. **Assigning `canvas.width` or `canvas.height` clears the bitmap and resets context state** `[X]`.
   - Related: the README's worker example calls `canvas.requestPaint()` right after resizing (R:396).
   - The main-thread demos never do. In their startup order the RO precedes the first paint `[I]`.
   - After a later resize, call `requestPaint()` defensively. No source says this is required or unnecessary.

**Not settled `[OPEN]`**
- How the CSS-to-grid conversion for the default size is computed (README open question #15).
- Whether the default size includes ink overflow.
- What it returns before the first snapshot.
- CC:282 alt text says the right image is an 800x400 grid and the left is the default 300x150 grid. The CC:284 caption says left 400x200, right 600x300. For DPR 1.5 at 400x200 CSS px, 600x300 is the self-consistent number. Do not use 800x400.

**Gaps to park here:** the full units table, `border-box`, the scale recipe, "canvas.width clears the canvas", DPR change on zoom or monitor move, and `getElementImageDefaultSize` in a 2D context (no official demo uses it there).

**Lab and trial ideas**
- *Pixel microscope.* Reuse `complex-text.html`'s rotated rich text.
  - A grid-size dial offers three presets: 300x150 default, CSS size, and the `devicePixelContentBoxSize`.
  - A loupe shows the double anti-aliasing from CC:274.
  - Goal: make the loupe edge match a plain `<div>` next to it.
- *Unit Ledger sort* (the boss). Drop 10 values (`canvas.width`, `dx`, `sx`, `canvasTransform.e`, `offsetWidth`, `devicePixelContentBoxSize`, `getElementImageDefaultSize().width`, ...) into CSS, grid, device and texture bins using the table above.
- *Centering challenge.* Reproduce CC:364-376 centering at three simulated DPRs (1, 1.5, 2) with `scaleX` and `scaleY`. The `devicePixelRatio` shortcut fails when the grid is rounded.

### Roll 04: The projector hall (The Crooked Reel)
`rolls.ts` concepts: `drawElementImage()`, source and destination rects.

**API facts**
1. **Four overloads** (R:170-196; 2D:42-63):
```js
ctx.drawElementImage(targetElement, 100, 150);                       // (el, dx, dy, options?)
ctx.drawElementImage(targetElement, 100, 150, 180, 60);             // (el, dx, dy, dwidth, dheight, options?)
ctx.drawElementImage(targetElement, 0, 0, 90, 30, 100, 150);        // (el, sx, sy, swidth, sheight, dx, dy, options?)
ctx.drawElementImage(targetElement, 0, 0, 90, 30, 100, 150, 180, 60); // (el, sx, sy, swidth, sheight, dx, dy, dwidth, dheight, options?)
```
   - 2D:58-63 table: the first draws at default size, the second scales the whole element into a `dw x dh` box, and the third crops and draws "at that area's default size (the same scale as the default-size form)".
   - The fourth crops, then maps to the destination rect.
   - The options dictionary is the last argument, e.g. `ctx.drawElementImage(targetElement, elementX, 200, { preserveElementGeometry: true })` (2D:77).
2. **What is drawn.** "The rendering starts at the element's border box, before CSS transformations" (R:37). The element's own CSS `transform` is not what you draw.
   - Source-rect parameters "apply outsets to the drawn element, either for clipping or to include ink overflow extending beyond the element's border box" (R:37). Destination parameters "position and scale" it.
   - No official example uses the source rect `[OPEN]`.
   - Box-shadow, outline and glyph overhang lie outside the border box. The source rect is how to include them `[I]`.
   - `drawElementImage` draws the **last snapshot**, not the live DOM (R:37; R:32).
3. **Units.** Source rect = CSS px. Destination = canvas grid px (CC:318-320). Mixed in one call for the 7- and 9-argument forms.
4. **Context state applies.** Verbatim `ct:39-42`:
```js
ctx.reset();
ctx.rotate((15 * Math.PI) / 180);
ctx.translate(80 * devicePixelRatio, -20 * devicePixelRatio);
ctx.drawElementImage(draw_element, 0, 0);
```
   - `ctx.reset()` is called first in every handler (R:71; `ct:39`) so transforms do not accumulate across paints.
5. **Automatic geometry.** 2D `drawElementImage` calls `updateElementGeometry` for you with a transform mapping the border box to the drawn position (R:49, R:164-166). Details are in Roll 05.
6. **Exceptions** are in section 2 (R:37).
7. **Nested drawables** (R:29; CC:45-76; `ns:32-39`).
   - A drawable subtree is the element plus descendants, excluding `drawable` descendants and their subtrees (R:29).
   - Nested sparkles draws the poem, then the nested `<span id="sparkle" drawable>` on its own (`ns:47,61`):
```js
ctx.translate(canvas.width / 3, canvas.height / 5);
ctx.drawElementImage(poem, 0, 0);
...
ctx.drawElementImage(sparkle, rect.x, rect.y, rect.width, rect.height);
```
   - The translate at `ns:46` persists, so the nested draw lands on its own gap `[I]`.
   - `getInFlowRect` (`ns:69-91`) computes the span's offset relative to the nearest `[drawable], canvas`. It uses `convertRectFromNode(...).getBounds()` (GeometryUtils) when present, else a manual `offsetLeft`/`offsetTop` walk, then multiplies by `devicePixelRatio`.
   - The sparkle demo loops `canvas.requestPaint()` inside the handler (`ns:64`). It has **no** initial `requestPaint()`, unlike `ct:44` and `pie:80`.
8. **Nested canvases** (CC:125-187). An inner `<canvas content="drawable">` inside a `drawable` wrapper inside an outer canvas.
   - The inner canvas paints first, then the outer canvas draws the wrapper containing the freshly painted inner canvas.
   - Hmm: the inner element has two canvas ancestors but is drawn with the inner context (CC:160-164). So "other canvas ancestors" (R:37) cannot mean "any other canvas" `[OPEN]` (open question #6).
9. **Position at a wedge midpoint** (`pie:44-71`):
```js
ctx.translate(canvas.width / 2, canvas.height / 2);
const label_width = label.offsetWidth * devicePixelRatio;
const x = Math.cos(mid) * radius * 0.60 - label_width / 2;
ctx.drawElementImage(label, x, y);
```
10. **Which elements can be drawable.** The docs use `<form>` (R:59), `<div>`, `<span>` (`ns:37`), `<p>`, `<img>` and `<figcaption>` (R:325-326), `<input type=range>` (`jh:74`). Whether `drawable` may sit on grandchildren: yes, in `<figure><img drawable>` (R:323-328). Only "immediate descendants" are blockified (R:26).
11. **Rich-content showpiece** (`ct:16-32`): multi-line text, emoji, RTL, vertical `writing-mode: vertical-rl`, inline `<img>` (same-origin `wolf.jpg`), and inline SVG.

**Gaps to park here:** nested canvases (CC:125-187), the nested-drawable hole-and-fill pattern, `ctx.reset()`, source-rect outsets (CSS px), `border-box` origin, the options argument, and which elements may be drawable.

**Lab and trial ideas**
- *Overload projector.* Overlay a draggable source "gate" over `ct`'s text and a draggable destination frame on the canvas. The code panel rewrites itself into whichever of the four overloads fits, so the unit mix (CSS source, grid destination) is visible.
- *Sparkle forge* from `ns`. Toggle `drawable` on the `<span>`, move the draw call before or after the poem, and watch the hole and fill. Win: the word lands in its own gap under a shared `ctx.translate`.
- *Pie wedges.* Place each label at its wedge midpoint with `offsetWidth * scale`; crop labels to make badges.
- *Ink overflow hunt.* Add `text-shadow` or `box-shadow` to an element. Negative source-rect outsets recover it. Mark this `[I]` and verify natively first.
- *Nested canvas capstone.* Drag a hover state and watch the two paint events fire inner first (ties back to bells).

### Roll 05: The mirror maze (Ghost Clicks)
`rolls.ts` concepts: `updateElementGeometry()`, `canvasTransform`, `canvasClip`, hit-test order.

**API facts**
1. **Why geometry exists** (CC:210-221). The browser needs it for hit testing, layout queries such as `getBoundingClientRect()`, and assistive-tech bounds such as magnifiers.
   - Drawn children are "initially not hit testable" (R:26).
   - In 2D, "the arguments you pass to it, together with the element's computed style and the context's current transform, are enough" (CC:216).
   - In 3D "the browser can't determine the geometry" (CC:218; R:49).
2. **`updateElementGeometry`** (R:85-101, R:119-122):
```idl
void updateElementGeometry((Element or ElementImage) element, optional UpdateElementGeometryOptions options = {});
dictionary UpdateElementGeometryOptions {
  boolean preserveHitTestOrder = false;
  DOMRectInit canvasClip;        // hit-test clip, in the coordinate space of canvasTransform
  DOMMatrixInit canvasTransform; // maps the border box, before CSS transforms, to the canvas
};
```
   - Omitted `canvasClip` or `canvasTransform` keeps the pre-existing value (R:93-94, R:98-99).
   - `canvasTransform` and `canvasClip` are **not** used for rendering, so changing them does not fire `paint` (R:44-45).
   - Setting a transform makes the element's accessibility info include geometry (R:44).
3. **`canvasClip` is hit-test only** (R:45): "useful for cases where only a portion of an element is drawn". Units: CSS px (CC:322). Its coordinate space is "the coordinate space of the canvas element transform" (R:45) `[OPEN]`: element-local or canvas space (open question #16).
4. **Hit-test order** (R:43; R:86-90; CC:232-247).
   - The canvas keeps an ordered list of drawable descendants. Hit testing "proceeds straight from the canvas element to each descendant, skipping intervening clips and transforms" (R:43).
   - By default every geometry update "brings it to the top of the interaction stack (last drawn = topmost click target)" (CC:234).
   - `preserveHitTestOrder: true` means "If this is true and the element is already in the canvas's hit testing stack, do nothing. In all other cases, place the element at the top" (R:86-90).
   - So `true` is not "send to back" (R:86-90).
   - CC:238-241: `canvas.updateElementGeometry(backgroundElement, { canvasTransform: customTransform, preserveHitTestOrder: true })`.
5. **`clearElementGeometry`** (R:47, R:124; CC:249-256). "Un-draw an element without removing it from the DOM... resets the element's canvas transform and marks it as offscreen in the accessibility tree": `canvas.clearElementGeometry(childElement)`.
6. **`getElementTransform`** (R:126-130). Returns "the current transform applied to the Element to map its border box, before CSS transforms, to the canvas coordinate space, or an identity DOMMatrix if no transform has been set". It is updated by `updateElementGeometry` and cleared by `clearElementGeometry`. The IDL takes **one** argument.
   - The PixiJS snippet calls it with two (`app.canvas.getElementTransform(htmlElement, finalTransform)` then `htmlElement.style.transform = syncT.toString()`, IDX:116-119). Treat as a library behavior, not the README signature.
7. **`preserveElementGeometry`** (R:49; R:162-168; 2D:71-95):
```js
ctx.drawElementImage(targetElement, elementX, 200, { preserveElementGeometry: true });
const currentTransform = new DOMMatrix();
currentTransform.a = 1.5;          // scale X
currentTransform.e = x / scaleX;   // translate X: grid px -> CSS px
currentTransform.f = y / scaleY;
canvas.updateElementGeometry(targetElement, { canvasTransform: currentTransform });
```
   - Caption (2D:95): "geometry gets out of sync when `{ preserveElementGeometry: true }` is set".
   - The snippet's variables (`elementX` vs `x`, literal `200` vs `y`, hard-coded `a = 1.5`) do not line up. Treat it as illustrative, not runnable.
8. **Stale geometry caption** (CC:224): "When the code stops calling `updateElementGeometry()`, the browser no longer knows where the HTML elements on the 3D card are. The card keeps turning, but clicks still land where it used to be."
9. **`getBoundingClientRect()` reflects the canvas transform.** The README worker example comment says the form's rect "would include an x translation of 100" (R:385-388). That is literally true only at DPR 1, because 100 is grid px `[I]`.
10. **Pre-API workaround, "do not use".** `gl:175-177`: `visible_elmt.style.transform = canvas_transform.toString()`. Same at `jm:815-818`. The demos only fall back to it when `updateElementGeometry` is undefined.
11. **Geometry-less elements are reported to accessibility without bounds** (R:317; CC:392-399). That bridges to roll 09.

**Project dogfood `[PROJ]`.** `src/world/surfaces/native-surfaces.ts:111,125,128` sorts visible prints far to near and calls `updateElementGeometry` in that order, so the nearest print ends on top of the hit-test stack. It sends `{}` to "re-assert order only" and uses `canvasClip: EMPTY_CLIP` to disable off-screen prints. None of that is documented in `docs-llm`.

**Gaps to park here:** `preserveElementGeometry`, `preserveHitTestOrder`, `getElementTransform`, `clearElementGeometry` and the legacy `style.transform` relic. The first four are missing from `rolls.ts`.

**Lab and trial ideas**
- *Ghost hunt.* Draw a button that slides across the canvas with a "preserve geometry" switch. A click probe shows where the click landed against where it was drawn.
  - Overlay the rectangle from `getBoundingClientRect()` and the matrix from `getElementTransform()`.
  - This matches the `2D:95` video caption.
- *Stack of cards.* Overlap three drawables. Toggle `preserveHitTestOrder` and re-order geometry updates. The player predicts which one answers a click.
- *Half-drawn mask.* Draw only the top half of an element with a source rect, then add a matching `canvasClip` so the invisible half is not clickable.
- *Un-draw.* Call `clearElementGeometry` and show the element stays in the DOM, loses its hit area, and is marked offscreen.
- Pie-chart labels (`pie`) make a good clickable subject. Each label is auto-synced by plain 2D drawing.

### Roll 06: The orbit observatory (The Flat Earth Society)
`rolls.ts` concepts: `texElementSubImage2D()`, 3D hit testing.

**API facts**
1. **Signature** (R:210-216):
```idl
void texElementSubImage2D(GLenum target, GLint level, GLint xoffset, GLint yoffset, (Element or ElementImage) element, optional WebGLCopyElementImageConfig config = {});
dictionary WebGLCopyElementImageConfig { GLfloat sx, sy, swidth, sheight; GLsizei width, height; };
```
   - Declared on `WebGLRenderingContext` only (R:210). The demos use `getContext('webgl2')` (`gl:269`).
   - Config units: the `sx` family is CSS px, `width` and `height` are texture px (CC:320-321).
   - The default texture size is the element's grid size rounded up (CC:321).
2. **Pre-allocate storage first**, because the upload is a *sub*-image (GL:31-37, GL:35 "fast sub-image updates without triggering expensive GPU memory re-allocations"). Allocate once, "or whenever the element changes size" (GL:63-64):
```js
const { width, height } = canvas.getElementImageDefaultSize(myElement);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, Math.ceil(width), Math.ceil(height), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
```
   - `gl.RGBA8` as an internal format needs a WebGL2 context `[X]`.
   - The official demo re-allocates on every upload and passes unrounded sizes (`gl:201-212`).
3. **Upload inside the paint listener** (GL:83-98): `gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, myElement)`. Bind the texture first (GL:109; `gl:196`).
4. **Texture setup** (`gl:182-192`): `TEXTURE_MIN_FILTER LINEAR`, `WRAP_S/T CLAMP_TO_EDGE`. The comment at `gl:186` says "Linear texture filtering produces better results than mipmap with text."
   - `gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)` is set once (`gl:327-328`) with the comment "Flip image pixels into the bottom-to-top order that WebGL expects."
   - Whether that flag governs element uploads is not stated `[OPEN]`.
5. **Upload only what changed** (`gl:351-369`). Gate on `event.changedElements` identity, and also on a pending language change (`langId !== lastLangId`). `changedElements` alone is not enough when you switch which element is displayed.
6. **3D must call `updateElementGeometry`.** "3D contexts must call `updateElementGeometry` because, unlike 2D contexts, the transform from the element's drawn location in a texture to the canvas's CSS coordinates is not available in the canvas API" (R:49). The docs' recipe order (GL:106-133): upload, draw the scene, build a CSS-px `DOMMatrix`, `updateElementGeometry`:
```js
canvasTransform.a = canvas.clientWidth / myElement.offsetWidth;  // scale X
canvasTransform.d = canvas.clientHeight / myElement.offsetHeight;
canvasTransform.e = 50; canvasTransform.f = 100;                 // CSS px
canvas.updateElementGeometry(myElement, { canvasTransform });
```
7. **The official flip card** (`gl:60-83`, `gl:96-139`, `gl:141-179`): a 2x2x0.2 card, a `#choice` front face and four translated message faces.
   - `inert` is toggled on the face turned away (`gl:108-128`; markup `gl:68,72,76,80`). It switches at flip start, so interactivity changes before the visuals do.
   - The geometry matrix **ignores rotation**: "this include the model translation but not the rotation, because for the purposes of calculating the CanvasTransform for DOM content we do not want it" (`gls:189-192`).
   - Its Y mapping omits the flip and works only because the card is centered `[I]` (prior research 02 sect. 5.5).
   - `gl:171-178` feature-detects with `canvas.updateElementGeometry !== undefined`.
8. **Legacy `texElementImage2D`** (`gl:213-231`). A try/catch fallback to the older name, with the comment "The texElementImage2D API was recently changed (see: https://github.com/WICG/html-in-canvas#idl-changes)":
```js
gl.texElementImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, destType, element); // gl:221-222
gl.texElementImage2D(gl.TEXTURE_2D, internalFormat, element);                             // gl:228
```
   The old form allocated storage itself. The new one needs `texImage2D(..., null)` first.
9. **Libraries.** `THREE.HTMLTexture` (IDX:44-55; README demo at R:287) and `BABYLON.HtmlTexture` (IDX:76-96):
```js
material.map = new THREE.HTMLTexture(uiElement);
const htmlTexture = new BABYLON.HtmlTexture("htmlTexture", uiElement, scene);
```
   `[PROJ]` The project's own notes say three r187's `HTMLTexture` only uses the legacy upload and overwrites `canvas.onpaint`. That is not in `docs-llm`.

**Not settled `[OPEN]`:** perspective (non-affine) hit testing is documented nowhere (`DOMMatrixInit` can be 4x4). `[PROJ]` The team verified in Chrome 157 that `elementFromPoint` on a tilted print returns the right button (`docs/CONCEPTS.md:289`). Treat it as project-verified. The affine form is the one the docs show.

**Gaps to park here:** `WebGLCopyElementImageConfig`, pre-allocation, `UNPACK_FLIP_Y_WEBGL`, texture filtering, upload gating, legacy `texElementImage2D`, library support (three.js, Babylon), per-context feature detection (`typeof gl.texElementSubImage2D === 'function'`, `[I]`), and the `changedElements`-plus-pending-state pattern.

**Lab and trial ideas**
- *Spin the globe.* Wrap a live form around a sphere or card. A click probe prints `document.elementFromPoint` against the intended target. A "derive the matrix" step moves from the demo's unrotated rect to a full projective matrix (the `[PROJ]` approach in `projective-geometry.ts`).
- *Card forge* (from the flip card). Toggles: apply Y-flip, `UNPACK_FLIP_Y_WEBGL`, LINEAR vs mipmaps, update geometry every frame, `inert` on the hidden face.
- *Click the moving card.* Randomize placement and tilt, and win only if scripted clicks at projected button centers reach the right elements.
- *Guild hall.* Cards for three.js and Babylon, labelled "wrapper libraries, behavior may differ from the README".

### Roll 07: The GPU foundry (The Melt)
`rolls.ts` concepts: `drawElementImageToTexture()`, shaders over HTML.

**API facts**
1. **Signature** (R:218-236; GPU:61-107):
```idl
partial interface GPUQueue { void drawElementImageToTexture(GPUDrawElementImageSource source, GPUDrawElementImageDestination destination); };
dictionary GPUDrawElementImageSource { required (Element or ElementImage) source; float sourceX, sourceY, sourceWidth, sourceHeight; };
dictionary GPUDrawElementImageDestination : GPUImageCopyTextureTagged { GPUExtent3D size; };
```
   - README comment (R:218-219): `GPUImageCopyTextureTagged` extends `GPUTexelCopyTextureInfo`, which has a required `GPUTexture texture`.
2. **Source properties** (GPU:65-71). `source` is required. `sourceX/Y/Width/Height` are optional, "all four or none", CSS px.
3. **Destination properties** (GPU:75-83).

| Property | Default | Note |
|---|---|---|
| `texture` | required | the pre-allocated `GPUTexture` |
| `size` | element default size | "width and height (in physical texture pixels...) to scale and rasterize the element within the destination texture" (GPU:78) |
| `origin` | `[0,0,0]` | |
| `mipLevel` | `0` | |
| `aspect` | `"all"` | |
| `colorSpace` | `"srgb"` | |
| `premultipliedAlpha` | `false` | |

4. **Texture creation** (GPU:35-56). Usage flags are required and the format is fixed in the example:
```js
const myTexture = device.createTexture({
  size: { width: myElementWidth, height: myElementHeight, depthOrArrayLayers: 1 }, // depth optional, default 1
  format: "rgba8unorm",
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
});
```
   - Size comes from `Math.ceil(canvas.getElementImageDefaultSize(myElement).width)` (GPU:40-42).
   - `const context = canvas.getContext("webgpu")` (GPU:36).
5. **Upload inside the `paint` event** (GPU:87-107):
```js
device.queue.drawElementImageToTexture({ source: myElement, sourceX: 0, sourceY: 0, sourceWidth: myElement.offsetWidth, sourceHeight: myElement.offsetHeight },
  { texture: myTexture, size: { width: myElementWidth, height: myElementHeight } });
```
6. **Geometry** (GPU:109-127): the same manual `updateElementGeometry` with `new DOMMatrix().translate(x, y)`, converting grid px to CSS px by dividing by `scaleX` and `scaleY`.
7. **Jelly slider design lesson** (`jh`, `jm`). Treat it as the roll's story.
   - The real `<input type="range">` is invisible (`jh:17` `opacity: 0`) and is never drawn. It only gets geometry (`jm:811-814`).
   - Only the `#value` readout div (`jh:75`, `inert="true"`) is drawn into a texture (`jm:773-784`) with `size` set to the whole canvas (`jm:775-779`).
   - The `input` event calls `requestPaint()` (`jm:103-108`).
   - Theme crosses via `getComputedStyle(sliderElement)` into uniforms (`jm:927-934`), refreshed on focus, blur and media-query changes (`jm:936-941`).
   - Motion and transparency are gated by `prefers-reduced-motion` and `prefers-reduced-transparency` (`jm:885-908`). Forced colors and contrast are handled in CSS (`jh:36-59`).
   - The hit rect is a hand-tuned translate with a `TODO(pdr)` (`jm:802-818`).
8. **Legacy `copyElementImageToTexture`** (`jm:781-798`), comment "recently changed to take two maps":
```js
queue.copyElementImageToTexture({source}, { destination: { texture }, width, height });  // jm:786-790
queue.copyElementImageToTexture(valueElement, width, height, { texture });             // jm:796-797
```
9. **Use case this serves:** CSS offers a limited set of effects (filter, backdrop-filter, mix-blend-mode) and people want general shaders (R:17; GL:15).

**Not settled `[OPEN]`:** how the call is ordered against other queue work, and the premultiplied-alpha interaction. No exception types.

**Gaps to park here:** the destination table, `size` scaling, texture usage flags, legacy `copyElementImageToTexture`, the "invisible real input" design pattern, reduced-motion and forced-colors handling, and per-context detection (`'drawElementImageToTexture' in GPUQueue.prototype`).

**Lab and trial ideas**
- *Jelly slider spin-off.* An invisible `<input type=range>`, a drawn readout, and a shader preset picker (ripple, melt, chromatic aberration, CRT) over live HTML. Tab and arrow keys still work. Win: the page stays operable with the shader off, reduced motion on, and forced colors on.
- *Scale dial.* Slide the destination `size` against the element's natural size to show it "scales and rasterizes". Add sub-rect crop with `sourceX..sourceHeight`.
- *Theme through JS, not pixels.* Edit `--jelly-color` and `caret-color` and watch uniforms update.

### Roll 08: The worker railway (The Late Train)
`rolls.ts` concepts: `OffscreenCanvas`, `captureElementImage()`, `elementgeometryupdate`.

**API facts**
1. **Capture and transfer** (R:39; R:117; R:249-252):
```idl
ElementImage captureElementImage(Element element);   // on HTMLCanvasElement
[Exposed=(Window,Worker), Transferable] interface ElementImage { undefined close(); };
```
   - It is the most recent snapshot.
   - `(Element or ElementImage)` is accepted by `drawElementImage`, `texElementSubImage2D`, `drawElementImageToTexture`, `updateElementGeometry`, `clearElementGeometry` and `getElementImageDefaultSize`.
   - `close()` has no documented semantics `[OPEN]`. The Album card says "Close it when done" `[PROJ]`, which is a reasonable `[I]`.
2. **The README worker example** (R:342-399). The main thread hands over the canvas, captures on each paint, and transfers:
```js
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);
canvas.onpaint = () => { const formImg = canvas.captureElementImage(form); worker.postMessage({ form: formImg }, [ formImg ]); };
```
   In the worker (R:361-371): `ctx = e.data.canvas.getContext('2d')` then `ctx.reset(); ctx.drawElementImage(e.data.form, 100, 0);`.
   - The worker sets `ctx.canvas.width` and `height` from posted values (R:362-365).
   - The main thread posts `entry.contentRect.width * devicePixelRatio` and then calls `canvas.requestPaint()` (R:391-397).
3. **`CanvasPaintEvent` is `[Exposed=Window]`** (R:238). A worker cannot listen for `paint`. The main thread captures and posts.
4. **`OffscreenCanvas` geometry** (R:141-160): `updateElementGeometry`, `clearElementGeometry` and `getElementImageDefaultSize` all exist there. "When called from a worker thread, only `ElementImage` may be passed" (R:143-144).
5. **Batching** (R:51).
   - On a worker there is no synchronous DOM access. Updates go into an internal pending notification queue, and a microtask batches them. On a worker that microtask asynchronously posts a task to the main thread.
   - Main-thread `OffscreenCanvas` updates are also batched via a microtask.
   - When main-thread updates finish, the elements synchronously apply geometry, and `elementgeometryupdate` fires on the associated `HTMLCanvasElement` with the updated elements. Elements that no longer exist are omitted.
   - The reason given: this is like the observer APIs and updates apply atomically.
6. **The event** (R:132-134, R:254-265):
```idl
attribute EventHandler onelementgeometryupdate;
[Exposed=Window] interface ElementGeometryUpdateEvent : Event { constructor(DOMString type, optional ElementGeometryUpdateEventInit eventInitDict = {}); [SameObject] readonly attribute FrozenArray<Element> elements; };
```
   - README comment (R:385-388): "#form's canvas element transform would now be updated. For example, form.getBoundingClientRect() would include an x translation of 100."
7. **Rejected cousin.** A design that sends drawable snapshots to workers for threaded scroll and animation (R:445-447). It needs synchronous script on scroll and animation updates, which is hard for restricted-process architectures. See Roll 11.

**Not settled `[OPEN]`:** capture preconditions, snapshot lifetime, what drawing a closed `ElementImage` does, whether the event fires for main-thread calls, and whether batches coalesce (open questions #9, #24).

**Gaps to park here:** `transferControlToOffscreen`, the `ElementImage` union-type rule, `close()`, microtask batching, why paint stays on the main thread, and `OffscreenCanvasRenderingContext2D.drawElementImage`.

**Lab and trial ideas**
- *Station timetable.* An animated timeline of paint, `captureElementImage`, `postMessage`, worker draw, microtask batch, post to main, `elementgeometryupdate`. Dragging the "main thread busy" slider delays only the last steps.
- *Stale reading.* Read `getBoundingClientRect()` immediately versus inside `onelementgeometryupdate`. The player sees the old value until the event.
- *Cargo crates.* Every paint ships a new `ElementImage`. The transfer list moves ownership. Reusing a sent crate on the main thread is the failure state, which is standard transfer semantics `[X]`.
- Win condition: make the worker-drawn form clickable and prove it with a click probe after the event.

### Roll 09: The lighthouse of voices (Silence)
`rolls.ts` concepts: accessibility tree, `inert`, focus rings, `drawFocusIfNeeded()`.

**API facts**
1. **Accessible like DOM** (R:26, R:317; CC:392). Drawable content is in the accessibility tree unless hidden with `aria-hidden="true"`, `inert`, etc.
2. **The geometry exception** (R:317; CC:394-399). A drawable has no rendered geometry if it was never drawn with `drawElementImage()` (which updates geometry by default) and never given `updateElementGeometry()`. It and its drawable subtree are then reported without geometry. "This is helpful... to let screen readers access the semantic content, while signaling visual assistive tools (like magnifiers) to filter out the undrawn elements" (CC:399).
   - `clearElementGeometry` marks the element offscreen in the accessibility tree (CC:251).
3. **Remove or hide stale views.** The README says unused canvas descendants "should be removed from the DOM or hidden using accessibility primitives like `aria-hidden="true"`" (R:317). The flip card toggles `inert` (`gl:108-128`).
4. **Focus and carets are painted.** "Accessibility indicators such as focus or carets will be rendered with `drawElementImage` (and similar WebGL/WebGPU APIs)" (R:319). Focus-state changes put the element in `changedElements` (CC:93).
5. **Figure example** (R:323-339; CC:404-421). The `<figure>` is not drawable; its `<img drawable>` and `<figcaption drawable>` are drawn separately:
```js
ctx.drawElementImage(image, 0, 0);
ctx.drawElementImage(caption, 0, 200);
// "Because preserveElementGeometry defaults to false, the drawElementImage call automatically updates geometry"
```
6. **Pie chart** (`pie:24-31,62-63,76-78`). `role="list" aria-label="Pie Chart"` on the canvas, `role="listitem" tabindex="0"` on each drawable label, then:
```js
if (document.activeElement === label) focusedPath = path;
...
if (focusedPath) ctx.drawFocusIfNeeded(focusedPath, document.activeElement);
```
   - The ring is drawn on top, after all wedges, since it is custom canvas art.
   - `drawFocusIfNeeded(path, element)` is the standard 2D API `[X]`. It is not described in any `docs-llm` page.
7. **Jelly** keeps the real input accessible while invisible (`jh:17`), uses `inert` on the readout (`jh:75`), and expresses focus as a color change in the shader (`jh:27-29`).

**Not settled `[OPEN]`:** which platform accessibility API property represents "no geometry", whether geometry-less content is keyboard-focusable, and IME or caret placement without geometry (open questions #32, #33).

**Gaps to park here:** `aria-hidden` versus `inert` for stale views, canvas `role` and `aria-label`, `tabindex`, what counts as a changed element for focus, `drawFocusIfNeeded`, and forced-colors and `prefers-*` handling from the jelly.

**Lab and trial ideas**
- *Screen-reader mirror.* A panel lists accessibility-tree nodes for the lab canvas, each marked with or without bounds. Step through drawn, undrawn, `clearElementGeometry`, `inert` and `aria-hidden`.
- *Tab walker pie.* Tab through wedge labels and watch `paint` fire on each focus change, with a custom ring drawn by `drawFocusIfNeeded`.
- *Flip card silence.* Remove the `inert` swap and show the hidden face still reachable.
- Boss: fix the hub's own 12 "Undeveloped" headings `[PROJ]` (`docs/CONCEPTS.md` section 8).

### Roll 10: The vault (The Leak)
`rolls.ts` concepts: read-back-allowed rendering, sensitive information.

**API facts**
1. **The principle** (R:295). The draw methods and the `paint` event "must not reveal any security- or privacy-sensitive information that isn't otherwise observable to author code". The name comes from the fact that read-back is "always possible with WebGL and WebGPU".
2. **Two channels** (R:297): painting (pixel readback, timing attacks) and invalidation (`onpaint`). Both are blocked by excluding sensitive information (S:15).
3. **Sensitive list, verbatim in substance** (R:299-307):
   - Cross-origin data in embedded content (`<iframe>`, `<img>`), `<url>` references (`background-image`, `clip-path`), `<canvas>` tainted with cross-origin data, and SVG (`<use>`, `<pattern>`, `<feImage>`). "Same-origin iframes would still paint, but cross-origin content in them would not" (R:300).
   - System colors, themes or preferences.
   - Spelling and grammar markers.
   - Visited link information.
   - Pending form autofill information not otherwise available to JavaScript.
   - Subpixel text anti-aliasing.
   - Captions and video controls.
   - IME pop-ups and distinctive IME text formatting.
4. **Not sensitive** (R:309-313): search text (find-in-page) and text-fragment markers; scrollbar and form element appearance (already detectable through `foreignObject` in Blink and WebKit); caret blink rate; `forced-colors`.
5. **Questionnaire** (S):
   - Q1 (S:4): reveals "form control rendering, scrollbar rendering, text selection, find-in-page selection, and the caret blink rate (all without revealing OS theme colors)".
   - Q3 (S:15): cross-origin, visited-link, spellcheck and autofill information "must not be painted"; disabling it also stops the invalidation leak.
   - Q5 (S:21-24): no new persistent state.
   - Q6 (S:29): platform information such as autofill is hidden. Caret blink rate is revealed.
   - Q8-Q13: no sending data to the platform, no sensors, no new script loading, no other devices, no native UI control, no temporary identifiers.
   - Q14-Q15: no first-party or third-party difference, no private-mode difference.
   - Q16 (S:72): normative text lives in WHATWG HTML PR 12554.
   - Q17: no downgrade of default protections.
   - Q18 (S:79-82): works only in fully active documents.
   - The file numbers its items 01-06, then 8-19 (no 7).
6. **Jelly lesson** (`jm:927-934`; `jh:17,60-68`). Drawn DOM is plain white text with no media-query dependence. Theme travels through `matchMedia` and `getComputedStyle`, which are already author-visible, never through the painted snapshot. The README does not state this rule. The jelly's design is consistent with it `[I]`.
7. **Media export** is a listed use case (R:19) but no mechanism is documented `[OPEN]`. Treat it as a "why read-back-safe pixels may leave the canvas" story, not a recipe.

**Not settled `[OPEN]`:** what replaces excluded content, whether `changedElements` stays silent for those changes, README versus questionnaire list mismatches (text selection only in the questionnaire, text-fragment markers only in the README), and the system-colors versus `forced-colors` boundary (open questions #26-#28).

**Gaps to park here:** the full sensitive and non-sensitive lists, same-origin iframe nuance, the questionnaire answers, fully-active-only, text selection and find-in-page, caret blink rate as a deliberate exposure, and media export (hedged).

**Lab and trial ideas**
- *Redaction table.* Drop in a cross-origin image, a same-origin image, a visited link, a spellcheck squiggle, an autofill field, video captions and a find-in-page highlight. See which survive the snapshot. In simulation mode label this as modeled, since `[I]` the fallback cannot reproduce the real browser's exclusions.
- *Spy canvas.* A script tries to detect a visited link through pixels, then through `paint` timing. Both are blocked, showing the two channels.
- *Sort the lists.* 17 items into sensitive and not sensitive, using only unambiguous entries from R:300-313. Keep the open-question items as unscored discussion slots.

### Roll 11: The clockwork heart (The Deadlock)
`rolls.ts` concepts: update the rendering, paint timing options A, B, C.

**API and spec facts**
1. **Where `paint` fires.** "just after intersection observer steps have run during update-the-rendering" (R:32).
2. **The candidate points** (R:405-425):
   - 14. Run animation frame callbacks.
   - 16.2.1. Recalculate styles and update layout.
   - 16.2.6. Deliver resize observers, looping back to 16.2.1 if needed.
   - *Option A:* fire `paint` at resize observer timing, looping back to 16.2.1 if needed.
   - 19. Run the update intersection observations steps.
   - Paint (not an explicitly named step, R:417).
   - *Option B:* fire `paint` immediately after Paint, looping back to 16.2.1 if needed.
   - *Option C:* fire `paint` immediately after Paint.
   - Commit / thread handoff (not an explicitly named step, R:423).
3. **Vocabulary.** The `paint` event is new on canvas. The Paint step is the existing operation that records painted output following paint order (R:425). Use "paint event" or "bell" for the first and a capital P for the second.
4. **Option A** (R:427-433). It needs a looping approach for DOM changes made in the handler, and the loop condition is broader than ResizeObserver's (for example background style changes). The canvas code may run multiple times per update.
   - Sub-option 1: do a synchronous Paint, which may be expensive and hard in Gecko ("unique implementation challenges in Gecko, and possibly other engines", R:431).
   - Sub-option 2: record placeholders (see the linked design doc) and fill them at the next Paint. `getImageData` would show blank or stale data. WebGL APIs like `getError()` require flushing, so "calling any of these APIs would result in a deadlock or inconsistent rendering" (R:433).
   - Conclusion: run `paint` when the complete painted display list is already available.
5. **Option B** (R:435-439). Same looping downsides, but no partial Paint of drawable elements. More update steps repeat on each loop iteration.
6. **Option C, selected** (R:441-443). One `paint` per rendering update. "Before `paint` runs we have locked in the contents of the rendering update, except for one intentional carve-out: the drawn content of the canvas. DOM invalidations that may occur in the `paint` event apply to the subsequent rendering update."
7. **Reverse order** (R:32): "`paint` events fire in reverse document order (child frames before their parent documents), and in reverse tree order within each document", so descendants paint before ancestors.
8. **Rejected: worker snapshots for threaded effects** (R:445-447). It would render the latest snapshots in an `OffscreenCanvas` on scroll and animation updates, but it needs synchronous script on those updates. That is difficult for architectures that perform threaded scroll in a restricted process.
9. **Step numbers** (14, 16.2.1, 16.2.6, 19) pin to some version of the HTML spec `[I]`. Hide them behind an "as numbered in the explainer" label.

**Gaps to park here:** nested-canvas reasoning (why reverse order), the placeholder-and-flush deadlock argument, why a looping design is risky, and the rejected worker design.

**Lab and trial ideas**
- *Rendering update clock.* A seven-step wheel where the learner picks Option A, B or C and watches which steps re-run. A counter shows how many times the canvas handler runs per update (A and B can loop, C once).
- *Deadlock demo.* Under Option A with placeholders, calling a flush-requiring WebGL API shows a "deadlock" state, mirroring R:433.
- *Echo mini-boss.* A handler that edits the DOM every paint. Under Option C it simply lands next update. Under A or B it forces a loop.
- *Road not taken.* A one-card story about the worker-thread design and why it was rejected.

### Roll 12: The endless reel (The future)
`rolls.ts` concepts: auto-updating canvas, threaded effects.

**Facts**
1. **Future auto-updating canvas** (R:449-453): "`drawElementImage` records a placeholder representing the latest rendering. Canvas retains a command buffer which can be automatically replayed following every scroll or animation update... without needing to block on script." It "is viable for 2D contexts, and may be viable for WebGPU with some small API additions". WebGL is not listed, which fits the flush argument in R:433 `[I]`. The README says "we are considering" it, so keep it clearly speculative (R:451).
2. **Fallback strategies** (CC:424-443):
```js
export function supportsHtmlInCanvas() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('content', 'drawable');
  return canvas.content === 'drawable';
}
```
   Alternatives: an alternative UI, floating HTML overlays (the webglfundamentals text-and-HTML lesson), the `three-html-render` library, `html2canvas`, `dom-to-image`.
3. **Library support** (IDX:40-125).
   - `THREE.HTMLTexture(uiElement)`.
   - PlayCanvas: `htmlTexture.setSource(htmlElement)` inside a `{ once: true }` paint listener, plus `canvas.requestPaint()`.
   - `BABYLON.HtmlTexture`.
   - PixiJS `HTMLSource({ resource: form, autoUpdate: true })` from `pixi.js/html-source`, shipped in v8.19.0. The element is appended as a direct child of the Pixi canvas.
   - CanvasUI (IDX:123-125).
4. **Ecosystem and process.** The Chrome blog link (IDX:19), the community demo collection (IDX:139, CC:452), "Modern Web Guidance" for coding agents (IDX:28, 127-129), the GitHub issue tracker. Status: a living explainer (R:5-7). Eight listed authors (R:459-468).
5. **Media export** (R:19) with no mechanism. Hedge it.

**Gaps to park here:** the "Escape Hatch" decision lab (naming: keep "Fog" for the attribute and call the engineering strategy "Escape Hatch"), PlayCanvas, PixiJS and CanvasUI cards, PixiJS's `getElementTransform` two-argument use (flag it), community and tooling links, and authors and status.

**Lab and trial ideas**
- *Exhibition.* A holographic foil card built from a drawn HTML element plus a shader (the foundry's pattern), showing the learner's developed negatives.
- *Escape hatch decision lab.* Scenarios (no support, partial support, WebGL-only, accessibility needed) map to the CC:437-443 choices.
- *Block the main thread.* A toggle blocks script, showing why a replay-buffer design could stay in sync with native scrolling while the paint-event design cannot. Label it speculative.

## 5. Gaps: docs-llm concepts not assigned in `rolls.ts`

| Concept | Source | Suggested roll |
|---|---|---|
| Nested canvases | CC:125-187 | 04 (capstone Lab); reasoning in 11 |
| `preserveElementGeometry` | R:49, R:162-168; 2D:71-95 | 05 |
| `preserveHitTestOrder` | R:86-90; CC:232-247 | 05 |
| `getElementTransform` | R:126-130; IDX:116-119 | 05 |
| `clearElementGeometry` | R:47, R:124; CC:249-256 | 05 (and 09) |
| Legacy `element.style.transform` geometry | `gl:175-177`; `jm:815-818` | 05 |
| Units table | CC:313-324 | 03 |
| `box-sizing: border-box` | CC:379-388 | 03 / 04 |
| Source-rect semantics (CSS px, outsets, ink overflow) | R:37; CC:320 | 04 |
| `WebGLCopyElementImageConfig` | R:201-208 | 06 |
| WebGL pre-allocation, `UNPACK_FLIP_Y_WEBGL`, filtering | GL:31-98; `gl:186-189,327-328` | 06 |
| Legacy `texElementImage2D` | `gl:213-231` | 06 |
| Libraries: three.js, Babylon | IDX:44-55, 76-96; R:287 | 06 |
| Libraries: PlayCanvas, PixiJS, CanvasUI | IDX:57-74, 98-125 | 12 |
| WebGPU destination properties and usage flags | GPU:35-83 | 07 |
| Legacy `copyElementImageToTexture` | `jm:781-798` | 07 |
| Jelly pattern: invisible input, drawn readout, theme via JS | `jh:17,74-75`; `jm:773-941` | 07 (and 09) |
| `ElementImage.close()`, transfer, `transferControlToOffscreen` | R:249-252, R:375-382 | 08 |
| Rejected worker design | R:445-447 | 11 |
| Rejected Options A and B | R:427-439 | 11 |
| Fallback strategies, `three-html-render`, `html2canvas`, `dom-to-image` | CC:437-443 | 12 |
| Per-context feature detection (beyond `content`) | `gl:171`; `jm:811` | 06 / 07 / 12 |
| Media export (hedged) | R:19 | 10 / 12 |
| Questionnaire answers, fully active only, PR 12554 | S:4-82 | 10 |
| Authors, status, community, "Modern Web Guidance" | R:459-468; IDX:28, 139 | 12 |
| `inert` versus `aria-hidden` for stale views, `tabindex`, roles | R:317; `pie:24-31` | 09 |
| What counts as a change (focus, text edits, layout shifts) | CC:93 | 02 (extend) or 09 |

Missing Album cards in `negatives.ts`: `preserveHitTestOrder`, `getElementTransform`, `clearElementGeometry`, `captureElementImage()`, `WebGLCopyElementImageConfig`, nested canvases, feature detection, fallback strategies, library support, and `inert`.

## 6. Audit of the built chapters and `negatives.ts`

**Inaccurate or unsupported**
1. **`InvalidStateError`** (`roll-01-fog/exercises.ts:38`, `rules.ts:21,23`, `shared/lab-canvas.ts:123`, `roll-01-fog/lab.ts:109`). R:37 says only "An exception is thrown". In native mode the lab prints the browser's real exception, so only the exercise text and the simulation assert the type. Say "throws an exception", or verify natively, then keep it.
2. **"Other browsers do not support it yet"** (`prologue/story.ts:41`). Not in the docs. Suggest "It shipped in Chrome 157 and may not be supported in every browser" (CC:426).
3. **`hic/types.ts:4`** says "ships behind a flag", which is stale against CC:426.
4. **`docs/CONCEPTS.md` table** lists projector as 03 and lens as 04, which no longer matches `rolls.ts`.
5. **Fog `drawable-attr`** says the containing block means "nothing leaks out of its snapshot". The docs only say it "implies `isolation: isolate`" and is "a containing block for all descendants" (R:29). The "nothing leaks" gloss is `[I]`.
6. **Fog `laid-out`** says children "are invisible". The docs say "initially not hit testable" and "initially do not have geometry information" (R:26). Invisibility is `[I]`, though "nothing appears on the canvas until you draw it" is safe.
7. **Fog "lays each direct child out as a block, in normal flow"** paraphrases R:26 ("blockifies immediate descendants ... static positioning"). "Normal flow" is a gloss. Also note `drawable` can sit on grandchildren (R:323-328; `ns:37`).
8. **Fog `draw-throws`:** "belongs to a different canvas" versus R:37's "elements with other canvas ancestors". The nested-canvas docs (CC:131-163) contradict the broad reading. Teach "draw into the canvas that owns the element".
9. **Fog `nested`** says the outer snapshot "leaves a hole". The docs say the subtree excludes nested drawables (R:29). "Hole" is `[I]` from `ns` (README open question #7).
10. **Bells `reverse-order`** omits "child frames before their parent documents" and "reverse document order" (R:32), and the sibling-order case (`[I]`: later sibling first).
11. **Bells lab "Spin the gear (a CSS animation)"** assumes a running CSS animation fires `paint` every frame. That is plausible but not stated. README open question #34 (animation inside drawables) is `[OPEN]`.
12. **Bells exercise `bells-loop`** says "ask for the very first one after setting the handler". `ct:44` and `pie:80` comment "Request an initial paint event", but R:70-80 and `ns` omit it. Whether an initial paint is automatic is `[OPEN]` (open question #12). Teach "request one defensively, as the demos do".
13. **Bells Q1 "Nothing on the page changes... Stays quiet"** is right. Add a footnote: a focused text input's blinking caret may fire repeated paints, since caret blink rate is deliberately observable (R:312).
14. **`negatives.ts` `element-image`:** "Close it when done" asserts `close()` semantics the README never gives (R:249-252).
15. **`negatives.ts` `read-back`:** "never contain... system colors" is stated without noting README open question #28 (system colors versus `forced-colors`).
16. **`hic/canvas-sizing.ts` header** says "Every official example uses `ResizeObserver` with `device-pixel-content-box`". The jelly does not (`jm:877-880` observes the default box; `index.ts:56` observes the container).

**Correct and well-sourced:** the feature-detection function and its `setAttribute` rationale; `content` default and reflection (R:109-111); `drawable` attribute meaning (R:29); drawElementImage argument order and ctx.reset (R:71); `paint` after Paint and DOM changes next update (R:32, R:443); `requestPaint` as one-shot and the loop pattern (R:34; CC:196-206); `changedElements` and the WebGL gating example (`gl:351-369`); most of the Prologue trial.

**Missing facts in the built chapters**
- Prologue/fog: layout-only canvas children are exposed to accessibility but have no geometry; no mention that `drawable` on a non-direct child is allowed.
- Bells: the "what counts as changed" list (CC:93), the `onpaint` single-slot hazard (libraries overwrite it, `hic/paint.ts` comment `[PROJ]`), and what `changedElements` holds on the first paint (the WebGL demo depends on it listing all drawables, `gl:351-369` `[I]`).

## 7. Documentation inconsistencies and open items to carry forward

1. **`getElementTransform` arity.** R:126-130 shows one argument. The PixiJS snippet uses two (IDX:116-119) and treats the result as nullable. Teach the one-argument form.
2. **CC:282 versus CC:284 image text.** Alt text says an 800x400 grid, caption says 600x300. See Roll 03.
3. **`2D:75-89` snippet** mixes `elementX`/`x`, literal `200`/`y`, and a hard-coded `a = 1.5`. Illustrative only.
4. **Paint-trigger wording.** R:32 ("if an element's snapshot would be drawn differently") versus CC:80 ("whenever layout, text, or CSS styles change"). Teach the README wording.
5. **README versus questionnaire lists.** Text selection appears only in S:4. Text-fragment markers appear only in R:310. The questionnaire's "must not be painted" list (S:15) is a subset of R:300-307.
6. **`drawable` has no IDL** and no stated element applicability (README open question #3).
7. **WebGPU base-type name.** R:218-219 names `GPUImageCopyTextureTagged` and `GPUTexelCopyTextureInfo`. I recall the current WebGPU spec names the tagged destination differently `[I]`. Verify before showing.
8. **Direction of the `canvasClip` coordinate space** (element-local versus canvas) is unresolved (README open question #16).
9. **Exception types and scope** for every API besides `drawElementImage` are unspecified.

## 8. Native-verification checklist (do before building each claim into a trial)

- Exception type thrown by each failing `drawElementImage` case.
- Whether an initial `paint` is automatic without an initial `requestPaint()`.
- Whether `drawElementImage` and the texture uploads work outside `paint` (GL:80 suggests yes).
- Source-rect outsets recovering box-shadow and text-shadow.
- Perspective hit testing under a 4x4 `canvasTransform` (project-verified in Chrome 157 per `docs/CONCEPTS.md:289`, but not in the docs).
- `UNPACK_FLIP_Y_WEBGL` effect on `texElementSubImage2D`.
- What `ElementImage.close()` does, and whether a transferred image is detached.
- Whether `elementgeometryupdate` fires for main-thread geometry updates.
- Whether the bells gear animation produces one `paint` per frame.
- Whether `drawable` on a nested descendant can be drawn into the inner canvas but not the outer (the nested-canvas case).