# HTML-in-Canvas official examples: deep dive

Scope: every file under `docs-llm/git-official-docs/Examples/` (`complex-text.html`, `pie-chart.html`, `nested-sparkles.html`, `webGL.html` + `webGLSetup.js`, `wolf.jpg`, and the whole `webgpu-jelly-slider/` project), **plus** every code sample in the Chrome developer docs under `docs-llm/html-in-canvas-blogs/` (`index.md`, `concepts.md`, `2d.md`, `webgl.md`, `webgpu.md`; `bundle.md` skipped because it is a concatenation). The spec explainer is `docs-llm/git-official-docs/README.md` (cited as `README.md:NN`); it is mapped in full by `01-file-map-and-concepts.md`.

Layout of this document: sections 2 to 6 are the official `Examples/` demos; **section 7 is the Chrome-docs samples** and how they differ from the demos; section 8 the consolidated helper library; section 9 the compat-hack catalogue; section 10 the matrix; section 11 open questions (several are now resolved by the Chrome docs).

## 0. Read this first

**Conventions**

- Line references are `file:line` relative to `docs-llm/git-official-docs/Examples/` unless prefixed `README.md:`.
- Short names used in tables and the matrix:
  - `CT` = `complex-text.html`
  - `PC` = `pie-chart.html`
  - `NS` = `nested-sparkles.html`
  - `GL` = `webGL.html`, `GLS` = `webGLSetup.js`
  - `JH` = `webgpu-jelly-slider/index.html`
  - `JB` = `webgpu-jelly-slider/index.ts` (the "boot" / sandbox shell)
  - `JM` = `webgpu-jelly-slider/src/index.ts` (the "main" example module)
  - Chrome docs (`docs-llm/html-in-canvas-blogs/`), cited as `idx:N` (`index.md`), `con:N` (`concepts.md`), `2d:N` (`2d.md`), `gl:N` (`webgl.md`), `gpu:N` (`webgpu.md`). These are the "blog" samples; they are written for Chrome 157, which the docs say shipped the API (`con:426`, `idx:19`).
- **Method:** everything below comes from reading source. Nothing was executed in a browser (the API is behind a Chromium experiment). Statements tagged **(inferred)** are my reading of the explainer plus the demo code; statements tagged **(verify)** should be checked in a live build before the learning site teaches them as fact. Numbers in the WebGL and jelly geometry sections are my own calculations from the constants in the source.
- Every example calls the API through the new names (`content="drawable"`, `drawable`, `onpaint`, `drawElementImage`, `texElementSubImage2D`, `drawElementImageToTexture`, `updateElementGeometry`) and keeps legacy fallbacks (section 9).

**Top takeaways**

1. All five demos share one skeleton: markup (`content="drawable"` canvas + `drawable` children), an `onpaint` handler that does the drawing, and a `ResizeObserver` on `device-pixel-content-box` that sizes the bitmap (section 1.1).
2. Two different render-loop styles exist. 2D and WebGL demos let the **paint event be the render loop** (`requestPaint()` re-armed inside the handler: `NS:64`, `GL:374`). The WebGPU demo keeps a normal `requestAnimationFrame` loop and uses the paint event only to refresh a DOM-derived texture and to sync geometry (`JM:773-820` vs `JM:825-864`).
3. Coordinates live in three different spaces. Draw calls use **canvas grid pixels** (device pixels once the ResizeObserver ran). `canvasTransform` is given in **CSS pixels** in both 3D demos (`GL:156-159`, `JM:809-813`). GL clip space is a third space with a flipped Y (section 1.2).
4. The WebGL demo's DOMMatrix is computed from the **un-rotated** model-to-clip matrix only, and its Y mapping omits the flip; it works because the card is centred (section 5.5).
5. The jelly slider's hit rectangle is **hand-tuned**, not derived from the camera (`JM:802-807`, a literal `TODO(pdr)`). My projection of the camera shows the jelly spans roughly 13% to 83% of the canvas width while the hit rect spans 12.5% to 87.5% (section 6.5).
6. The jelly's `<input type=range>` is **invisible** (`opacity: 0`, `JH:17`) and never drawn. It is the interaction + accessibility layer; the 3D jelly is pure decoration driven by its `input` events.
7. The jelly never relies on the browser painting theme/system colours into a snapshot. Colours travel `CSS -> getComputedStyle -> uniforms`, and the only drawn DOM text is plain white (`JH:64`). This is exactly the pattern the privacy rules push authors toward (section 6.6).
8. Several modules in the jelly project are **dead code** inherited from the TypeGPU original (`events.ts`, `numbers.ts`, `common/*`). `numbers.ts` is the pre-HTML-in-Canvas way to render the percentage text (a 512x256x101 atlas, about 50.5 MiB); the DOM texture replaces it (section 6.1).
9. A latent bug: the jelly's DOM texture `valueRawTexture` is allocated once (`JM:68-73`) but `width`/`height` change on resize (`JM:866-875`), and the next `drawElementImageToTexture` call uses the new size (`JM:777-780`) **(inferred, verify)**.
10. Several advertised API surfaces have **no official demo**: `captureElementImage`/`ElementImage`/workers/OffscreenCanvas, `getElementTransform`, `clearElementGeometry`, `canvasClip`, `preserveHitTestOrder`, `preserveElementGeometry`, the 7- and 9-argument `drawElementImage` overloads, `WebGLCopyElementImageConfig`, the source-rect fields of `GPUDrawElementImageSource` (section 1.3). The Chrome docs show snippets for most of them (section 7), but none is a runnable demo; the learning site will have to author its own examples.
11. **The Chrome docs settle several things the demos leave ambiguous** (section 7.7): `canvasTransform`/`canvasClip`/`getElementTransform` are in **CSS px** (`con:322`); source rectangles are in **CSS px** while 2D destination args are grid px (`con:318,320`); the WebGPU `size` option **scales** the element into the destination (`gpu:78`); texture sizes default to the element's grid size **rounded up** (`con:321`, `Math.ceil` at `gl:69-70`, `gpu:41-42`), which the WebGL demo does not do (`GL:201-211`).
12. **The docs and the demos disagree in a few places** (section 7.8): feature detection (`canvas.content` reflection, `con:428-435`, vs `canvas.updateElementGeometry !== undefined`, `GL:171`); RO fallback when `devicePixelContentBoxSize` is missing (`con:292-304`) which every demo lacks; grid-to-CSS ratio from `canvas.width / cssContentWidth` (`con:326-356`) rather than `devicePixelRatio`; `addEventListener('paint')` vs `onpaint`; and the PixiJS snippet drives the DOM element with a **CSS transform from `getElementTransform(el, matrix)`** (`idx:116-119`), the opposite of the "do not use" `style.transform` fallback in the demos (`GL:176-177`).

---

## 1. Shared skeleton, coordinate spaces, API coverage

### 1.1 The canonical triple (what every demo repeats)

| Part | Typical code | Where |
|---|---|---|
| Markup | `<canvas content="drawable" layoutsubtree>` with `drawable` children. The comment above the canvas says `layoutsubtree` is only kept "for temporary backwards compatibility". | `CT:13-16`, `PC:22-25`, `NS:30-33`, `GL:58-61`, `JH:71-74` |
| Paint handler | `canvas.onpaint = () => { ctx.reset(); ...; ctx.drawElementImage(el, x, y); }` (2D), or texture upload + draw (3D). Assigned as a property, never with `addEventListener('paint')`. | `CT:38`, `PC:40`, `NS:44`, `GL:345`, `JM:773` |
| Initial trigger | `canvas.requestPaint()` once. Exception: `NS` has no initial call and relies on the implicit first paint (inferred, verify). | `CT:44`, `PC:80`, `GL:376`, `JM:820` |
| Sizing | `ResizeObserver` with `{box: 'device-pixel-content-box'}`; sets `canvas.width/height` from `devicePixelContentBoxSize[0].inlineSize/blockSize`. | `CT:46-50`, `PC:83-87`, `NS:94-98`, `GL:378-384`; the jelly differs (section 6.3) |

Ordering facts that make this work, from the explainer: ResizeObserver delivery happens earlier in update-the-rendering than the `paint` event, which fires after intersection-observer steps (`README.md:32`, `README.md:405-425`). So a bitmap resized in the RO callback already has its new size by the time `onpaint` runs in the same frame. Draw commands issued in `paint` land in the current frame; DOM changes made in `paint` land in the next one (`README.md:32`).

### 1.2 Coordinate spaces (the single most error-prone topic)

| Space | Unit / origin | Who uses it | Evidence |
|---|---|---|---|
| **CSS px** | Layout px; `offsetWidth`, `getBoundingClientRect`, RO `contentBoxSize`. | Source of truth for DOM layout. Also the space `canvasTransform` **maps into** ("the canvas's CSS coordinates", `README.md:49`). | `GL:156-159` multiplies NDC by `canvas_css_width/2`; `JM:809-813` builds `translate(x,y)` from `canvas.width / devicePixelRatio`. |
| **Canvas grid px** | `canvas.width x canvas.height`, origin top-left. After the RO ran, equals device px. | 2D `drawElementImage` args; `ctx.translate`/`rotate`; `getElementImageDefaultSize` ("in canvas grid coordinates", `README.md:136`); `devicePixelContentBoxSize`. | `CT:41` (`80 * devicePixelRatio`), `PC:44-45,67-71`, `NS:46,86-90`, `GL:201`. |
| **Element border-box space** | Origin at the element's border-box top-left, **before CSS transforms**. | Input of the `canvasTransform` DOMMatrix ("maps the element's border box, before CSS transforms, to the canvas", `README.md:44`). | `GL:161-169` assumes the element is 400x400; `JM:812` assumes translate-only. |
| **GL clip / NDC** | `[-1,1]^2`, origin centre, **Y up**; `w` divide needed. | WebGL vertex output. | `GL:142-150`. |
| **GL texture (u,v)** | `[0,1]^2`; with `UNPACK_FLIP_Y_WEBGL=true` the element's top row lands at `v=1`. | WebGL sampling. | `GL:328`, `GLS:133-146`. |
| **WebGPU texture / uv** | `[0,1]^2`, origin **top-left**, so no flip flag is needed (inferred: the shader samples `uvZ` that grows toward the viewer and there is no flip code anywhere). | Jelly text texture. | `JM:535-547`, `JM:782`. |
| **Source-rectangle space** | **CSS px** (`sx, sy, swidth, sheight` of `drawElementImage` and `texElementSubImage2D`; `sourceX/Y/Width/Height` of `drawElementImageToTexture`), even though the destination args of 2D `drawElementImage` are grid px. | Not used by any demo. | `con:320`, `gpu:68-71`. |
| **Texture px** | The `width/height` of `texElementSubImage2D` and the `size` of `drawElementImageToTexture`; default = the element's grid size **rounded up**. | `GL:201-211` (not rounded), `JM:777-780` (whole canvas), docs `gl:69-70`, `gpu:41-42` (`Math.ceil`). | `con:321`. |
| **World / model** | Demo-specific units. | Card is a 2x2x0.2 box (`GLS:72-90`); jelly spans `x in [-1, 0.9]` (`JM:55`, `JM:104-105`). | |

Rules of thumb the demos obey:

- **Draw in grid px, hit-test in CSS px.** 2D `drawElementImage` converts for you (automatic geometry update, `README.md:49`). In 3D you must produce the CSS-px matrix yourself (`README.md:49`: "3D contexts must call `updateElementGeometry`").
- `devicePixelRatio` is used as the grid-to-CSS ratio (`CT:41`, `PC:67-68`, `NS:54,87-90`). The Chrome docs say the correct ratio is `canvas.width / cssContentWidth` (horizontally) and `canvas.height / cssContentHeight` (vertically), computed once in the resize observer as `scaleX`/`scaleY` (`con:326-356`). The two agree only after the RO ran at the current DPR and the canvas has no fractional rounding; a helper should use the docs' form.
- The README's own OffscreenCanvas example comments "`form.getBoundingClientRect()` would include an x translation of 100" for a `drawElementImage(form, 100, 0)` call (`README.md:369,385-388`). That is only literally true at DPR 1, because 100 is in grid px; the Chrome docs make the conversion explicit (`currentTransform.e = x / scaleX`, `2d:84-85`).
- **`drawElementImage` draws the border box**, so the Chrome docs tell authors to use `box-sizing: border-box` so the CSS `width` includes padding and border (`con:379-388`). Only `GL` does this (`GL:19,43`: `#choice` and `.message`).

**Authoritative units table** (Chrome docs `con:313-324`, reproduced and cross-checked against the demos):

| Value | Units (per docs) | Demo that proves it |
|---|---|---|
| `canvas.width` / `canvas.height` | Canvas grid px | all |
| 2D drawing params incl. `dx, dy, dwidth, dheight` of `drawElementImage` | Canvas grid px | `CT:40-42`, `PC:44-71`, `NS:46-61` |
| `getElementImageDefaultSize()` width/height | Canvas grid px | `GL:201` |
| Source rects (`sx, sy, swidth, sheight`; `sourceX, ...`) | **CSS px** | none (docs only: `gpu:68-71`, `gpu:95-96`) |
| Texture sizes (`width/height` of `texElementSubImage2D`; `size` of `drawElementImageToTexture`) | Texture px; default = element grid size rounded up | `JM:779` |
| `getElementTransform()`, `canvasTransform`, `canvasClip` | **CSS px** | `GL:156-169`, `JM:809-813` |
| `offsetWidth`, `clientWidth`, `getBoundingClientRect()`, pointer coords, RO `contentBoxSize` | CSS px | `PC:67-68`, `GL:381-382` |
| RO `devicePixelContentBoxSize` | Device px | `CT:47-48` etc. |

### 1.3 API coverage: used by at least one demo vs never demonstrated

Exercised: `content="drawable"`, `layoutsubtree` (legacy), `drawable`, nested `drawable`, `onpaint`, `changedElements`, `requestPaint()` (initial, self-re-arming, event-driven), 2D `drawElementImage` 3-arg and 5-arg forms, `drawFocusIfNeeded`, WebGL `texElementSubImage2D` + `getElementImageDefaultSize`, WebGPU `drawElementImageToTexture`, `canvas.updateElementGeometry(el, {canvasTransform})`, `inert`, ARIA `role`/`aria-label`/`tabindex`, RO `device-pixel-content-box`, `convertRectFromNode` (GeometryUtils), `UNPACK_FLIP_Y_WEBGL`.

Never exercised by an official `Examples/` demo (they appear only in the README IDL/examples and/or the Chrome docs): `captureElementImage`, `ElementImage` (+ `close()`, transfer to workers), `OffscreenCanvas` + `onelementgeometryupdate`, `getElementTransform`, `clearElementGeometry`, `UpdateElementGeometryOptions.canvasClip`, `.preserveHitTestOrder`, `DrawElementImageOptions.preserveElementGeometry`, the 7-argument (source rect + dx,dy) and 9-argument `drawElementImage` overloads, `WebGLCopyElementImageConfig`, the `sourceX/Y/Width/Height` members of `GPUDrawElementImageSource`, `GPUImageCopyTextureTagged` colour-space/premultiply fields, `canvas.getElementImageDefaultSize` in a 2D context. The only `ElementImage`-based code is `README.md:342-399` (and the mention at `gl:93`, `gpu:67`).

Where the Chrome docs do show a snippet for these: `preserveElementGeometry` `2d:75-89`; 7/9-arg overloads `2d:51-55`; `preserveHitTestOrder` `con:236-242`; `clearElementGeometry` `con:253-256`; `canvasClip` and `getElementTransform` only in the units table (`con:322`) and the PixiJS snippet (`idx:116`); WebGPU `origin/mipLevel/aspect/colorSpace/premultipliedAlpha` `gpu:77-83`; nested canvases `con:131-181`; `changedElements` loop `con:96-102`. See section 7.

---

## 2. `complex-text.html` (51 lines)

### 2.1 What it demonstrates

A 638x318 CSS canvas (`CT:6-10`, plus `width="638" height="318"` at `CT:15`) draws one HTML block, rotated 15 degrees, into a **2D** context. The block (`CT:16-32`, fixed `width: 550px`) contains things `fillText` cannot do: a hyperlink (`CT:17`), `<b>` (`CT:18`), emoji (`CT:19`), an RTL span with `dir=rtl` Persian text (`CT:20`), a vertical `writing-mode: vertical-rl` paragraph in Chinese (`CT:22-24`), a same-origin inline `<img src="wolf.jpg">` (`CT:25`; `wolf.jpg` is 320x160 JPEG, 8 KB, shown at width 150), and an inline `<svg>` with a circle and text (`CT:26-31`). Concepts: DOM layout/shaping/bidi as a canvas source, transforms applied to a snapshot, DPR sizing, and the read-back-allowed content rules (same-origin image and inline SVG are fine; `README.md:300`).

### 2.2 API call sites

| API / concept | Line(s) | Notes |
|---|---|---|
| `content="drawable"` | `CT:15` | New attribute. Comment at `CT:13-14`. |
| `layoutsubtree="true"` (legacy) | `CT:15` | Only this demo writes `="true"`; others use the bare boolean form. |
| `drawable` | `CT:16` | On the single source `<div id="draw_element">`. |
| `canvas.onpaint` | `CT:38` | Receives an unused `event` argument. |
| `ctx.reset()` | `CT:39` | Clears bitmap and transform each paint. |
| 2D transform before draw | `CT:40` `ctx.rotate(15deg)`, `CT:41` `ctx.translate(80*dpr, -20*dpr)` | Rotate first, then translate, so the translation happens in the rotated frame (the origin lands near (82, 1.4) device px at DPR 1; my arithmetic). |
| `drawElementImage(el, dx, dy)` (3-arg) | `CT:42` | The element is accessed through the implicit global `draw_element` (named element access), not `getElementById`. |
| Automatic geometry update | `CT:42` (implicit) | `preserveElementGeometry` defaults to false (`README.md:49`), so the link's hit-test/AX geometry follows the rotated draw (inferred). |
| `canvas.requestPaint()` | `CT:44` | Initial paint request. |
| RO `device-pixel-content-box` | `CT:46-50` | `devicePixelContentBoxSize[0].inlineSize` / `.blockSize` at `CT:47-48`; `box` option at `CT:50`. |
| `devicePixelRatio` | `CT:41` | Only for the translate, not for rotation. |

### 2.3 Flow

1. The browser lays out the canvas children (they are blockified, statically positioned; `README.md:26`); `draw_element` is 550 px wide with auto height.
2. `getContext('2d')` (`CT:37`); `onpaint` assigned (`CT:38`).
3. `requestPaint()` (`CT:44`) guarantees a first paint event; the RO is registered (`CT:46-50`).
4. First RO delivery sets `canvas.width/height` to device px (this clears the bitmap).
5. Paint event: `reset`, `rotate`, `translate`, `drawElementImage(draw_element, 0, 0)` draws the latest snapshot at the transformed origin.
6. On later changes (resize, DPR change, link hover state) a new paint event fires only when the snapshot differs or `requestPaint()` is called; there is no loop.

### 2.4 Reusable patterns

- `observeCanvasGrid(canvas, cb)`: the RO boilerplate (`CT:46-50`).
- `withTransform(ctx, {rotate, translateCss}, draw)`: `reset` + CSS-px-aware transforms (`CT:39-41`), which hides the `* devicePixelRatio` multiplications.
- `markDrawable(canvas)`: sets both attributes (`CT:15`).

### 2.5 Pitfalls and subtle details

- **Resize clears the bitmap**, and this demo does not call `requestPaint()` after resizing. The README's OffscreenCanvas example does (`README.md:396`). Whether a paint event always follows a bitmap-only resize is not stated (verify); a safe helper requests a paint after every resize.
- **Grid vs CSS in transforms:** `ctx.rotate` takes radians (no DPR), but `ctx.translate` is in grid px, hence `* devicePixelRatio` (`CT:41`). Forgetting this gives a different offset on retina screens.
- **What is deliberately not painted** (read-back-allowed rendering, `README.md:295-308`): the link will never show visited styling; spelling/grammar markers, autofill previews and sub-pixel (LCD) text anti-aliasing are not captured; a cross-origin `<img>` or an SVG `<use>`/`<feImage>` would be blanked. `wolf.jpg` works because it is same-origin.
- The element is 550 px wide, the canvas is 638 wide, and the content is shifted and rotated, so it is clipped by the canvas on the right. Intentional here, but remember the snapshot is not clipped to the canvas, only the draw is.
- Global named access (`draw_element`) works only because the id is a valid identifier and no other global shadows it. Use `getElementById` in lessons.
- The vertical-text paragraph is a `<p>` inside the drawable; default `p` margins apply, which changes the snapshot height.

### 2.6 Lab and trial

**Lab: "Rotation and Resolution Bench"** (tweak and observe)
- Sliders: rotation angle, translate x/y in CSS px.
- Toggles: DPR simulation 1x/2x/3x; "size bitmap with RO" on/off (off shows the blur from a CSS-sized bitmap on a hi-DPI surface); individual content chips (emoji, RTL, vertical, image, SVG, cross-origin image).
- Live readout: `canvas.width`, `canvas.clientWidth`, grid:CSS ratio, `getElementImageDefaultSize(el)`.
- Learning point: draw coordinates are grid px; layout is CSS px; cross-origin media is silently omitted.

**Trial: "Crisp and Clickable"** (win condition)
- Starter code draws the text blurry at simulated DPR 2 and uses `preserveElementGeometry: true`, so the link is not clickable at its rotated position.
- Win when all three hold: (1) `canvas.width === devicePixelContentBoxSize.inlineSize`; (2) pixel diff of the text region versus a reference render is under a threshold; (3) `getElementTransform(draw_element)` (from the README IDL, `README.md:130`) is non-identity with a rotation near 15 degrees, or a scripted click at the link's rotated centre fires the link's `click`.
- Bonus badge: add a cross-origin image and explain in one sentence why it does not appear.

---

## 3. `pie-chart.html` (88 lines)

### 3.1 What it demonstrates

A 250x250 CSS canvas (`PC:6-9`; no `width`/`height` attributes, so the RO sets the bitmap) draws a pie chart with the **geometry in Canvas 2D** (wedges with radial gradients) and the **labels as HTML** (a big bold percentage `<span class="val">` plus a wrapping name, `PC:10-19,25-33`), placed at 60% of the radius along each wedge's mid-angle. It also shows accessibility and keyboard focus: the canvas has `role="list"` and `aria-label` (`PC:24`), each label is a focusable `role="listitem"` (`PC:25,28,31`), and the wedge-shaped focus ring is drawn with `drawFocusIfNeeded` (`PC:77-78`). Data is carried in `data-val` / `data-color` attributes (`PC:25,28,31`).

### 3.2 API call sites

| API / concept | Line(s) | Notes |
|---|---|---|
| `content="drawable"`, `layoutsubtree` | `PC:24` | Comment `PC:22-23`. |
| `drawable` (x3) | `PC:25,28,31` | Each label is its own drawable; they are siblings, not nested. |
| ARIA | `PC:24` `role="list"` `aria-label="Pie Chart"`; `PC:25,28,31` `role="listitem"` | DOM is the accessibility source of truth; no parallel fallback tree. |
| `tabindex="0"` | `PC:25,28,31` | Makes drawable children focusable. |
| `canvas.onpaint` | `PC:40` | |
| `ctx.reset()` | `PC:41` | Required because the handler `translate`s (`PC:45`); without reset it would compound each paint. |
| `canvas.children` iteration | `PC:49` | Works because the children are laid-out drawables, not fallback content. |
| `drawElementImage(label, x, y)` | `PC:71` | 3-arg form; automatic geometry update gives each label hit-test/AX geometry (comment `PC:65`). |
| `drawFocusIfNeeded(path, el)` | `PC:77-78` | After the loop so the ring is on top. |
| `document.activeElement === label` | `PC:62-63` | Detects which wedge to ring. |
| `offsetWidth/offsetHeight * devicePixelRatio` | `PC:67-68` | Used to centre the label (the explainer offers `getElementImageDefaultSize` for exact grid size; not used here). |
| `color-mix()` in gradient stop | `PC:54` | `color-mix(tomato, white 40%)`; relies on a CSS Color 5 `color-mix` that omits the interpolation space. |
| RO | `PC:83-87` | `box: ['device-pixel-content-box']` (array) at `PC:87`. |
| `requestPaint()` | `PC:80` | Initial only; no loop. |

### 3.3 Flow

1. Markup gives three labels with `data-val` (0.45, 0.35, 0.20) and `data-color`.
2. `onpaint` defined (`PC:40`); `requestPaint()` (`PC:80`); RO sets the bitmap (`PC:83-87`).
3. Paint: `reset`; `radius = 0.95 * min(w,h) / 2` in grid px (`PC:44`); `translate` to the centre (`PC:45`).
4. For each child: slice angle (`PC:50`), radial gradient with `color-mix` (`PC:53-56`), `Path2D` wedge (`PC:57-60`), `fill` (`PC:61`); remember the path if the label is focused (`PC:62-63`).
5. Label placement: `mid = angle + slice/2` (`PC:66`); size from `offsetWidth/Height * dpr` (`PC:67-68`); centre at `0.60 * radius` along `mid` (`PC:69-70`); `drawElementImage(label, x, y)` (`PC:71`), which also updates that label's geometry.
6. `drawFocusIfNeeded(focusedPath, document.activeElement)` last (`PC:77-78`).
7. Pressing Tab changes the focused label, which changes its snapshot, which fires a new paint event, which redraws and moves the ring. The Chrome docs list "focus state changes" explicitly among the visual changes that put an element in `changedElements` (`con:93`).

### 3.4 Reusable patterns

- `drawCentered(ctx, el, cx, cy)`: centring via `getElementImageDefaultSize` instead of `offsetWidth*dpr` (`PC:67-71`).
- `drawFocusRing(ctx, path, el)`: remember the focused element's shape during the loop, draw the ring once at the end (`PC:62-63,77-78`).
- `polarLabelPlacement(angle, slice, radius, k)` (`PC:66-70`).
- Data-attribute-driven chart: DOM as model (`PC:25-33,50`).

### 3.5 Pitfalls and subtle details

- **`box: ['device-pixel-content-box']`** (`PC:87`) is an array where the IDL expects a single enum string. It works because WebIDL stringifies a one-element array to the same word; it is accidental. Teach the string form (`CT:50`).
- **Rounding:** `offsetWidth/offsetHeight` are integer-rounded CSS px (`PC:67-68`), so labels can sit up to half a device pixel off. `getElementImageDefaultSize` returns the exact grid size (`README.md:136`). The Chrome docs' centring snippet multiplies `offsetWidth/offsetHeight` by `scaleX/scaleY` (canvas grid px per CSS px from the resize observer) rather than `devicePixelRatio`, then uses `(canvas.width - width) / 2` (`con:360-377`); that is the form to teach.
- **Focus ring placement:** the native outline of a focused label lies outside its border box, and `drawElementImage` draws from the border box (`README.md:37`: source-rect outsets are needed to include ink overflow), so the canvas-drawn wedge ring is the reliable indicator (inferred).
- **`color-mix(tomato, white 40%)`** without `in <colorspace>` needs a recent engine. `addColorStop` throws `SyntaxError` on an unparsable colour.
- **Hit-testing is per label**, not per wedge. Clicking a wedge outside its label rect hits nothing.
- **No normalisation:** `data-val` values are used as fractions of 2*PI (`PC:50`); they must sum to 1.
- **Overlap risk:** label width is `max-width: 40%` of the canvas (`PC:11-12`) while placement is a fixed 0.60 radius factor, so small wedges can collide with neighbours. Nothing detects this.
- **Resize clears the bitmap** and there is no `requestPaint()` in the RO (`PC:83-87`); as in section 2.5.
- Per-frame cost: the handler allocates a `Path2D` and gradient per slice on every paint. Fine for 3 slices.

### 3.6 Lab and trial

**Lab: "Pie Workshop"**
- Number inputs for the slice values (auto-normalising), add/remove slice, label radius factor (0.4 to 0.8), toggle `tabindex`, toggle `role`/`aria-label`, toggle the `drawFocusIfNeeded` call.
- Side panel shows a simulated accessibility tree (role, name, `getBoundingClientRect` of each label) so the learner sees that geometry exists only after `drawElementImage` ran.
- Learning point: the DOM stays the single source of truth for text and semantics; the canvas only decides where things are drawn.

**Trial: "Keyboard-Only Cartographer"**
- Given a 5-slice chart where slice 4 is not focusable and two labels overlap.
- Win when an automated run satisfies all of: Tab visits all 5 labels in order; for each, the label's `getBoundingClientRect()` centre lies inside its wedge; no two label rects overlap; a pixel probe along the focused wedge's arc finds ring-coloured pixels.
- Bonus: keep every one of those true after the learner changes the canvas size.

---

## 4. `nested-sparkles.html` (99 lines)

### 4.1 What it demonstrates

A four-line poem rendered as alternating blue/pink rounded "chat bubbles" (`NS:11-24`, `NS:33-38`). The final word "you" is a **nested drawable**: `<span id="sparkle" drawable>` inside `<div drawable id="poem">` (`NS:33,37`). Per the explainer a drawable subtree excludes nested drawables (`README.md:29`), so the poem's snapshot lacks "you" while the layout keeps its space (inferred). The handler draws the poem, then 15 random white dots over the span's location, then the "you" element on top, and **re-arms `requestPaint()` every frame** to animate (`NS:64`). It also shows how to place a nested drawable using in-flow geometry, with a `GeometryUtils` `convertRectFromNode` path and a manual fallback (`NS:69-91`).

### 4.2 API call sites

| API / concept | Line(s) | Notes |
|---|---|---|
| `content="drawable"`, `layoutsubtree` | `NS:32` | Comment `NS:30-31`. |
| `drawable` on parent | `NS:33` | |
| `drawable` nested | `NS:37` | A `<span>` inline element inside a `.line` div. |
| `onpaint` | `NS:44` | |
| `ctx.reset()` | `NS:45` | |
| `ctx.translate(canvas.width/3, canvas.height/5)` | `NS:46` | Grid px, no DPR multiply because it uses `canvas.width`. Applies to poem, dots and sparkle. |
| `drawElementImage(poem, 0, 0)` | `NS:47` | 3-arg form. |
| `drawElementImage(sparkle, x, y, w, h)` | `NS:61` | **5-arg** form (`dx, dy, dwidth, dheight`); destination size equals the natural size here. |
| `requestPaint()` inside the handler | `NS:64` | Continuous loop ("Setup a loop to paint continuously"). |
| No initial `requestPaint()` | n/a | Only call is `NS:64`; the first paint relies on the implicit event for new snapshots (inferred, verify). |
| `getInFlowRect` | `NS:69-91` | CSS-to-grid conversion. |
| `closest('[drawable], canvas')` | `NS:73` | Starts at `parentElement`, so it never matches the element itself. |
| `convertRectFromNode(...).getBounds()` | `NS:75-76` | GeometryUtils; feature-detected. |
| Manual offsetParent walk | `NS:79-84` | Fallback. |
| DPR scaling of the rect | `NS:86-90` | CSS to grid. |
| RO | `NS:94-98` | |

### 4.3 Flow

1. Markup: nested drawables; `#sparkle` is bold (`NS:25-27`).
2. First paint (implicit) runs the handler.
3. `reset`; move origin to (w/3, h/5) (`NS:45-46`).
4. Draw the poem snapshot (without "you") at origin (`NS:47`).
5. `getInFlowRect(sparkle)` returns the span's rectangle relative to `#poem`, in grid px (`NS:50`).
6. Draw 15 white dots with random positions in that rect and random radius `(rand+1)*dpr` (`NS:51-60`).
7. Draw the sparkle element into the same rect (`NS:61`); it covers the dots with its glyphs.
8. `requestPaint()` (`NS:64`) schedules the next frame; repeat. The RO resizes the bitmap on DPR/size change (`NS:94-98`).

### 4.4 Reusable patterns

- `rectInDrawableAncestor(el, {toGrid: true})` (`NS:69-91`): geometry of a nested drawable in the ancestor's coordinate space.
- `startPaintLoop(canvas, handler, {until})`: a self-re-arming loop with a stop condition (`NS:64`).
- Z-order by call order: snapshot, effect, snapshot (`NS:47,50-61`).

### 4.5 Pitfalls and subtle details

- **The origin is shared:** the dots and the sparkle are drawn in the poem-translated frame, so rect coordinates must be relative to the poem (the nearest `[drawable], canvas` ancestor, `NS:73`), not the canvas.
- **`offsetLeft/offsetTop/offsetWidth/offsetHeight` are integers** and relative to `offsetParent`, which may differ from the drawable ancestor. Hence `convertRectFromNode` plus the manual chain walk. The fallback assumes `offsetParent` eventually equals `ancestor` and crashes on `null` (for example `display:none`).
- **Always-on loop:** `requestPaint()` inside the handler repaints every frame, even when nothing changed (README: it is the analogue of `requestAnimationFrame`, `README.md:34`). The demo has no pause on hidden tab or `prefers-reduced-motion`.
- **The poem's gap:** "you" is absent from the poem snapshot; if the code forgets the second `drawElementImage` the sentence reads "And so are ." (inferred).
- **Geometry sync is per element:** each `drawElementImage` updates geometry for its own element, so `#sparkle` gets its own hit-test/AX geometry independent of `#poem`.
- `Math.random()` per frame makes output nondeterministic, which complicates automated grading; seed it in a lab.
- Draw-order caveat: the dots are painted before the sparkle element, which is why the glyphs appear above them. Swap the order and the dots cover the text.

### 4.6 Lab and trial

**Lab: "Nest or Not"**
- Toggle `drawable` on the span; toggle which draw call runs first; slider for the number of sparkles; switch between self-re-arming and on-demand painting.
- A "Paint HUD" shows paint events per second and the contents of `event.changedElements`.
- Learning point: nested drawables are separate snapshots with their own geometry, and the parent snapshot excludes them.

**Trial: "Behind the Stars"**
- Part A: make "you" render above the sparkles and keep the poem intact (pixel probes at the span's centre and edge).
- Part B (efficiency): paint events must drop to 0/s when `document.hidden` or when the learner toggles an emulated `prefers-reduced-motion`, and resume afterwards (HUD counter check).
- Part C (interaction): make "you" clickable independently of the poem (click on it increments a counter while clicking elsewhere in the poem does not), which requires the sparkle's own geometry to be synced.

---

## 5. `webGL.html` + `webGLSetup.js`

### 5.1 What it demonstrates

A 400x600 CSS canvas (`GL:12-16`, attributes at `GL:60`) renders a spinning 3D **card** with WebGL2. The card is a 2x2x0.2 box (`GLS:72-90`). Its front face is a live HTML form (`#choice`: four language radio buttons and a Flip button, `GL:61-67`); its back face is the localised message for the chosen language (`#english/#spanish/#hindi/#korean`, `GL:68-83`, each with `lang` attributes for en/es/hi/ko). The whole card is interactive: radios and Flip buttons are clickable **on the 3D surface** because the demo feeds `updateElementGeometry` a CSS-px matrix every frame (`GL:141-179,251`). It also demonstrates: selective texture uploads via `changedElements` (`GL:351-369`), `inert` swapping so only the face that is showing receives hit-testing and AT exposure (`GL:108-139`), and the paint event as the render loop (`GL:374`). Text shaping of Devanagari and Hangul comes for free from DOM layout.

### 5.2 API call sites

| API / concept | Line(s) | Notes |
|---|---|---|
| `content="drawable"`, `layoutsubtree` | `GL:60` | Comment `GL:58-59`. |
| `drawable` (x5) | `GL:61,68,72,76,80` | One form, four messages. |
| `inert` (initial) | `GL:68,72,76,80` | Messages start inert; `#choice` does not. |
| `lang` on text | `GL:69,73,77,81` | i18n shaping per element. |
| Inline `onclick="flip()"` | `GL:66,70,74,78,82` | Hit-tested through the canvas, so geometry must be correct. |
| `getContext('webgl2')` | `GL:269` | Called lazily inside `setupGL`, which runs from the first paint (`GL:346-349`). |
| `canvas.onpaint` | `GL:345` | Assigned inside `onload` (`GL:339`). |
| `event.changedElements` | `GL:351,353` (`Array.from`), `GL:360,365` (`includes`) | Per-element texture refresh. |
| `requestPaint()` loop | `GL:374` | Re-armed every frame; initial call `GL:376`. |
| `getElementImageDefaultSize` | `GL:201` | Called on `gl.canvas`; returns grid px. |
| `texImage2D(... null)` pre-allocation | `GL:202-211` | Required before a `Sub` upload. |
| `texElementSubImage2D(TEXTURE_2D, 0, 0, 0, el)` | `GL:212` | No `WebGLCopyElementImageConfig` passed. |
| Legacy `texElementImage2D` (6-arg) | `GL:221-222` (log `GL:223`) | First fallback. |
| Legacy `texElementImage2D` (3-arg) | `GL:228` (log `GL:229`) | Second fallback. |
| `UNPACK_FLIP_Y_WEBGL` | `GL:328` | Set once in `setupGL`; comment `GL:327`. |
| Texture params | `GL:187-189` | `LINEAR` min filter, clamp; comment `GL:186`. |
| `canvas.updateElementGeometry(el, {canvasTransform})` | `GL:174` | Feature-detected at `GL:171`. |
| Legacy `style.transform` fallback | `GL:177` | Comment "Older approach (do not use)" `GL:176`. |
| `new DOMMatrix()` + a/d/e/f | `GL:165-169` | |
| `inert` toggling | `GL:111-128` | `removeAttribute("inert")` `GL:116,123`; `setAttribute("inert", true)` `GL:118,125`; called from `flip()` `GL:138`. |
| `getVisibleElement` | `GL:97-106` | Chooses the element whose geometry is synced, by **target** rotation. |
| RO | `GL:378-384` | `devicePixelContentBoxSize` `GL:379-380`; `contentBoxSize` `GL:381-382`; box option `GL:384`. |
| Aspect from `clientWidth/clientHeight` | `GLS:180` | CSS px aspect. |

### 5.3 Flow

1. Markup: five drawable divs; the four messages are `inert` (`GL:68-83`).
2. `onload` (`GL:339`) assigns `onpaint` (`GL:345`), calls `requestPaint()` (`GL:376`), registers the RO (`GL:378-384`).
3. RO delivers: bitmap = device px (`GL:379-380`); CSS size remembered (`GL:381-382`).
4. First paint: `setupGL()` (`GL:346-349` -> `GL:266-337`): create context, compile shaders (`GL:280-306`), buffers (`GLS:52-62`), two empty textures (`GL:324-325`), set `UNPACK_FLIP_Y_WEBGL` (`GL:328`).
5. Selective upload (`GL:351-369`): if `#choice` is in `changedElements`, upload it into the front texture; if the selected language element changed, or the selected language differs from `lastLangId`, upload it into the back texture.
6. `render()` (`GL:235-264`): compute `deltaTime`; `drawScene(...)` clears, builds projection (35 degrees vertical FOV, near 0.1, far 100, `GLS:179-187`), `modelView = translate(0,0,-6)` (`GLS:200-204`), saves `pointToScreenMatrix = projection * modelView` **before** rotating (`GLS:189-205`), then rotates about Y by `card_rotation` (`GLS:206-211`); draws front face with the form texture (`GLS:259-260`), back face with the language texture (`GLS:263-264`), side faces with a 1x1 white texture (`GLS:239-254,267-268`); returns the matrix (`GLS:270`).
7. `updateElementGeometry(model_to_screen_matrix)` (`GL:251`) computes the DOMMatrix (section 5.5) and calls the API for the **visible** element only.
8. Rotation advances toward `cardTargetRotation` at 1 rad/s (`GL:253-263`).
9. `requestPaint()` (`GL:374`) schedules the next frame.
10. Click on a Flip button: `flip()` toggles the target between 0 and PI (`GL:132-137`) and calls `setInert()` (`GL:138`), so the newly visible element becomes interactive immediately and the other becomes inert.

### 5.4 Reusable patterns

- **Changed-element router**: only upload textures for elements named in `event.changedElements` (`GL:351-369`).
- **`uploadElementToTexture(gl, tex, el)`**: allocate with `getElementImageDefaultSize`, then `texElementSubImage2D`, with the fallback chain (`GL:195-232`).
- **Exclusive inert group**: exactly one element of a set is not inert (`GL:111-128`).
- **Paint-driven render loop**: the paint handler uploads textures, renders, syncs geometry and re-arms (`GL:345-376`).
- **Quad-to-DOMMatrix**: project the two corners of a quad to CSS px and build `a,d,e,f` (`GL:141-179`).
- **Lazy GL init in the first paint** so snapshots exist before first upload (`GL:346-349`).

### 5.5 How the DOMMatrix is computed (step by step)

Inputs: card half-extent 1, front-face depth `z = +0.1`, camera translate `(0,0,-6)`, FOV 35 degrees, canvas CSS size 400x600, element border box 400x400.

1. `M = projection * translate(0,0,-6)`; no rotation (`GLS:192,200-205`, comment `GLS:189-191`: "...not the rotation, because for the purposes of calculating the CanvasTransform for DOM content we do not want it").
2. Transform two corners `(-1,-1,0.1,1)` and `(1,1,0.1,1)` (`GL:142-145`). The variable names `top_left` / `bottom_right` are misleading: in GL clip space `(-1,-1)` is the **bottom-left** corner.
3. Perspective-divide: `x/w`, `y/w` (`GL:147-150`). Here `w = 5.9` (distance 6 minus 0.1).
4. Build `gl_screen_rect` in NDC (`GL:146-150`).
5. Map NDC to canvas CSS px (`GL:156-159`): `x = (ndc.x + 1) * W/2`, `y = (ndc.y + 1) * H/2`, `width = ndc_w * W/2`, `height = ndc_h * H/2`. **Y is not flipped** (GL Y is up, CSS Y is down). It still gives the right answer because the card is centred vertically: `(-ndc_top + 1)` equals `(ndc_bottom + 1)` when `ndc_bottom = -ndc_top`. An off-centre card would be wrong.
6. Matrix (`GL:165-169`): `a = canvas_rect.width / 400`, `d = canvas_rect.height / 400`, `e = canvas_rect.x`, `f = canvas_rect.y`. The **400 is hard-coded** (the border box of `#choice` and `.message`, `GL:20-26,44-50`).
7. Apply with `canvas.updateElementGeometry(visible, {canvasTransform})` (`GL:174`).

My numbers for this configuration: `fov = 35 deg`, aspect `400/600`, `w = 5.9` give NDC half-extents `(0.8063, 0.5376)`, so the card front face is a 322.5 x 322.5 CSS px square at `(38.7, 138.7)` and the matrix is `a = d = 0.8063, e = 38.73, f = 138.73` (centred: `(400-322.5)/2 = 38.7`, `(600-322.5)/2 = 138.7`).

Why CSS px and not grid px: `canvas_css_width/height` come from `contentBoxSize` (`GL:381-382`), and the transform maps "to the canvas's CSS coordinates" (`README.md:49`).

### 5.6 Pitfalls and subtle details

- **Rotation is ignored by the geometry**, so while the card is mid-flip (about 3.1 s at 1 rad/s) the hit-testable rectangle stays the flat front-facing rect. `setInert()` fires at the start of the flip, so the interactive element switches **before** the visual does (`getVisibleElement` keys off the target rotation, `GL:98`).
- **Back face is slightly smaller than the front face** (z = -0.1 gives `w = 6.1`; my numbers: about 312 px vs 322.5 px), but the demo applies the front-face rect to both (ignores the 3% difference).
- **Y flip omitted** (section 5.5 step 5). Off-centre or tilted cards need a proper `1 - ndc_y` mapping.
- **Only the visible element's geometry is updated**; hidden ones keep stale geometry (never `clearElementGeometry`'d), which is harmless only because they are `inert`.
- **Name clash:** the demo defines a global `updateElementGeometry` function (`GL:141`) and also feature-detects the canvas method of the same name (`GL:171`). Easy to confuse.
- **Texture re-allocation and rounding:** every upload calls `texImage2D(... null)` then a sub-upload (`GL:202-212`), even if the size did not change. The Chrome docs say to allocate **once, or whenever the element changes size** (`gl:35,40-56,63-64`) and to pass `Math.ceil(width)`/`Math.ceil(height)` (`gl:69-70`) because the default size can be fractional and is "rounded up" by default (`con:321`). The demo passes the raw (possibly fractional) values (`GL:201-206`), which WebIDL converts by truncation, so a fractional element size could lose a row/column of pixels (inferred).
- **`UNPACK_FLIP_Y_WEBGL`** is set once globally (`GL:328`). The demo relies on it applying to element uploads, as the comment says; texture coordinates `GLS:133-146` assume the flipped orientation (front: `(0,0),(1,0),(1,1),(0,1)`; back mirrored so it reads correctly from behind). Verify that the flag also governs `texElementSubImage2D` (verify).
- **No `gl.viewport()` call anywhere** (`GL:266-337`, `GLS:157-271`). The viewport defaults to the drawing-buffer size at context creation, which here happens inside the first paint, after the first RO delivery. A later DPR/size change resizes the bitmap (`GL:379-380`) but would leave the viewport stale (WebGL does not auto-update it) (inferred, verify).
- **Linear min filter without mipmaps** (`GL:186-189`): the comment says it beats mipmaps for text. At DPR 2 the texture is 800x800 and the card is about 645 device px wide, so there is minor minification aliasing.
- **Dead/sloppy details:** `choice_in_front` is set (`GL:99,103`) but never read; `for (id in messages)` leaks a global (`GL:120`); `texture_checkboxes` is actually the whole `#choice` form and `texture_choice` is the back face (misleading names, `GL:324-325`); `drawScene` has an unused 7th parameter `model_to_scree` (`GLS:157`); shader failures use `alert()` (`GLS:16-18,41-44`).
- **Texture uploads happen only inside `onpaint`**, which is required: a snapshot exists only after layout/paint (`README.md:32,37` throws if called before an initial snapshot).
- `changedElements` gating is by identity; if the selected language message is `inert` it still counts as a changed element when its content changes (inferred).
- Both Flip buttons call the same `flip()`; the focus ring on the buttons and radios appears in the snapshot because focus indicators are rendered by `drawElementImage` (`README.md:319`).

### 5.7 Lab and trial

**Lab: "Card Forge"**
- Sliders: FOV, camera distance, card scale, rotation speed.
- Toggles: "apply Y flip", "update geometry each frame", "toggle inert on flip", `UNPACK_FLIP_Y_WEBGL`, texture filter (linear vs mipmapped).
- Overlay: draw the computed hit rectangle and the live `a,d,e,f` values; a "click probe" shows which element receives a click at the mouse position.
- Learning point: texture upload and hit-test geometry are two separate pipelines; the matrix lives in CSS px and must match what the GPU drew.

**Trial: "Click the Moving Card"**
- The card is placed off-centre and tilted (randomised per run); the starter code uses the demo's centred shortcut.
- Win when scripted clicks at the on-screen centre of each radio button and each Flip button (computed from the true projected positions) reach the right elements across 5 random placements, with at most 2 px of error.
- A second badge, "Inert Detective": find which element steals clicks when the `setInert()` call is removed, and fix it without breaking AT exposure (the hidden face must not be in the accessibility tree).

---

## 6. `webgpu-jelly-slider/` (TypeScript + Vite + TypeGPU)

### 6.1 File inventory (all read completely)

| File | Lines | Role | Status |
|---|---|---|---|
| `index.html` | 82 | Page, CSS theming, canvas with two drawable children | live |
| `index.ts` (boot) | 274 | Sandbox shell: body layout, canvas wrapper + sizing, controls panel, dynamic `import('./src/index.ts')` | live (controls panel ends up empty) |
| `src/index.ts` (main) | 955 | WebGPU/TypeGPU raymarcher, DOM-to-texture, geometry sync, theming | live |
| `src/slider.ts` | 411 | Verlet rope physics (17 points, 6 substeps x 16 iterations), Bezier SDF compute pass into a 256x128 `rgba16float` texture | live |
| `src/camera.ts` | 131 | `CameraController` with Halton(2,3) jitter for TAA | live |
| `src/taa.ts` | 124 | Temporal anti-aliasing compute resolve (neighbourhood clamp; lower history weight in a hard-coded text region `taa.ts:40-55`) | live |
| `src/utils.ts` | 68 | Fresnel, Beer-Lambert, ray/box, texture factories | live |
| `src/dataTypes.ts` | 64 | Structs and bind-group layouts; `valueTexture` slot `dataTypes.ts:43-46` | live |
| `src/constants.ts` | 39 | Render/material constants | partly dead (`MOUSE_*`, `TARGET_*`, `GROUND_ALBEDO` unused by live code) |
| `src/events.ts` | 94 | Canvas mouse/touch handler computing a normalised x from `clientX` | **dead** (never imported) |
| `src/numbers.ts` | 64 | Pre-renders 101 digit images into a 512x256x101 `rgba8unorm` atlas using 2D canvas and web fonts (Reddit Mono, JetBrains Mono) | **dead** (about 50.5 MiB if allocated; my arithmetic) |
| `src/common/defineControls.ts` | 62 | Typing helper for the upstream controls UI | **dead** (no module exports controls) |
| `src/common/setup-first-person-camera.ts` | 177 | Pointer-lock FPS camera | **dead** |
| `src/common/setup-orbit-camera.ts` | 249 | Orbit camera | **dead** |
| `package.json` | 28 | `typescript` aliased to `npm:tsover@^5.9.11`, vite 6, typegpu 0.10.x, unplugin-typegpu, wgpu-matrix, three, @webgpu/types | config |
| `vite.config.js` | 19 | `typegpuPlugin()`; `base` is the GitHub Pages path for `build` only (`vite.config.js:11-13`); `build.target: 'esnext'` for top-level await (`vite.config.js:16-18`) | config |
| `tsconfig.json` | 18 | strict, `noUnusedLocals`/`noUnusedParameters`, includes `src` and `index.ts` (so dead modules are still type-checked) | config |
| `.npmrc`, `LICENSE` (MIT, Software Mansion), `package-lock.json` | | | config |

Confirmed by a repo-wide grep: nothing imports `events.ts`, `numbers.ts`, or `common/*`. The outer shell's control builder iterates `Object.values(example)` and skips functions (`JB:73-76`), and `src/index.ts` exports only `onCleanup` (`JM:944`), so the controls panel stays empty (`JB:59-67`).

Insight for the learning site: `events.ts` (canvas pointer events) and `numbers.ts` (atlas of pre-baked digits) are **exactly what HTML-in-Canvas replaces**: a native `<input type=range>` gives pointer, keyboard and screen-reader behaviour (`JH:74`), and a live DOM `<div>` snapshot replaces the atlas (`JH:75`, `JM:773-800`).

### 6.2 What it demonstrates

A raymarched translucent "jelly" slider: a Verlet rope drives a Bezier SDF, rendered with refraction, Fresnel, Beer-Lambert absorption, scattering, ambient occlusion and fake bounce light, then temporally anti-aliased (`JM:140-741`, `slider.ts`, `taa.ts`). The HTML-in-Canvas parts:

1. **Invisible native control as the interaction layer.** `<input drawable id="slider" type="range">` with `opacity: 0` (`JH:74,17`) is never drawn into anything, yet it receives pointer and keyboard input because its geometry is synced to where the jelly appears (`JM:811-814`). Dragging it fires `input` (`JM:103`), which drives the jelly.
2. **DOM text rendered into a WebGPU texture** via `queue.drawElementImageToTexture` (`JM:782`) and sampled by the ground shader (`JM:519-548,621-626`). The text is spelled-out percent such as "Fifty-five %" (`JM:75-98`) in an `inert` div (`JH:75`).
3. **CSS as a theming API for the shader**: three CSS properties on the slider (`color`, `background-color`, `caret-color`) carry jelly colour, ground colour, and ground-text colour (`JH:23-25`), read by `getComputedStyle` (`JM:928-932`).
4. **Accessibility/preferences handling**: focus colour change, `prefers-color-scheme`, `prefers-contrast`, `forced-colors` (section 6.6), reduced motion/transparency (`JM:889-908`).

### 6.3 API call sites

| API / concept | Line(s) | Notes |
|---|---|---|
| `content="drawable"`, `layoutsubtree` | `JH:73` | Comment `JH:71-72`. |
| `drawable` on slider and value | `JH:74-75` | Both are direct canvas children. |
| `inert="true"` on value | `JH:75` | Value text is decoration; the range input already exposes the value. |
| Invisible control | `JH:17` `opacity: 0`; `JH:14` `cursor: grab` | |
| Native `input` event | `JM:103-108` | Sets `targetMouseX = t*1.9 - 1.0` (`JM:105`), text (`JM:106`), `requestPaint()` (`JM:107`). |
| `onpaint` | `JM:773` | Cast as `(canvas as any)` (no typings). |
| `drawElementImageToTexture(source, destination)` | `JM:774-780` (dicts), `JM:782` (call) | `source: {source: valueElement}`; `destination: {texture, size:{width,height}}`. |
| Legacy `copyElementImageToTexture` (dict form) | `JM:785-790` (log `JM:791`) | `{destination:{texture}, width, height}`. |
| Legacy `copyElementImageToTexture` (positional) | `JM:796-797` (log `JM:798`) | `(element, width, height, {texture})`; comment `JM:793-795`. |
| Texture usage flags | `JM:71` | `TEXTURE_BINDING \| COPY_DST \| RENDER_ATTACHMENT`: the same set `copyExternalImageToTexture` needs; suggests the browser renders into the texture (inferred). |
| `updateElementGeometry(el, {canvasTransform})` | `JM:811-814` | Same `DOMMatrix().translate(x, y)` for both elements. |
| Legacy `style.transform` fallback | `JM:816-817` | |
| Initial `requestPaint()` | `JM:820` | Unguarded call: on an unsupported browser this throws at module top level. |
| `requestPaint?.()` | `JM:933` | Optional-call form; inconsistent with `JM:107,820`. |
| Event-driven repaint | `JM:107`, `JM:933` | No self-re-arming loop (contrast `NS:64`, `GL:374`). |
| Independent rAF render loop | `JM:825-864,882` | |
| ResizeObserver (default box) | `JM:877-880` | No `device-pixel-content-box`. |
| Bitmap sizing in the shell | `JB:50-53` | `canvas.width = frame.clientWidth * devicePixelRatio`; RO on the **container** (`JB:56`). |
| Canvas wrapper | `JB:14-57` | Skips canvases with `width`/`height` attributes (`JB:15`); `container-type: size` (`JB:33`); square by default via `aspect-ratio` (`JB:41-43`). |
| `matchMedia` | `JM:885-889` | `forced-colors`, `prefers-color-scheme: dark`, `prefers-contrast: more`, `prefers-reduced-motion`, `prefers-reduced-transparency`. |
| `getComputedStyle` | `JM:928` | `color`, `backgroundColor`, `caretColor` at `JM:930-932`. |
| Listeners | `JM:906-907` (motion/transparency), `JM:936-940` (focus/blur/hc/dark/contrast) | Removed in `onCleanup` (`JM:944-955`). |
| `devicePixelRatio` | `JB:51`, `JM:809-810` | |
| Premultiplied canvas | `JM:51` | `alphaMode: 'premultiplied'` for the GPU canvas. |

### 6.4 Flow

1. `index.html` declares the canvas with a slider and a value div (`JH:73-76`) and loads `/index.ts` as a module (`JH:81`).
2. `JB` styles the body (`JB:3-11`), wraps each size-less canvas in a container/frame, sizes `canvas.width/height` from the frame times DPR (`JB:14-57`), and creates an (empty) controls panel (`JB:59-67`).
3. `await import('./src/index.ts')` (`JB:70`) runs `JM`, which `await`s `tgpu.init` (`JM:43-47`) and configures the canvas context (`JM:49-51`).
4. `JM` builds physics and textures from `canvas.width/height * qualityScale` (`JM:55-63`), allocates the one-off text texture (`JM:68-73`), wires the `input` listener (`JM:103-109`), builds camera, light and colour uniforms (`JM:116-138`), pipelines (`JM:743-753`) and bind groups binding `valueTexture` (`JM:759-771`).
5. `onpaint` is installed (`JM:773-819`) and `requestPaint()` fires once (`JM:820`). In the handler: first the texture refresh (with the fallback chain), then the geometry sync for both elements.
6. The rAF loop (`JM:825-864`) jitters the camera (`JM:827`), eases `currentMouseX` toward `targetMouseX` by 0.08 per frame (`JM:838`) or snaps if reduced motion (`JM:833-837`), steps physics (`JM:842-843`), raymarches into a ping-pong texture (`JM:847-854`), TAA-resolves (`JM:856`), and presents (`JM:858-861`).
7. User drags the invisible slider: `input` -> new target, new text, `requestPaint()` -> next paint refreshes the text texture.
8. Resize: the shell resizes the bitmap (`JB:50-56`); `handleResize` rebuilds render textures, TAA and bind groups (`JM:866-875`).
9. Theme/focus/media events call `updateColors` (`JM:927-941`), which re-reads computed style and writes uniforms.

### 6.5 How the transform is mapped (and how good it is)

Code (`JM:808-818`):

- `sliderHeight = sliderElement.clientHeight || canvas.clientHeight * 0.125` (CSS px; the fallback equals the CSS height `12.5%`, `JH:16`).
- `x = (canvas.width / devicePixelRatio) / 8` -> CSS px; the slider is `75%` wide (`JH:15`), so `(100% - 75%) / 2 = 12.5% = 1/8`: horizontally centred.
- `y = (canvas.height / devicePixelRatio) / 2 - sliderHeight / 2` -> vertically centred.
- `transform = new DOMMatrix().translate(x, y)`: **translate only, scale 1**, applied to **both** `valueElement` and `sliderElement`.

Notes:

- The matrix is in **CSS px** (no DPR factor on the result), consistent with `GL:156-159`.
- Because `canvasTransform` maps the element's own border box origin to `(x, y)`, giving the same translate to both elements puts both at the same canvas rectangle for geometry purposes. In layout they are stacked (the value div sits below the slider). The legacy fallback (`JM:816-817`) uses a CSS `translate`, which is **relative to the layout position**, so the two paths place the value div differently (inferred). The value div is `inert`, so its geometry has no hit-test or AX effect.
- The commented-out code (`JM:802-807`) shows the intended derivation: `mvp = proj * view`, then project the slider box. The `TODO(pdr)` says the values are hard-coded for now.
- **Quality check (my calculation):** with the camera at `(0, 2.7, 1.9)` looking at the origin, FOV PI/4, square aspect (`JM:116-124`), the jelly's rest endpoints `(-1,0,0)` and `(0.9,0,0)` project to about **13.4%** and **82.9%** of the canvas width, and its vertical centre is **50%** with roughly +-5% extent. The hard-coded hit rect spans 12.5% to 87.5% horizontally and 43.75% to 56.25% vertically. So it is a close hand-tuned approximation, slightly wider than the visible jelly on the right. A real derivation would project the slider's world-space bounding box with `proj * view` and apply a Y flip.
- **Text region coupling:** the ground text lives at world `x,z` within a 1.9 x 0.33 rectangle (`JM:522-523`), the DOM text box is 75% x 12.5% (aspect 6:1, `JH:60-63`), and the TAA text region is the screen-space rectangle `x 0.71-0.85, y 0.47-0.55` (`taa.ts:40-43`). The first two being close (5.76:1 vs 6:1) suggests the element is **stretched to the full destination size**: the destination size passed is the **whole canvas** `{width, height}` (`JM:779`), not the element's own size. The Chrome docs confirm the semantics: `size` is "the width and height (in physical texture pixels) to **scale and rasterize** the element within the destination texture" (`gpu:78`). The docs' own geometry snippet (`gpu:113-127`) is the jelly's formula generalised: `x = canvasCssWidth / 8`, `y = (canvasCssHeight - elementCssHeight) / 2`, with `canvasCssWidth = canvas.width / scaleX` instead of the demo's `canvas.width / devicePixelRatio` (`JM:809-810`).

### 6.6 Theming, accessibility, and what it implies for the privacy rules

**Theme table (from `JH:10-59`; cascade order matters because the forced-colors block comes last at equal specificity):**

| State | Jelly (`color`) | Jelly on `:focus` | Ground (`background-color`) | Ground text (`caret-color`) | Lines |
|---|---|---|---|---|---|
| Default (light) | `rgb(255,115,19)` | `rgb(51,153,255)` | `rgb(255,255,255)` | `rgb(40,40,40)` | `JH:19-25,27-29` |
| `prefers-color-scheme: dark` | unchanged | unchanged | `rgb(26,26,26)` | `rgb(204,204,204)` | `JH:30-35` |
| `prefers-contrast: more` (light) | `rgb(255,51,0)` | `rgb(0,0,255)` | white | `rgb(0,0,0)` | `JH:36-43` |
| `prefers-contrast: more` + dark | `rgb(255,51,0)` | `rgb(0,0,255)` | `rgb(26,26,26)` | `rgb(255,255,255)` | `JH:36-48` (nested dark block `JH:44-48`) |
| `forced-colors: active` | `transparent` | `Highlight` | `Canvas` | `CanvasText` | `JH:50-58` |

Also: `:root { color-scheme: light dark; }` (`JH:10-12`). Focus uses `:focus`, not `:focus-visible`, so a mouse click also turns the jelly blue (`JH:27`).

**How the JS consumes it.** `updateColors` (`JM:927-934`) reads the **computed** style of the slider: `color` into the 4-channel jelly uniform (`JM:930`, alpha preserved), `background-color` into the ground uniform (`JM:931`), `caret-color` into the ground-text uniform (`JM:932`), then `requestPaint?.()` (`JM:933`). It reruns on `focus`/`blur` of the slider and on changes of the `forced-colors`, `prefers-color-scheme` and `prefers-contrast` media queries (`JM:936-941`). The colour parsers are regexes for `rgb()/rgba()` with commas (`JM:910-925`); anything else falls back to white (`JM:915,924`), a silent failure mode if a browser serialises computed colours in another syntax (for example space-separated `rgb(26 26 26)` or `color(srgb ...)`) (verify).

**Forced colors behaviour.** In forced-colors the jelly is `transparent` (alpha 0), and the shader blends `mix(background, jelly, alpha)` (`JM:710`), so the jelly disappears except when focused (`Highlight`), leaving ground and text in system colours: the jelly degrades into a focus indicator only.

**Reduced motion/transparency** (`JM:889-908`, `JM:833-840`): if either `prefers-reduced-motion` or `prefers-reduced-transparency` matches, damping is 1.0, arch strength 0, scatter strength 0, the rope target is followed directly, and `restLen` follows the current stretch (`JM:834-836`); otherwise damping 0.01, arch 2.0, scatter `JELLY_SCATTER_STRENGTH`, eased motion. The `render` function reads `motionMedia`/`transparencyMedia` (`JM:833`) that are declared later in the module (`JM:889`); it works only because the first rAF callback runs after module evaluation (a TDZ hazard if refactored).

**Accessibility facts.**
- The range input keeps native keyboard, pointer and screen-reader semantics. Geometry sync gives it a bounding box in the accessibility tree (`README.md:44,317`).
- The value div is `inert` (`JH:75`), so it is excluded from the accessibility tree: the number is announced through the range input, not the decoration.
- There is no focus ring from the browser (the control is transparent); the visible focus indicator is the **jelly colour change** (`JH:27-29,41-43,56-58`).
- If an unsupported browser loads the page, `JM:820` throws before the render loop starts (`JM:882`), so there is no graceful fallback to a normal slider (inferred).

**Implications for the privacy rules** (`README.md:295-313`, `security-privacy-questionnaire.md` Q1, Q3, Q6):

1. The rule: painting and the `paint` event must not reveal anything not already observable to author code (`README.md:295`). Sensitive-for-painting items include "System colors, themes, or preferences" (`README.md:301`); `forced-colors` is explicitly not sensitive (`README.md:313`).
2. The jelly respects that structure: the **only DOM content that is drawn** is the value div, which is plain white text on a transparent background (`JH:60-68`) with no media-query dependence. Its snapshot is therefore identical for every user preference, so it cannot leak any.
3. The **theme-dependent values never travel through pixels**. They travel through channels that are already author-visible: `matchMedia` (`JM:885-889`) and `getComputedStyle` (`JM:928`). The slider that carries the CSS rules is never painted (`opacity: 0`), so even media-query-dependent styling on it exposes nothing through the snapshot.
4. The recolouring of the text happens in the **shader** (`JM:621-626`) using the uniform from `caret-color` (a convenient unused colour property), not by letting the DOM text carry a theme colour into the texture.
5. System colour keywords (`Canvas`, `CanvasText`, `Highlight`, `JH:53-58`) resolve to concrete `rgb()` through computed style, which the page can already read today; if instead an author put `color: CanvasText` on a drawn element and expected the snapshot to contain the user's real system colour, the explainer's rule says that painting is excluded (inferred: it would paint a normalised default).
6. Teaching rule for the site: **keep drawn DOM theme-independent; pass theme through JS-readable signals into your own shader or 2D styling.** Native-control appearance (scrollbars, form controls) is allowed because it is already detectable (`README.md:311`); OS accent/system palettes are not.
7. Questionnaire alignment: "reveal form control rendering, scrollbar rendering, text selection, find-in-page selection, and the caret blink rate (all without revealing OS theme colors)" (`security-privacy-questionnaire.md`, Q1) matches the demo: it uses the caret **colour** as a data channel, which is author-set and unrelated to caret blink rate.

### 6.7 Reusable patterns

- **Invisible semantic controller + custom renderer**: a native control with `opacity: 0`, drawable, geometry-synced, with the visuals driven from its events (`JH:17,74`; `JM:103-108,811-814`).
- **CSS-variables-as-theme-for-shaders** (`JH:19-25`; `JM:927-934`): three CSS properties -> three uniforms, refreshed on focus/blur/media changes.
- **DOM text to GPU texture** with the right usage flags and a fallback chain (`JM:68-73,773-800`).
- **Decoupled loops**: rAF for GPU, paint event for DOM freshness and geometry (`JM:773-820` vs `825-864`).
- **Reduced-effects gate**: one `reduce = motion || transparency` switch controlling physics and shader strength (`JM:892-908`).
- **Responsive canvas frame** (container queries + DPR-sized bitmap) (`JB:14-57`).

### 6.8 Pitfalls and subtle details

- **Texture not resized with the canvas.** `valueRawTexture` is created once with the initial `width x height` (`JM:68-73`). `handleResize` updates `width`/`height` and rebuilds the other textures and bind groups (`JM:866-875`) but not `valueRawTexture`, and `onpaint` always passes the **current** `width/height` as destination `size` (`JM:777-780`). After a grow, the requested size exceeds the texture (a WebGPU validation error is likely); after a shrink, the element lands in a sub-rect and the text mapping skews. No `requestPaint()` follows a resize either (inferred, verify).
- **Alpha handling of the text mask.** The shader uses only the `.x` channel of the white-on-transparent text as a coverage mask (`JM:542-547,624`). The Chrome docs state that `premultipliedAlpha` on the destination **defaults to false** (`gpu:83`), so antialiased edge texels are stored un-premultiplied; whether `.x` equals coverage there (versus 1.0) depends on what colour the browser writes for partially transparent pixels (verify; would affect edge softness of the engraved text).
- **Catch-all fallback chain masks errors.** The first `try` swallows any exception, including real new-API failures such as "no snapshot yet", and falls into legacy calls that then throw `TypeError: ... is not a function` (`JM:781-800`). Prefer `typeof queue.drawElementImageToTexture === 'function'`.
- **No typings**: `(canvas as any)` everywhere (`JM:107,773,782,811-813,820,933`). Ship a `.d.ts` shim.
- **Sizing differs from the other demos**: `JB:50-53` uses `frame.clientWidth * devicePixelRatio` (a fractional product assigned to an integer attribute, so it truncates) and the RO observes the **container** (`JB:56`), so DPR-only changes (a window dragged to another monitor at the same CSS size) may not trigger it, unlike `device-pixel-content-box`. The inner RO (`JM:877-880`) observes the canvas with the default box. Both rely on callback order: the shell's observer was registered first, so `canvas.width` is already updated when `handleResize` reads it (inferred).
- **Text size independent of the canvas**: `font-size: 5vmin; line-height: 10vmin` (`JH:65-66`) use viewport units, and the div is 12.5% of the canvas high (`JH:62`).
- **Camera far plane inconsistency**: constructor default `far = 10` (`camera.ts:53-54`) vs `updateProjection` default `far = 100` (`camera.ts:107`), so the first resize changes the far plane.
- **Hard-coded screen-space region in TAA** (`taa.ts:40-52`) must be re-tuned if the camera or text box changes.
- **`requestPaint()` use is partly redundant**: a text change already invalidates the snapshot (`README.md:32`), and `JM:933` follows a pure uniform write. Harmless, but do not teach it as required.
- **Top-level `await`** in both `JM:43` and `JB:70` is why `build.target` must be `esnext` (`vite.config.js:16-18`).
- Build tooling note: the project ships a `package-lock.json` (npm); for this team's pnpm convention use `pnpm import`/`pnpm install` and keep the `typescript: npm:tsover@...` alias.

### 6.9 Lab and trial

**Lab: "Theme Lab"**
- Controls: edit the CSS variables (`--jelly-color`, `--ground-color`, `--text-color`); toggle emulated `prefers-color-scheme`, `prefers-contrast`, `forced-colors`, reduced motion/transparency (via a `matchMedia` shim in the lab sandbox or browser rendering emulation).
- Live panel: computed `color`/`backgroundColor`/`caretColor` strings, parsed uniform values, and a warning when the regex fails.
- Second tab: "snapshot vs computed style": draw a div whose colour is `CanvasText` into a texture and compare against the `getComputedStyle` reading, to show why theme data must travel by JS.
- Learning point: drawn DOM stays theme-independent; theme goes through readable channels.

**Trial A: "Align the Hit Rect"**
- Solve the `TODO(pdr)` (`JM:802-807`): compute the canvas transform from the camera `view`/`proj` instead of constants.
- Win when the slider's `getBoundingClientRect()` (which the transform affects, per `README.md:386-388`) has an IoU of at least 0.9 with the jelly's projected bounding box across 5 random canvas sizes and DPRs, and a scripted drag on the rect moves the jelly.

**Trial B: "Accessible Jelly"**
- Make the jelly robust: keyboard operation changes the value; focus visibly changes the jelly in light, dark, contrast-more and forced-colors; reduced motion snaps the rope; the value div stays out of the accessibility tree.
- Win when an automated run with each emulation shows the expected computed colours and the focus colour change, and arrow keys change `value` by the step.

**Trial C (stretch): "Resize Without Breaking"**
- Fix the stale `valueRawTexture` (section 6.8): recreate it on resize, rebuild the bind group, and request a paint. Win when resizing 10 times leaves the ground text correct and no WebGPU validation errors are logged.

---

## 7. Chrome developer-docs samples (`docs-llm/html-in-canvas-blogs/`)

### 7.0 What these are

Five pages from `developer.chrome.com/docs/web-platform/html-in-canvas`: `index.md` (overview + framework snippets), `concepts.md` (shared concepts), `2d.md`, `webgl.md`, `webgpu.md`. They contain **fragments, not runnable demos**: identifiers such as `myElement`, `draw3DScene()`, `elementX` are placeholders, and some snippets are internally inconsistent (noted below). Five explanatory videos are referenced but not present locally (`drawable-subtree-demo.mp4` `con:72`, `paint-event-demo.mp4` `con:106`, `nested-canvas-demo.mp4` `con:185`, `sync-geometry-demo.mp4` `con:222`, `update-element-geometry-demo.mp4` `2d:93`); two images are local under `assets/` (`canvas-dpr-diagram`, `canvas-blurry-vs-crisp`, `con:276,282`). Written for Chrome 157, which the pages say shipped the API (`con:426`; `idx:19`).

The docs never use the legacy `layoutsubtree` attribute (grep: zero hits), never use `texElementImage2D`/`copyElementImageToTexture`, and never use the `style.transform` geometry hack for the canvas-sync path (except the PixiJS snippet, 7.6).

### 7.1 Inventory of every sample

| ID | Source lines | Context | Shows | Closest official demo |
|---|---|---|---|---|
| CN-1 | `con:34-43` | markup | `content="drawable"` canvas with a `drawable` card containing a nested `drawable` `<button>` | `NS` |
| CN-2 | `con:51-63` (+table `65-68`) | markup | Drawable subtree A excludes nested subtree B | `NS:33,37` |
| CN-3 | `con:82-90`, `95-102` | 2D | `addEventListener("paint")`, `clearRect`, iterate `event.changedElements` | `GL:351-369` |
| CN-4 | `con:114-123` | lifecycle | DOM writes in `paint` land next frame | none |
| CN-5 | `con:131-181` | 2D, nested canvases | Child canvas paints before parent canvas | none |
| CN-6 | `con:193-206` | 2D | `requestPaint()` animation loop | `NS:64` |
| CN-7 | `con:236-247` | geometry | `preserveHitTestOrder` | none |
| CN-8 | `con:253-256` | geometry | `clearElementGeometry` | none |
| CN-9 | `con:292-304` | sizing | RO with `devicePixelContentBoxSize` fallback and feature detection | all (`CT:46-50` etc.) |
| CN-10 | `con:328-356` | sizing | `scaleX`/`scaleY` from `canvas.width / cssContentWidth` | none (demos use `devicePixelRatio`) |
| CN-11 | `con:360-377`, `381-388` | 2D | Centre a card with CSS-to-grid conversion; `box-sizing: border-box` | `PC:66-71` |
| CN-12 | `con:403-422` | a11y | figure/image/caption drawn separately (same as `README.md:322-340`) | `PC` |
| CN-13 | `con:428-435` | fallback | `supportsHtmlInCanvas()` via `canvas.content` reflection | none |
| 2D-1 | `2d:27-40` | 2D | Two elements drawn at fixed offsets | `NS:47,61` |
| 2D-2 | `2d:44-56` (+table `58-63`) | 2D | 3, 5, 7, 9-arg `drawElementImage` overloads | `NS:61` (5-arg only) |
| 2D-3 | `2d:75-89` | 2D geometry | `preserveElementGeometry: true` + manual `updateElementGeometry` | none |
| GL-1 | `gl:39-57` | WebGL | Allocate texture once with `texImage2D(null)` | `GL:202-211` |
| GL-2 | `gl:61-76` | WebGL | Allocate from `getElementImageDefaultSize` with `Math.ceil` | `GL:201-211` |
| GL-3 | `gl:82-98` | WebGL | `texElementSubImage2D` in `onpaint` | `GL:212` |
| GL-4 | `gl:106-133` | WebGL geometry | Upload, draw, then `DOMMatrix` + `updateElementGeometry` in `paint` | `GL:141-179` |
| GP-1 | `gpu:35-57` | WebGPU | `device.createTexture` sized by `Math.ceil(getElementImageDefaultSize)` | `JM:68-73` |
| GP-2 | `gpu:87-107` (+tables `65-83`) | WebGPU | `queue.drawElementImageToTexture(source, destination)` incl. source rect | `JM:774-782` |
| GP-3 | `gpu:113-127` | WebGPU geometry | The jelly's `x = W/8`, `y = centred` formula, generalised | `JM:808-814` |
| IDX-1 | `idx:48-55` | three.js | `THREE.HTMLTexture(uiElement)` on a `MeshBasicMaterial` | `GL` (concept) |
| IDX-2 | `idx:61-74` | PlayCanvas | `setSource` in a `{once:true}` paint listener; `requestPaint()`; re-upload on paint | none |
| IDX-3 | `idx:80-96` | Babylon.js | `BABYLON.HtmlTexture` on a `StandardMaterial` plane | none |
| IDX-4 | `idx:102-121` | PixiJS 8.19 | `HTMLSource` in a `Sprite`; `getElementTransform(el, matrix)` -> `style.transform` | none |
| IDX-5 | `idx:123-125` | CanvasUI | Link only | none |

### 7.2 `concepts.md` samples in detail

**CN-1, CN-2: markup and drawable subtree** (`con:34-43,51-68`).
- API: `content="drawable"` on a 600x400 canvas (`con:35`); `drawable` on `#parentElement` (`con:36`) and on the nested `<button id="childElement" drawable>` (`con:40`); no `layoutsubtree`.
- Paint boundary table: parent snapshot = panel + heading + paragraph; nested button = separate `drawElementImage` call (`con:65-68`).
- Differs from `NS`: the nested drawable is an interactive `<button>`, so it also exercises hit testing; the docs sell nesting as a way to "layer, position, or animate child elements independently" (`con:76`).
- Lab/trial: reuse "Nest or Not" (section 4.6); add a variant where the nested element is a button and the win is "clicking it increments a counter at its drawn position".

**CN-3: paint listener and `changedElements`** (`con:82-102`).
- API: `canvas.addEventListener("paint", ...)` (`con:83,96`); `ctx.clearRect(0, 0, canvas.width, canvas.height)` (`con:85`); `for (const el of event.changedElements)` (`con:98`).
- Trigger conditions: layout, text or CSS changes on any `drawable` descendant (`con:80`); `changedElements` holds "style changes, layout shifts, text edits, or focus state changes" (`con:93`). This confirms what section 3.3 had inferred for the pie chart's focus ring.
- Differences: demos assign `onpaint` and call `ctx.reset()`; `GL` wraps `changedElements` in `Array.from` and `includes` (`GL:353,360,365`) while the docs iterate it directly (`FrozenArray` is iterable).

**CN-4: frame lifecycle** (`con:114-123`).
- Drawing commands in `paint` appear in the current frame; `parentElement.style.backgroundColor = "#e0f2fe"` (`con:121`) schedules a new layout and shows next frame. Matches `README.md:32`.
- Why it matters for the demos: `GL:251` and `JM:811-814` call `updateElementGeometry` inside `paint`; geometry is not part of rendering, so it does not re-trigger paint (`README.md:44`). The jelly's text change (`JM:106`) happens outside `paint`, which is the safe place for DOM writes.
- Lab idea: "Next-Frame Trap": a handler mutates a style inside `paint` and the learner predicts one frame later vs same frame.

**CN-5: nested canvases** (`con:125-187`) (no official demo).
- Markup: `#parentCanvas` 800x600 `content="drawable"` -> `#wrapperElement drawable` -> `<canvas id="nestedCanvas" width="300" height="200" content="drawable">` -> `#nestedElement drawable` (`con:133-145`).
- Flow: paint fires on `nestedCanvas` first (reverse tree order, `con:127`): clear, `nestedCtx.drawElementImage(nestedElement, 10, 10)` (`con:160-166`); then on `parentCanvas`: clear, `parentCtx.drawElementImage(wrapperElement, 50, 50)` (`con:171-179`), which includes the freshly painted nested canvas pixels.
- Details: both canvases are sized by attributes only (no RO) and cleared with `clearRect`; the README restricts `drawElementImage` on "elements with other canvas ancestors" (`README.md:37`), so each element must be drawn into the **nearest** canvas.
- Lab/trial: "Nested Canvas Relay" (7.9).

**CN-6: `requestPaint()` animation** (`con:193-206`).
- `animatedX += 1.5` per paint (`con:197`), `drawElementImage(movingElement, animatedX, 200)` (`con:200`), `requestPaint()` inside the handler (`con:202`) plus an initial call (`con:205`).
- Differs from `GL:236-264`, which uses a `deltaTime`; this docs sample is frame-rate dependent (animation speed changes on a 120 Hz display). Same self-re-arming loop as `NS:64` and `GL:374`.

**CN-7: `preserveHitTestOrder`** (`con:232-247`).
- Default: every geometry update moves the element to the **top** of the hit-test stack ("last drawn = topmost click target", `con:234`); `preserveHitTestOrder: true` keeps its priority (`con:240,246-247`).
- Implication for the demos (inferred): `JM:813-814` updates the inert value div first and the slider second, so the slider ends up topmost, which is the right order; reversing the two lines would put the inert value element on top of the stack. `GL` updates only the visible element each frame, so it is always top.

**CN-8: `clearElementGeometry`** (`con:249-256`).
- Resets the canvas transform and "marks it as offscreen in the accessibility tree" (`con:251`). `GL` never calls it for the hidden card face (it relies on `inert`, `GL:111-128`); the docs imply `clearElementGeometry` is the dedicated tool for "un-drawn" elements (also `README.md:317`).

**CN-9, CN-10: sizing observers** (`con:286-356`).
- CN-9: `entry.devicePixelContentBoxSize` with fallback `Math.round(entry.contentRect.width * window.devicePixelRatio)` (`con:293-297`); the `box: 'device-pixel-content-box'` option is passed **only if** `'devicePixelContentBoxSize' in ResizeObserverEntry.prototype` (`con:299-303`). All demos pass the box unconditionally (`CT:50`, `PC:87`, `NS:98`, `GL:384`), which would throw a `TypeError` in an engine that lacks the enum value (inferred from WebIDL enum conversion).
- CN-10: `scaleX = canvas.width / cssContentWidth`, `scaleY = canvas.height / cssContentHeight`, computed from `entry.contentRect` (`con:330-348`). Used to convert CSS px to grid px (multiply) and grid px to CSS px (divide, `2d:84-85`, `gpu:118-120`).
- The docs explain **why**: when the grid is not 1:1 with device pixels, content is anti-aliased twice and looks blurry (360x180 CSS canvas, 300x150 grid, DPR 1.5 -> 540x270 device px, `con:274-280`; the 400x200 card on DPR 1.5 with a 400x200 vs 600x300 grid, `con:282-284`).
- Lab: "Blur Lab" (7.9).

**CN-11: centring with scale and `border-box`** (`con:358-388`).
- `width = card.offsetWidth * scaleX`, `x = (canvas.width - width) / 2` (`con:369-372`), `ctx.drawElementImage(card, x, y)` (`con:375`). Contrast `PC:67-71`, which multiplies by `devicePixelRatio`.
- CSS: `#card { box-sizing: border-box; width: 200px; padding: 16px; }` (`con:382-387`) because the element is drawn from its border box.

**CN-12: accessibility sample** (`con:392-422`).
- Same markup as `README.md:322-340` (a `<figure>` with a `drawable` `<img>` and `<figcaption>`), drawn at `(0,0)` and `(0,200)` (`con:418-419`) on a 400x300 canvas. Rules restated: no geometry yet means the element is exposed to AT **without geometry** (`con:394-399`); hide with `aria-hidden` or `inert` (`con:392`).
- Note both the image and the caption are drawables while the `<figure>` is not; semantics come from the DOM parent, pixels from separate draws.

**CN-13: feature detection** (`con:424-443`).
- Code: create a canvas, `setAttribute('content', 'drawable')`, return `canvas.content === 'drawable'` (`con:429-434`). This relies on the reflected enum attribute in the IDL (`README.md:109-111`: `ReflectOnly=("fallback","drawable")`); unsupported browsers have no `content` property, so it reads `undefined`.
- Caveat: this proves only the **attribute**. It does not prove `drawElementImage` (2D), `texElementSubImage2D` (WebGL) or `drawElementImageToTexture` (WebGPU) exist; the demos check those individually (`GL:171`, `NS:75`, `JM:811,933`) and sometimes not at all (`JM:107,820`).
- Fallback list: an alternative UI, floating HTML overlays, `three-html-render`, `html2canvas`, `dom-to-image` (`con:439-443`).

### 7.3 `2d.md` samples in detail

**2D-1: basic draw** (`2d:27-40`).
- `ctx.reset()` (`2d:34`), `drawElementImage(childElement1, 20, 20)` (`2d:36`), `drawElementImage(childElement2, 40, 90)` (`2d:38`, comment: "secondary nested button at a custom offset"). Offsets are literal grid px with no DPR conversion; `con:369-375` is the DPR-correct form. Contrast `NS:50-61`, which derives the nested offset from layout (`getInFlowRect`).

**2D-2: the four overloads** (`2d:42-63`).
- `(el, dx, dy)` (`2d:46`); `(el, dx, dy, dw, dh)` (`2d:49`); `(el, sx, sy, sw, sh, dx, dy)` (`2d:52`, crop at default scale); `(el, sx, sy, sw, sh, dx, dy, dw, dh)` (`2d:55`, crop then scale). All accept a trailing `options` (`DrawElementImageOptions`).
- **Mixed units:** destination args are grid px (`con:318`) but source rect args are **CSS px** (`con:320`). Official demos only use the 3-arg (`CT:42`, `PC:71`, `NS:47`) and 5-arg (`NS:61`) forms.
- Example scale: crop `90x30` from the source at `(0,0)`, draw at `(100,150)` into `180x60`, which is a 2x scale (`2d:55`).

**2D-3: manual geometry with `preserveElementGeometry`** (`2d:71-95`).
- Flow: draw with `{ preserveElementGeometry: true }` (`2d:77`); build a `DOMMatrix`; call `canvas.updateElementGeometry(targetElement, { canvasTransform })` (`2d:88`).
- The snippet converts grid px to CSS px with `e = x / scaleX`, `f = y / scaleY` (`2d:84-85`) and sets a scale `a = 1.5` (`2d:83`).
- **Snippet inconsistencies** (illustrative, not runnable): it draws at `elementX` (`2d:77`) but transforms by `x`; it sets `a = 1.5` while the draw call applies no scaling, and leaves `d = 1`. The accompanying video "shows how geometry gets out of sync" when `preserveElementGeometry` is set (`2d:95`), so the mismatch is the point.
- No official demo uses `preserveElementGeometry`; both `CT` and `PC` rely on the automatic update.

### 7.4 `webgl.md` samples in detail

**GL-1/GL-2: allocation** (`gl:31-76`).
- "Unlike a 2D canvas ... a WebGL context requires explicit memory management" and pre-allocation "lets the browser perform fast sub-image updates without triggering expensive GPU memory re-allocations" (`gl:33-35`).
- GL-1: guard with `textureBufferAllocated` so it runs once (`gl:41,55`). GL-2: size from `canvas.getElementImageDefaultSize(myElement)` and **`Math.ceil(width)`, `Math.ceil(height)`** (`gl:62,69-70`), "Only do this once, or whenever the element changes size" (`gl:63-64`).
- Differs from `GL:195-232`: the demo re-allocates on every upload, does not ceil, and calls `gl.canvas.getElementImageDefaultSize` (same method, reached via the canvas).

**GL-3: upload** (`gl:82-98`).
- `canvas.onpaint = () => { ... gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, myElement); }` (`gl:83,88-94`), with the comment that the source can be `myElement` "or an ElementImage from `captureElementImage()`" (`gl:93`), the only mention of `ElementImage` in the docs.
- Not mentioned: `UNPACK_FLIP_Y_WEBGL` (the demo sets it, `GL:328`), texture filtering (`GL:186-189`), or `changedElements` gating (`GL:351-369`).

**GL-4: geometry** (`gl:100-133`).
- Order inside one `paint` listener (`gl:107`): bind and upload (`gl:109-110`), `draw3DScene()` (`gl:113`), then build the transform and call `updateElementGeometry` (`gl:118-131`).
- Matrix: `a = canvas.clientWidth / myElement.offsetWidth`, `d = canvas.clientHeight / myElement.offsetHeight`, `e = 50`, `f = 100` (`gl:120-126`), explicitly "CSS-pixel transform mapping the element's border box to its drawn position" (`gl:115-116`). The numbers are placeholders ("for example: scale and translate", `gl:117`); the real computation is the projection chain in `GL:141-179` (section 5.5).
- Purpose stated: "Update DOM position, accessibility focus rings, and pointer hit-testing" (`gl:128`). The video `con:222-224` shows the failure mode: stop calling `updateElementGeometry` and "the card keeps turning, but clicks still land where it used to be".

### 7.5 `webgpu.md` samples in detail

**GP-1: texture allocation** (`gpu:31-57`).
- `const size = canvas.getElementImageDefaultSize(myElement)`, then `Math.ceil` for width and height (`gpu:40-42`); `device.createTexture({ size: {width, height, depthOrArrayLayers: 1}, format: "rgba8unorm", usage: TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT })` (`gpu:45-56`), "run once during setup" (`gpu:44`).
- Same usage flags and format as the jelly (`JM:68-73`), which supports reading them as the usage bits a destination texture needs (the page shows them but does not say they are mandatory). The jelly differs in sizing: it uses the **canvas** grid size, not the element's default size (`JM:60,69`), and stretches the element to it.

**GP-2: `drawElementImageToTexture`** (`gpu:59-107`).
- `source` table: `source` (Element or `ElementImage`, required) plus `sourceX/Y/Width/Height` in **CSS px**, "all four or none" (`gpu:65-71`).
- `destination` table: `texture` (required), `size` ("to scale and rasterize the element within the destination texture", `gpu:78`), `origin`, `mipLevel`, `aspect`, `colorSpace` (default `"srgb"`), `premultipliedAlpha` (default `false`) (`gpu:77-83`).
- Code: `sourceDict = { source: myElement, sourceX: 0, sourceY: 0, sourceWidth: myElement.offsetWidth, sourceHeight: myElement.offsetHeight }`, `destDict = { texture, size: {width, height} }`, `device.queue.drawElementImageToTexture(sourceDict, destDict)` inside `canvas.addEventListener("paint", (event) => ...)` (`gpu:88-106`).
- Differs from `JM:774-782`: the jelly passes only `source`, never the source rect, and carries a two-stage legacy fallback (`JM:784-799`) that the docs omit.

**GP-3: geometry** (`gpu:109-127`).
- `canvasCssWidth = canvas.width / scaleX`, `canvasCssHeight = canvas.height / scaleY`, `elementCssHeight = getElementImageDefaultSize(el).height / scaleY`, `x = canvasCssWidth / 8`, `y = (canvasCssHeight - elementCssHeight) / 2`, `transform = new DOMMatrix().translate(x, y)` (`gpu:118-123`), then `updateElementGeometry(el, { canvasTransform: transform })` (`gpu:126`). Comment: "1/8 of the canvas width from the left edge, vertically centered" (`gpu:116`). This is the same maths as `JM:808-814` with `scaleX/scaleY` in place of `devicePixelRatio`, and `getElementImageDefaultSize` in place of `clientHeight || 12.5%`.

### 7.6 `index.md` framework snippets

These are the only code that hides geometry/texture plumbing behind a library. For a learning site they make a good "what does the wrapper do under the hood?" bridge.

| ID | Library | Lines | What the snippet does | What it hides / unexplained |
|---|---|---|---|---|
| IDX-1 | three.js (experimental, PR 31233) | `idx:46-55` | `material.map = new THREE.HTMLTexture(uiElement)`; `BoxGeometry(1,1,1)` mesh | Texture allocation, per-paint upload, geometry sync. The README links the same family of demo (`README.md:287`). Whether hit testing is synced automatically is not shown (verify). |
| IDX-2 | PlayCanvas | `idx:57-74` | `canvas.addEventListener('paint', () => htmlTexture.setSource(htmlElement), { once: true })`, then `canvas.requestPaint()`, then a persistent `paint` listener `onPaintUpload`; assigns `material.diffuseMap = htmlTexture` | **Pattern:** the source is attached only **after the first paint**, because a snapshot does not exist before then (`README.md:37`); `requestPaint()` forces that first event. Compare `GL:346-349` (lazy GL setup in first paint). |
| IDX-3 | Babylon.js | `idx:76-96` | `new BABYLON.HtmlTexture("htmlTexture", uiElement, scene)`, `StandardMaterial.diffuseTexture`, plane `1.6 x 0.9`, `engine.runRenderLoop` | Step numbering starts at "2." (the "select the element" step is elided). Upload/geometry handled by the class. |
| IDX-4 | PixiJS v8.19.0 (PR 12077) | `idx:98-121` | `import { HTMLSource } from 'pixi.js/html-source'`; `app.canvas.appendChild(htmlElement)` (the element must be a **direct child of the canvas**, `idx:107-108`); `Sprite.from(new HTMLSource({ resource: form, autoUpdate: true }))`; in `app.ticker`: `const syncT = app.canvas.getElementTransform(htmlElement, finalTransform); if (syncT) htmlElement.style.transform = syncT.toString();` | **Discrepancy:** here `getElementTransform` takes **two** arguments and may return a falsy value, and the result is applied as a **CSS `transform`** on the element. The README IDL declares `getElementTransform(element)` with one argument returning a `DOMMatrix` (identity if unset) (`README.md:126-130`), and the demos call the CSS-transform approach "Older approach (do not use)" (`GL:176-177`). Treat as unresolved (verify what the second argument is and whether this is a convenience that converts a canvas-space transform into the CSS transform the DOM needs). |
| IDX-5 | CanvasUI | `idx:123-125` | Link to an open-source UI component library built on HTML-in-Canvas | no sample |

The overview also points to a community demo collection (`idx:139`) and to Modern Web Guidance for coding agents (`idx:28,127-129`).

### 7.7 Questions the Chrome docs resolve (or leave open)

| Question from the demos | Answer from the docs | Status |
|---|---|---|
| Units of `canvasTransform` | CSS px (`con:322`; "CSS-pixel transform", `gl:115`; `gpu:113-114`) | resolved |
| Units of `getElementTransform` / `canvasClip` | CSS px (`con:322`) | resolved |
| Units of source rects | CSS px (`con:320`), unlike 2D destination args (grid px) | resolved |
| WebGPU `size` semantics | Scale and rasterize into the destination (`gpu:78`); default is the element's grid size rounded up (`con:321`) | resolved |
| Is `focus` a paint trigger? | Yes (`con:93`) | resolved |
| Default hit-test order on geometry update | Moved to top (`con:234,246`) | resolved |
| Colour space / alpha of WebGPU uploads | `colorSpace` default `"srgb"`; `premultipliedAlpha` default `false` (`gpu:82-83`) | resolved (effect on the jelly's `.x` mask: verify) |
| Does a paint event follow a bitmap-only resize? | Not addressed; the RO samples (`con:293-297,333-349`) do not call `requestPaint()` | open |
| Implicit first paint without `requestPaint()` | Not addressed; docs always call it (`con:205`, `idx:66`) | open |
| `UNPACK_FLIP_Y_WEBGL` on element uploads | Not mentioned in `webgl.md` | open |
| WebGL viewport after resize | Not mentioned | open |
| `inert` vs snapshot painting | `inert`/`aria-hidden` only discussed for AT exposure (`con:392`) | open |
| Meaning of 2-arg `getElementTransform` (Pixi) | Not documented in these pages | open |

### 7.8 Where the docs differ from the `Examples/` demos

| Topic | `Examples/` demos | Chrome docs | Why it matters |
|---|---|---|---|
| Opt-in attributes | `content="drawable"` **and** `layoutsubtree` everywhere (`CT:15` etc.) | `content="drawable"` only (zero `layoutsubtree` hits) | Teach `content` first; mention `layoutsubtree` only as a legacy compat note. |
| Paint handler style | `canvas.onpaint =` | Mixed: `onpaint` (`2d:33`, `gl:83`, `con:364,413`) and `addEventListener("paint")` (`con:83,96,115,160,171,196`, `gl:107`, `gpu:88`, `idx:63,69`) | Both are valid; only `addEventListener` allows several listeners (PlayCanvas uses two, `idx:63-69`). |
| Clearing | `ctx.reset()` (`CT:39`, `PC:41`, `NS:45`) | `ctx.reset()` in `2d:34`, `con:365,414`; `ctx.clearRect(...)` in `con:85,162,173,198` | `clearRect` does not reset the transform; handlers that `translate` need `reset()`. |
| Feature detection | Per-API checks: `canvas.updateElementGeometry !== undefined` (`GL:171`, `JM:811`), `convertRectFromNode` (`NS:75`), try/catch chains (`GL:199-231`, `JM:781-800`); some calls unguarded (`JM:107,820`) | `supportsHtmlInCanvas()` via `canvas.content` reflection (`con:428-435`) | Good first gate, but add per-context checks (CN-13). |
| ResizeObserver | `{box: 'device-pixel-content-box'}` unconditionally; no fallback | Feature-detects `devicePixelContentBoxSize` and falls back to `Math.round(contentRect * devicePixelRatio)` (`con:293-303`) | Robustness across engines; the jelly shell already uses a DPR-based fallback-style sizing (`JB:50-53`) but without rounding. |
| Grid-to-CSS ratio | `devicePixelRatio` (`CT:41`, `PC:67-68`, `NS:54,87-90`, `JM:809-810`) | `scaleX = canvas.width / cssContentWidth` (`con:347-348`) | Correct under zoom, fractional DPR, and CSS-scaled canvases. |
| Texture size | Raw `getElementImageDefaultSize` (`GL:201-206`); jelly uses canvas size (`JM:68-73`) | `Math.ceil` of the default size (`gl:69-70`, `gpu:41-42`); default is "rounded up" (`con:321`) | Fractional element sizes. |
| Allocation frequency | Every upload (`GL:202-211`) | Once, or when the element size changes (`gl:40-56,63-64`, `gpu:44`) | Avoid GPU re-allocation per frame. |
| `changedElements` use | `Array.from` + `includes` gating (`GL:351-369`) | Plain `for...of` iteration (`con:98`) | Both fine; demo is the more efficient pattern. |
| Legacy APIs | Keeps `texElementImage2D`, `copyElementImageToTexture`, `style.transform` fallbacks | None (except the Pixi CSS-transform sync, `idx:116-119`) | Old fallbacks are demo-only baggage. |
| Source rect units | Not used | CSS px (`con:320`) | A trap: crop args are CSS px while `dx,dy,dw,dh` are grid px. |
| Centring | `offsetWidth * devicePixelRatio` (`PC:67-71`) | `offsetWidth * scaleX` (`con:369-372`) | See above. |
| Border box | `box-sizing: border-box` only on `GL` (`GL:19,43`) | Recommended explicitly (`con:379-388`) | Drawn size equals the border box. |
| Nested drawable placement | `getInFlowRect` with `convertRectFromNode` (`NS:69-91`) | Fixed offsets (`2d:36-38`, `con:88-89`) | The docs never show how to derive a nested element's offset from layout. |
| Animation | `deltaTime` in `GL:236-237` | Fixed step per paint (`con:197`) | Frame-rate dependence. |
| Geometry order | Updates inert value then slider (`JM:813-814`) | Last update is topmost (`con:234`) | Hit-test stacking is order dependent. |
| Frameworks | none | three.js, PlayCanvas, Babylon.js, PixiJS, CanvasUI (`idx:44-125`) | Good for an "under the hood" lesson. |
| Spec status | "temporary backwards compatibility" comments (`CT:13-14`) | "shipped in Chrome 157" (`con:426`) | Teach the new names; browser support wording changes. |

### 7.9 Additional lab/trial ideas for docs-only features

**Blur Lab / Trial "Crisp Circle"** (`con:258-284`)
- Lab: a 360x180 CSS canvas at simulated DPR 1.5 with grid 300x150, 540x270, and arbitrary values; a circle and a text card are drawn; the learner flips between grids and watches edge sharpness; a metric counts partially transparent pixels along the circle's edge.
- Trial: reach the crisp state using only the RO callback, including the `Math.round(contentRect * dpr)` fallback when `devicePixelContentBoxSize` is stubbed away. Win: edge metric below a threshold at DPR 1, 1.5, 2, 3 and `canvas.width/height` equal the device pixel box.

**Desync Detective** (`2d:71-95`, `con:210-230`)
- Lab: toggle `preserveElementGeometry`, draw offset, and scale; an overlay shows the drawn rect vs the hit-test rect (from `getBoundingClientRect`).
- Trial: a button is drawn but clicks land elsewhere; fix the matrix (`e = x / scaleX`, `f = y / scaleY`). Win: a scripted click at the drawn centre fires the button, and the hit rect is within 1 CSS px of the drawn rect.

**Stacking Order Arena** (`con:232-256`)
- Lab: two overlapping drawables; reorder `updateElementGeometry` calls; toggle `preserveHitTestOrder`; call `clearElementGeometry` on one and watch the "offscreen" AX state in a simulated tree.
- Trial: update the backdrop every frame without stealing clicks from the foreground. Win: clicks always reach the foreground element across 100 frames.

**Nested Canvas Relay** (`con:125-187`)
- Lab: nested `<canvas content="drawable">` with log output showing paint order.
- Trial: make the parent canvas show the child's hover state in the same frame. Win: parent pixels at the child's location change within the frame that the pointer enters.

**Crop and Scale Bench** (`2d:42-63`, `con:320`)
- Lab: four overload forms with live units labels (CSS vs grid).
- Trial: reproduce a target image with a given crop and scale at DPR 2. Win: pixel diff under a threshold; bonus if the learner notices that source rects are CSS px.

**Texture Budget** (`gl:31-76`, `gpu:31-57`, `con:321`)
- Lab: toggle "allocate every upload" vs "allocate once", `Math.ceil` on/off, element widths like `10.5px` at DPR 1.5; HUD counts `texImage2D`/`createTexture` calls per second and shows texel size.
- Trial: stop re-allocating without cutting off the last row/column. Win: at most one allocation per size change and no clipped pixels at fractional sizes.

**Wrapper Matching Game / Trial "Write Your Own HtmlTexture"** (`idx:44-121`)
- Lab: the same card shown through four stubbed wrappers (`THREE.HTMLTexture`, `pc` texture, `BABYLON.HtmlTexture`, Pixi `HTMLSource`); the learner matches each wrapper concept to the underlying call (`texElementSubImage2D`, `requestPaint`, `updateElementGeometry`, `getElementTransform`).
- Trial: implement a minimal `HtmlTexture` for raw WebGL that attaches the source only after the first paint (the PlayCanvas pattern `idx:62-66`), re-uploads when `changedElements` includes the element, and syncs geometry. Win: texture shows the live element, a scripted click reaches it, and no exception is thrown before the first paint.

**Support Check** (`con:424-443`)
- Lab: stub engines (no `content` reflection; has `content` but no `drawElementImage`; full support) and see which gates pass.
- Trial: implement `supportsHtmlInCanvas()` plus per-context checks and route to a fallback (overlay or `html2canvas`). Win: no exception and a usable UI in all three stubbed environments.

---

## 8. Proposed helper library (consolidated from all demos)

Names are suggestions; `ref` shows the demo or doc code each helper generalises.

| Helper | Signature (TypeScript) | Purpose | ref |
|---|---|---|---|
| `supportsHtmlInCanvas` | `(): boolean` | The docs' gate: create a canvas, set `content="drawable"`, return `canvas.content === 'drawable'`. | `con:428-435` |
| `detectHtmlInCanvas` | `(): { attr: boolean; onpaint: boolean; ctx2d: boolean; webgl: boolean; webgpu: boolean }` | Per-surface detection (`'onpaint' in canvas`, `drawElementImage` on `CanvasRenderingContext2D.prototype`, `texElementSubImage2D` on `WebGL2RenderingContext.prototype`, `drawElementImageToTexture` on `GPUQueue.prototype`) on top of `supportsHtmlInCanvas`, instead of try/catch chains. | `GL:171`, `JM:781-800`, `JM:820`, `con:428-435` |
| `markDrawable` | `(canvas: HTMLCanvasElement, ...children: Element[]): void` | Sets `content="drawable"` + legacy `layoutsubtree` + `drawable`. | `CT:15-16` |
| `observeCanvasGrid` | `(canvas, onChange: (g: {gridW:number; gridH:number; cssW:number; cssH:number; scaleX:number; scaleY:number}) => void, opts?: {requestPaint?: boolean}): () => void` | RO that passes `box: 'device-pixel-content-box'` only when `'devicePixelContentBoxSize' in ResizeObserverEntry.prototype`; falls back to `Math.round(contentRect * devicePixelRatio)`; records CSS size, grid size, and `scaleX/scaleY`; optionally requests a paint after resizing. | `CT:46-50`, `GL:378-384`, `JB:50-56`, `con:292-304,328-356` |
| `createPaintLoop` | `(canvas, handler: (ev: CanvasPaintEvent) => void, opts?: { continuous?: boolean; pauseWhenHidden?: boolean; reducedMotion?: 'stop'\|'ignore' }): { stop(): void; paintOnce(): void; stats(): { paints: number } }` | Assigns `onpaint`, performs the initial `requestPaint`, optionally re-arms; exposes counters for the "Paint HUD". | `NS:64`, `GL:374-376`, `JM:773,820` |
| `gridScale` / `cssToGrid` / `gridToCss` | `(canvas): {x:number; y:number}` ; `(canvas, cssPx: number, axis?): number` ; `(canvas, gridPx: number, axis?): number` | `canvas.width / cssContentWidth` (docs' `scaleX/scaleY`) rather than raw `devicePixelRatio`; `gridToCss` is the `x / scaleX` conversion needed for `canvasTransform`. | `CT:41`, `PC:67-68`, `NS:86-90`, `con:347-348`, `2d:84-85` |
| `getDefaultGridSize` | `(canvas, el, opts?: {ceil?: boolean}): {width:number; height:number}` | Wraps `getElementImageDefaultSize` (`Math.ceil` for texture sizes); falls back to `offsetWidth/Height * gridScale`. | `GL:201`, `PC:67-68`, `gl:62-70`, `gpu:40-42` |
| `drawElementCentered` | `(ctx, el, cx: number, cy: number): void` | Centre a snapshot on a point in grid px. | `PC:66-71` |
| `drawFocusRing` | `(ctx, path: Path2D, el: Element): void` | Draw the focus ring for the active drawable; call after all fills. | `PC:62-63,77-78` |
| `rectInDrawableAncestor` | `(el, opts?: {toGrid?: boolean}): DOMRect` | Nested-drawable rect with `convertRectFromNode` and the offsetParent fallback. | `NS:69-91` |
| `createElementTexture` | `(gl): WebGLTexture` | Texture with `LINEAR`, `CLAMP_TO_EDGE` (and flipY handled once). | `GL:182-192,328` |
| `uploadElementToTexture` | `(gl, tex, el, opts?: {reallocate?: 'always'\|'onResize'}): void` | `getElementImageDefaultSize` (ceil) + `texImage2D(null)` **only when the size changed** + `texElementSubImage2D`; legacy chain kept behind one function. | `GL:195-232`, `gl:40-76` |
| `createChangedRouter` | `(bindings: Array<{ el: Element; onChanged: () => void }>): (ev: CanvasPaintEvent) => void` | Run only the handlers whose element is in `changedElements`. | `GL:351-369` |
| `createElementGPUTexture` | `(device, size: {width:number; height:number}): GPUTexture` | Allocates `rgba8unorm` with `TEXTURE_BINDING \| COPY_DST \| RENDER_ATTACHMENT`; default size from `getDefaultGridSize(..., {ceil:true})`. | `JM:68-73`, `gpu:35-57` |
| `uploadElementToGPUTexture` | `(device, tex, el, opts?: {size?: GPUExtent3D; source?: {x:number; y:number; w:number; h:number}; premultipliedAlpha?: boolean}): void` | `queue.drawElementImageToTexture` with feature detection; source rect in **CSS px**; asserts `tex` is at least `size` (fixes the resize bug). | `JM:773-800`, `gpu:87-107` |
| `ensureTextureSize` | `(device, tex, w, h): GPUTexture` | Recreate on resize; caller rebuilds bind groups. | `JM:68-73,866-875` |
| `syncGeometry` | `(canvas, el, m: DOMMatrix, opts?: {clip?: DOMRectInit; preserveHitTestOrder?: boolean}): void` | `updateElementGeometry(el, {canvasTransform, canvasClip, preserveHitTestOrder})` (all in CSS px) with the `style.transform` fallback. | `GL:171-178`, `JM:811-818`, `con:236-242` |
| `clearGeometry` | `(canvas, el: Element): void` | `canvas.clearElementGeometry(el)` for un-drawn elements (instead of leaving stale geometry). | `con:253-256` |
| `createHtmlTexture` | `(canvas, el, upload: (el) => void): { dispose(): void }` | The PlayCanvas pattern: wait for the first paint (`{once:true}` + `requestPaint()`), then upload on every paint where `el` is in `changedElements`. | `idx:61-74`, `GL:346-369` |
| `matrixFromCssRect` | `(rect: DOMRectReadOnly, elSize: {w:number; h:number}): DOMMatrix` | `a = rect.w/elW`, `d = rect.h/elH`, `e = rect.x`, `f = rect.y`. Read `elSize` from the element, not a constant. | `GL:165-169` |
| `ndcRectToCssRect` | `(ndc: {x0,y0,x1,y1}, css: {w,h}, opts?: {flipY?: boolean}): DOMRect` | NDC to CSS px **with a correct Y flip** (defaults to true). | `GL:146-159` |
| `projectQuadToMatrix` | `(mvp: Float32Array, quadCorners: [vec3,vec3], css: {w,h}, elSize): DOMMatrix` | Whole chain for flat quads: transform, divide by `w`, flip Y, build the matrix. | `GL:141-179` |
| `alignHitRectToProjection` | `(viewProj: Float32Array, worldBox: Box3, css): DOMRect` | The jelly's TODO: project a world box to a CSS rect. | `JM:802-807` |
| `setExclusiveInert` | `(visible: Element, all: Element[]): void` | Toggle `inert` so exactly one of a set is interactive/exposed. | `GL:111-128` |
| `watchThemeSignals` | `(el: Element, map: {color?: (c:RGBA)=>void; background?: ...; caret?: ...}, extra?: string[]): () => void` | Subscribes to focus/blur and the media queries (`forced-colors`, `prefers-color-scheme`, `prefers-contrast`); reads `getComputedStyle`; returns an unsubscribe. | `JM:885-941` |
| `parseCssColor` | `(s: string): RGBA` | Robust parser (comma and space syntaxes; optional `color()`), with an explicit failure signal instead of white. | `JM:910-925` |
| `prefersReducedEffects` | `(): { reduce: boolean; subscribe(cb): () => void }` | `motion \|\| transparency`. | `JM:889-908` |
| `createResponsiveCanvasFrame` | `(canvas, {aspect?: number}): { dispose(): void }` | Container-query wrapper and DPR-aware sizing. | `JB:14-57` |
| `html-in-canvas.d.ts` | ambient declarations | Types for `onpaint`, `requestPaint`, `drawElementImage`, `updateElementGeometry`, `texElementSubImage2D`, `drawElementImageToTexture`, `CanvasPaintEvent` | replaces `as any` at `JM:107,773,...` |

Library design notes: keep each helper small and observable (counters for paints, calls, geometry updates) because the learning site needs to **instrument** examples for labs and trials (a "Paint HUD", a "Geometry overlay", grader hooks).

---

## 9. Backward-compat hack catalogue

| Hack | Where | Replaces | Removal / better practice |
|---|---|---|---|
| Keep `layoutsubtree` next to `content="drawable"` | `CT:13-15`, `PC:22-24`, `NS:30-32`, `GL:58-60`, `JH:71-73` | Older opt-in attribute | Drop when the target browsers ship `content`. Lessons should teach `content` first. |
| `canvas.updateElementGeometry` else `el.style.transform = matrix.toString()` | `GL:171-178`, `JM:811-818` | Older "apply a CSS transform to the DOM element" geometry hack | The CSS transform also shifts layout; `canvasTransform` maps the border box (before CSS transforms) instead (`README.md:44`). |
| `texElementImage2D` 6-arg then 3-arg after `texElementSubImage2D` fails | `GL:213-231` | Older allocate-and-upload API | Use feature detection; the new form is alloc (`texImage2D`) + `texElementSubImage2D` (`README.md:210-216`). |
| `copyElementImageToTexture` dictionary form, then positional form after `drawElementImageToTexture` fails | `JM:784-799` | Older WebGPU copy API | Feature-detect; avoid catching everything. |
| `convertRectFromNode` presence check, else offsetParent walk | `NS:75-85` | GeometryUtils may not ship | Keep one helper. |
| `drawScene` accepting either `(…, tex, rotation)` or `(…, tex1, tex2, rotation)` | `GLS:158-161` | Single-texture older demo | Remove. |
| `requestPaint?.()` vs unguarded `requestPaint()` | `JM:933` vs `JM:107,820` | Inconsistent guarding | Guard once at start with `detectHtmlInCanvas`. |
| `(canvas as any)` casts | `JM:107,773,782,790,796,811-813,820,933` | Missing DOM typings | Ambient `.d.ts`. |
| Property handlers (`canvas.onpaint =`) only in the demos; the docs mix both | demos everywhere; docs `2d:33`, `gl:83`, `con:364,413` (property) vs `con:83,96,115,160,171,196`, `gl:107`, `gpu:88`, `idx:63,69` (listener) | n/a | `addEventListener('paint', ...)` is the composable form (the explainer lists `onpaint` as an `EventHandler`, `README.md:113`); lessons can show both. |
| Unconditional `{box: 'device-pixel-content-box'}` | `CT:50`, `PC:87`, `NS:98`, `GL:384` | Engines lacking the box option / `devicePixelContentBoxSize` | Use the docs' feature-detected form with a `Math.round(contentRect * devicePixelRatio)` fallback (`con:293-303`). |
| `canvas.updateElementGeometry !== undefined` as the only API probe | `GL:171`, `JM:811` | n/a | Prefer `canvas.content` reflection (`con:428-435`) plus per-context checks. |
| `style.transform = getElementTransform(el, matrix)` (PixiJS) | `idx:116-119` | Library-side CSS-transform sync | Two-argument `getElementTransform` is not in the README IDL (`README.md:126-130`); treat as library-internal until documented (verify). |

---

## 10. Matrix: concepts and APIs by example

Legend: `✓ N` = used at line N of that example's own file(s). Columns CT, PC, NS use bare line numbers of their file; GL uses `GL:`/`GLS:`; for the Jelly column, `H` = `index.html`, `B` = boot `index.ts`, `M` = `src/index.ts`. The last column is the Chrome developer docs (`con:` concepts.md, `2d:` 2d.md, `gl:` webgl.md, `gpu:` webgpu.md, `idx:` index.md). Empty = not used. `(i)` = inferred, not explicit in the source. "docs mention" = referenced in prose or a table but no code.

| Concept / API | CT | PC | NS | GL (`GL:` / `GLS:`) | Jelly | Chrome docs |
|---|---|---|---|---|---|---|
| `content="drawable"` on canvas | ✓ 15 | ✓ 24 | ✓ 32 | ✓ GL:60 | ✓ H:73 | ✓ con:35,52,133,138,404 |
| `layoutsubtree` legacy attribute | ✓ 15 (`="true"`) | ✓ 24 | ✓ 32 | ✓ GL:60 | ✓ H:73 | not used anywhere |
| `drawable` on children | ✓ 16 | ✓ 25,28,31 | ✓ 33 | ✓ GL:61,68,72,76,80 | ✓ H:74-75 | ✓ con:36,54,135,406-407 |
| Nested `drawable` | | | ✓ 37 | | | ✓ con:40,58; nested canvas con:138-139 |
| `inert` on drawables | | | | ✓ GL:68,72,76,80; GL:116-125 | ✓ H:75 | docs mention con:392 |
| ARIA `role` / `aria-label` / `tabindex` | | ✓ 24,25,28,31 | | | (native range input, H:74) | docs mention `aria-hidden` con:392; `alt` con:406 |
| `lang` for i18n text | | | | ✓ GL:69,73,77,81 | | |
| `canvas.onpaint =` | ✓ 38 | ✓ 40 | ✓ 44 | ✓ GL:345 | ✓ M:773 | ✓ 2d:33; gl:83; con:364,413 |
| `addEventListener('paint', ...)` | | | | | | ✓ con:83,96,115,160,171,196; gl:107; gpu:88; idx:63,69 |
| `event.changedElements` | | | | ✓ GL:351-365 | | ✓ con:93-98 |
| `requestPaint()` initial call | ✓ 44 | ✓ 80 | (implicit) | ✓ GL:376 | ✓ M:820 | ✓ con:205; idx:66 |
| `requestPaint()` self-re-arming loop | | | ✓ 64 | ✓ GL:374 | | ✓ con:202 |
| `requestPaint()` from an event handler | | | | | ✓ M:107, M:933 | |
| Separate rAF / library render loop | | | | | ✓ M:825-864,882 | ✓ idx:93-95 (Babylon), idx:114 (Pixi ticker) |
| Frame lifecycle (DOM writes in `paint` land next frame) | | | | (geometry writes only, GL:251) | (text set outside paint, M:106) | ✓ con:114-123 |
| Nested `<canvas content="drawable">` (paint order) | | | | | | ✓ con:131-181 |
| 2D `ctx.reset()` | ✓ 39 | ✓ 41 | ✓ 45 | | | ✓ 2d:34; con:365,414 |
| 2D `ctx.clearRect(...)` | | | | | | ✓ con:85,162,173,198 |
| 2D transform before draw (rotate/translate) | ✓ 40-41 | ✓ 45 | ✓ 46 | | | |
| `drawElementImage(el, dx, dy)` | ✓ 42 | ✓ 71 | ✓ 47 | | | ✓ 2d:36,38,46; con:88-89,117,163,176,199-200,375,418-419 |
| `drawElementImage(el, dx, dy, dw, dh)` | | | ✓ 61 | | | ✓ 2d:49 |
| `drawElementImage` with source rect (7 or 9 args) | | | | | | ✓ 2d:52,55 |
| `drawElementImage` options `{preserveElementGeometry}` | | | | | | ✓ 2d:77; con:415 (comment) |
| `drawFocusIfNeeded` | | ✓ 77-78 | | | | |
| Automatic geometry update (2D draw) | ✓ 42 (i) | ✓ 71 (i, comment 65) | ✓ 47,61 (i) | | | ✓ 2d:69; con:216,396,415-417 |
| Explicit `canvas.updateElementGeometry(el, {canvasTransform})` | | | | ✓ GL:174 | ✓ M:813-814 | ✓ 2d:88; gl:129-131; gpu:126; con:238-241 |
| `new DOMMatrix` for canvasTransform | | | | ✓ GL:165-169 | ✓ M:812 (`.translate`) | ✓ 2d:82-85; gl:118-126; gpu:123 |
| Legacy `style.transform` geometry fallback | | | | ✓ GL:177 | ✓ M:816-817 | ✓ idx:118 (Pixi, via `getElementTransform`) |
| `preserveHitTestOrder` | | | | | | ✓ con:240 |
| `clearElementGeometry` | | | | | | ✓ con:255 |
| `getElementTransform` | | | | | | ✓ idx:116 (2-arg form); docs mention con:322 |
| `canvasClip` | | | | | | docs mention con:322 |
| WebGL `texElementSubImage2D` | | | | ✓ GL:212 | | ✓ gl:88-94,110 |
| Legacy `texElementImage2D` | | | | ✓ GL:221-222,228 | | |
| `getElementImageDefaultSize` | | | | ✓ GL:201 | | ✓ gl:62; gpu:40,120; docs mention con:319 |
| `Math.ceil` of default size for texture alloc | | | | | | ✓ gl:69-70; gpu:41-42 |
| Allocate texture once / on size change only | | | | (re-allocates every upload, GL:202-211) | (one-off, never resized, M:68-73) | ✓ gl:40-56,63-64; gpu:44 |
| `UNPACK_FLIP_Y_WEBGL` | | | | ✓ GL:328 | | |
| WebGPU `drawElementImageToTexture` | | | | | ✓ M:782 | ✓ gpu:105 |
| WebGPU source rect `sourceX/Y/Width/Height` | | | | | | ✓ gpu:93-96 |
| WebGPU destination `size` / `origin` / `mipLevel` / `colorSpace` / `premultipliedAlpha` | | | | | ✓ M:779 (`size` only) | ✓ gpu:101; docs mention gpu:77-83 |
| Legacy `copyElementImageToTexture` | | | | | ✓ M:790,796 | |
| `captureElementImage` / `ElementImage` / OffscreenCanvas | | | | | | docs mention gl:93; gpu:67 |
| RO `device-pixel-content-box` | ✓ 50 | ✓ 87 (array form) | ✓ 98 | ✓ GL:384 | (not used; B:56 observes container, M:880 default box) | ✓ con:299-303 |
| RO feature detection + `Math.round(contentRect * dpr)` fallback | | | | | (DPR-based sizing, B:50-53, no rounding) | ✓ con:293-303,333-355 |
| `devicePixelContentBoxSize` read | ✓ 47-48 | ✓ 84-86 | ✓ 95-96 | ✓ GL:379-380 | | ✓ con:294-296,334-345 |
| `contentBoxSize` / `contentRect` read (CSS size) | | | | ✓ GL:381-382 | | ✓ con:295-296,335-336 (`contentRect`) |
| `devicePixelRatio` multiplied into coordinates | ✓ 41 | ✓ 67-68 | ✓ 54,87-90 | | ✓ B:51; M:809-810 | fallback only con:295-296,343-344 |
| `scaleX`/`scaleY` = `canvas.width / cssContentWidth` | | | | | | ✓ con:330-348; 2d:81-85; gpu:117-120 |
| `canvas.width/height` assigned from sizes | ✓ 47-48 | ✓ 85-86 | ✓ 95-96 | ✓ GL:379-380 | ✓ B:51-52 | ✓ con:295-296,340-345 |
| `box-sizing: border-box` on drawn elements | | | | ✓ GL:19,43 | | ✓ con:382-387 |
| `offsetWidth/offsetHeight/offsetLeft/offsetTop` for placement | | ✓ 67-68 | ✓ 71-72 | | | ✓ con:369-370; gl:120-122; gpu:95-96 |
| `convertRectFromNode` (GeometryUtils) | | | ✓ 75-76 | | | |
| `closest('[drawable], canvas')` | | | ✓ 73 | | | |
| Perspective camera / 3D transform maths | | | | ✓ GLS:179-211 | ✓ M:116-125; camera.ts | |
| `getContext('2d')` | ✓ 37 | ✓ 38 | ✓ 43 | | | ✓ 2d:29; con:149,152,361,411 |
| `getContext('webgl2')` | | | | ✓ GL:269 | | |
| WebGPU context | | | | | ✓ M:49-51 (`configureContext`) | ✓ gpu:36 (`getContext("webgpu")`) |
| `matchMedia` signals | | | | | ✓ M:885-889,906-907,936-940 | |
| `getComputedStyle` colours to uniforms | | | | | ✓ M:928-932 | |
| `prefers-color-scheme` CSS | | | | | ✓ H:30-35,44-48 | |
| `prefers-contrast` CSS | | | | | ✓ H:36-49 | |
| `forced-colors` CSS (system colours) | | | | | ✓ H:50-59 | |
| `color-scheme` property | | | | | ✓ H:10-12 | |
| Reduced motion / reduced transparency | | | | | ✓ M:889-908,833-840 | |
| Focus as a visible indicator / paint trigger | | ✓ 77-78 (canvas ring) | | (in snapshot, README:319) | ✓ H:27-29 (jelly colour) | docs mention con:93 (focus state change triggers paint) |
| Same-origin media in snapshot (read-back-allowed) | ✓ 25-31 | | | | | |
| `color-mix()` in canvas colours | | ✓ 54 | | | | |
| Per-API feature detection | | | ✓ 75 | ✓ GL:171 | ✓ M:811, M:933 | |
| `canvas.content` reflection detection (`supportsHtmlInCanvas`) | | | | | | ✓ con:428-435 |
| Fallback chain for older APIs | | | ✓ 75-85 | ✓ GL:171-178,213-231; GLS:158-161 | ✓ M:781-800,816-817 | |
| Alternative-UI fallbacks (overlay, html2canvas, dom-to-image) | | | | | | docs mention con:439-443 |
| Cleanup / dispose | | | | | ✓ M:944-955 | |
| Selective texture update by changed set | | | | ✓ GL:351-369 | | ✓ con:96-102 (iterate only) |
| Interactive DOM inside a texture (clicks via geometry) | | | | ✓ GL:66,70,141-179 | ✓ (invisible range input, M:811-814) | ✓ gl:100-133; gpu:109-127; con:210-230 |
| Text-to-GPU-texture for shaders | | | | ✓ GL:195-232 | ✓ M:68-73,773-800,519-548 | ✓ gpu:87-107 |
| Semantic structure kept while drawing parts separately | | (list/listitem, 24-31) | (poem/sparkle nested, 33,37) | | | ✓ con:403-422 |
| Units table (CSS vs grid vs texture px) | | | | | | ✓ con:313-324 |
| Framework wrappers (three.js, PlayCanvas, Babylon, PixiJS) | | | | | | ✓ idx:48-55, 61-74, 80-96, 102-121 |

---

## 11. Open questions to verify in a live browser before the site teaches them

Status after cross-reading the Chrome docs (section 7.7): items 1, 2, 5 (partly) and 13 are resolved by `concepts.md` / `webgpu.md`; the rest remain open.

1. **Units of `canvasTransform`:** *Resolved.* CSS px (`con:322`; `gl:115`; `gpu:113-114`), matching what both 3D demos do (`GL:156-159`, `JM:809-813`) and `README.md:49`. (The README IDL comment alone, `README.md:97-100`, does not say.)
2. **Destination `size` semantics** of `drawElementImageToTexture`: *Resolved.* It scales and rasterises the element into the given size (`gpu:78`), so the jelly's whole-canvas `size` stretches the div (`JM:779`).
3. **Paint after bitmap resize:** is a paint event guaranteed after `canvas.width = ...`? *Open.* The docs' RO samples (`con:293-297,333-349`) do not call `requestPaint()`; only the README's OffscreenCanvas example does (`README.md:396`).
4. **Implicit first paint** without an initial `requestPaint()` (`NS` relies on it). *Open.* The docs always call `requestPaint()` first (`con:205`, `idx:66`).
5. **`UNPACK_FLIP_Y_WEBGL` / premultiply flags:** *Partly resolved.* WebGPU destination `premultipliedAlpha` defaults to `false` and `colorSpace` to `"srgb"` (`gpu:82-83`); effect on the jelly's `.x` mask (`JM:542-547,624`) and whether flipY governs `texElementSubImage2D` (`GL:328`) are still open (`webgl.md` is silent).
6. **WebGL viewport after resize** in the `GL` demo (no `gl.viewport`). *Open.*
7. **`getElementTransform`** after an automatic 2D geometry update (useful for graders, `README.md:130`). *Open;* units are CSS px (`con:322`), and the PixiJS snippet uses a 2-argument form (`idx:116`) that is not in the README IDL.
8. **Focus ring location:** does a focused `drawable`'s outline appear in its snapshot, or only inside the border box? *Open.* (The docs confirm focus changes trigger `paint`, `con:93`.)
9. **Forced-colors** computed-style results on the jelly slider (colour parsing regex, `JM:910-925`) and whether UA forced-colour adjustment overrides `color`/`caret-color`. *Open.*
10. **`inert` effect on snapshot painting** (focus ring, selection) for the hidden faces in `GL`. *Open.*
11. **`GeometryUtils.convertRectFromNode` availability** (`NS:75`) in shipped builds. *Open;* the docs never mention it.
12. **Legacy `style.transform` vs `canvasTransform` semantics** for stacked children (`JM:816-817` vs `JM:812`). *Open.*
13. **Default hit-test order:** *Resolved.* Each geometry update moves the element to the top unless `preserveHitTestOrder: true` (`con:234,246-247`); this makes the update order at `JM:813-814` meaningful.
14. **Meaning of the PixiJS `getElementTransform(el, matrix)` two-argument form** and whether `style.transform` sync (`idx:116-119`) is still the recommended path for libraries. *Open.*
15. **Whether `drawElementImage` rounds a fractional default size** when the destination size is omitted, and what happens in `texImage2D` when a fractional size is passed (`GL:201-206` vs `Math.ceil` in `gl:69-70`). *Open.*
