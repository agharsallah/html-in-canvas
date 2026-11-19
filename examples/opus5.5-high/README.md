# Kiosk

**A website template where every poster is live HTML drawn into canvas.**
Built on the WICG [HTML-in-Canvas](https://github.com/WICG/html-in-canvas) API (shipped in Chrome 157). Demo content: *Plaza Week*, a fictional street festival.

Live: **https://kiosk-html-in-canvas.gharsallah-abderrahmen.workers.dev** · also at **https://ionloft.com/html-in-canvas-kiosk/**

Kiosk looks like a public poster kiosk: Bauhaus street posters on warm paper, printed in ink, signal red, cobalt and sun yellow. Each section is a poster made of real, selectable, focusable, screen-reader-friendly HTML. It is drawn into a canvas, each section in a different context:

| Section | Context | What happens |
| --- | --- | --- |
| Hero, the poster | **WebGL2** | The poster tilts toward the pointer in 3D, in front of Bauhaus shapes at different depths. A misregistered second ink appears while it moves, and a halftone reveal plays on load. The email form works on the tilted plane. The "Get a pass" sticker is a nested drawable floating 56px in front. |
| Lineup tape | **OffscreenCanvas in a worker** | Two tapes of names scroll off the main thread. The moving "Meet the voices" link stays clickable: geometry goes to the copy whose link is nearest your pointer. The tape pauses on hover, on focus and with a button. |
| What's on | **2D** | Six cards drop into a box with rigid-body physics. Drag and throw them: their links stay clickable wherever they land. |
| Programme | **2D** | A timetable under a loupe that follows the pointer or keyboard focus. "+ Calendar" downloads a real `.ics`. |
| In your pocket | **2D inside 2D** (nested canvases) | A phone whose screen is a second canvas: a live clock, starrable sessions and a scrollable list. |
| Voices | **WebGPU** (2D path without an adapter) | Quotes change through a shader wipe of growing discs. |
| Passes | **2D** | Two passes compared under a draggable divider. Only the visible half of each is clickable. |
| Your badge | **2D** | Type your name and the badge reprints with a two-colour misprint. Download it as a PNG. |
| Under the hood | plain HTML | Every API feature, its job on this page, and whether *your* browser supports it. |

Without the API, the same markup stays ordinary HTML with CSS stand-ins (CSS 3D tilt, a pinned-up card wall, a CSS phone and so on). Add **`?fallback`** to any URL to see it.

---

## Quick start

```bash
pnpm install
pnpm dev            # http://localhost:5173
pnpm build          # typecheck + static build to dist/
pnpm verify         # real-browser checks in Chrome 157+ (see "Verification")
pnpm run deploy     # build + wrangler deploy to Cloudflare
                    # ionloft.com: see DEPLOY.md
```

This folder is standalone. It has its own `package.json`, `pnpm-workspace.yaml` (so pnpm doesn't walk into a parent repo), `tsconfig.json` and `vite.config.ts`. Its only runtime dependencies are three self-hosted variable fonts.

## Make it yours: one file

Everything a project changes lives in **`src/site.config.ts`**:

- **Brand:** `name`, `mark`, `tagline`, `url`, `description`, a `light` and a `dark` palette (five inks: `paper`, `ink`, `red`, `blue`, `yellow`), and font family names.
- **Navigation, event details and footer.**
- **`sections`:** the page, in order. Each entry has a `type` and its content. Reorder them, delete them, or repeat a type with different content and a different `id`. Everything is typed, so the editor tells you what each section expects.

At build time, `vite.config.ts` renders the config to static HTML (`src/render/page.ts`), with the brand colours as CSS variables. Search engines and browsers without JavaScript or without the API get the full content. In the browser, `src/main.ts` lazy-loads one enhancer per section.

To change fonts, swap the three `@fontsource-variable/*` imports in `src/main.ts` and the names in `brand.fonts`. Keep fonts **self-hosted**: see "read-back-allowed rendering" below.

After rebranding, regenerate the social image: `pnpm build && pnpm og && pnpm build`.

### Anatomy of a section

```
src/sections/<type>/
  markup.ts    pure function: config → HTML string (runs at build time)
  enhance.ts   runs in the browser: upgrades the stage, draws, wires input
  <type>.css   one stylesheet serving both canvas and fallback
```

Every section ships its content inside `<div class="stage" data-stage="…">`. `upgradeStage()` (`src/hic/stage.ts`) swaps the div for `<canvas content="drawable" layoutsubtree>` only when the browser supports the API. Authoring the canvas directly would hide the content everywhere else, because canvas children are fallback content.

### The reusable HTML-in-Canvas layer: `src/hic/`

| File | What it gives you |
| --- | --- |
| `types.d.ts` | Typings for the whole API, written from the explainer's IDL |
| `support.ts` | Per-context feature detection (`content` reflection, 2D, WebGL, WebGPU, workers), plus `?fallback` and `?no-webgpu` switches |
| `stage.ts` | Progressive enhancement from div to `<canvas content="drawable">` |
| `sizing.ts` | Canvas grid on device pixels (`device-pixel-content-box`) with `scaleX`/`scaleY`, and `requestPaint()` after resizes |
| `loop.ts` | `PaintLoop`: draws in `paint`, animates with `requestPaint()` only while something moves, stops off-screen |
| `geometry.ts`, `mat4.ts` | Projective `canvasTransform` for 3D (`Viewport · Projection · View · Model · ElementToPlane`) |
| `a11y.ts` | `setOffstage()`: takes undrawn content out of the accessibility tree and the Tab order |

---

## Where every HTML-in-Canvas feature is used

The same table, with live support status, is on the page itself ("Under the hood", generated from `src/apis.ts`).

| Feature | Where | Its job |
| --- | --- | --- |
| `content="drawable"` (+ legacy `layoutsubtree`) | `hic/stage.ts`, every section | Opts each stage canvas into laying out its children. Feature detection reads its reflection (`hic/support.ts`, inline in `index.html`). |
| `drawable` | every `markup.ts` | Marks posters, cards, quotes, tapes, the phone and the badge as paint roots. |
| Nested drawables | `hero/markup.ts` + `hero/enhance.ts`; `badge/markup.ts` + `badge/enhance.ts` | The sticker is left out of the poster's snapshot and floats in front of it in 3D. The badge name is drawn separately as a two-plate print. |
| `paint` event via `addEventListener` (never the single `onpaint` slot) | `hic/loop.ts`, `band/enhance.ts`, `app/enhance.ts` | Every canvas redraws from it. Typing a badge name repaints with no extra code. |
| `changedElements` | `hero/enhance.ts`, `voices/enhance.ts`, `band/enhance.ts` | Re-uploads textures and re-captures worker snapshots only for what changed. |
| `requestPaint()` | `hic/loop.ts` (all animated sections), `hic/sizing.ts`, `app/enhance.ts` | Animates tilt, physics, the loupe and wipes, and stops at rest (idle cost is verified to be zero). Redraws after a resize. |
| DOM edits in `paint` land next frame | `programme/enhance.ts`, also `passes`, `voices` | The loupe marks the row under it from inside `paint`, and canvases resize to their content. |
| Reverse tree order (nested canvases) | `app/enhance.ts` | The phone screen (inner canvas) paints before the phone (outer canvas), so the outer canvas always draws fresh pixels. |
| `drawElementImage(el, dx, dy)` | `programme/enhance.ts`, `app/enhance.ts` | Natural size: the timetable, the phone and its screen. |
| `drawElementImage(el, dx, dy, dw, dh)` | `badge/enhance.ts` | Fits the badge into the preview at any width. |
| `drawElementImage(el, sx, sy, sw, sh, dx, dy)` | `passes/enhance.ts`, `voices/enhance.ts` (2D path) | Crops each pass to its side of the divider, at default size. The 2D quotes use it with outsets for the overflowing quote mark. |
| `drawElementImage(el, sx, sy, sw, sh, dx, dy, dw, dh)` | `programme/enhance.ts`, `toybox/enhance.ts` | Magnifies inside the loupe. Negative source outsets keep cards' hard shadows (ink overflow). |
| `preserveElementGeometry: true` | `programme`, `passes`, `badge`, `band` worker, `voices` (2D) | Decorative copies (loupe, misprint plate, repeated tape, outgoing quote) never steal hit testing. |
| Automatic 2D geometry | `toybox`, `programme`, `app`, `badge` | Rotated, thrown cards stay clickable and focusable with no hit-testing code. |
| `updateElementGeometry()` + `canvasTransform` | `hero/enhance.ts` (projective 4×4), `voices/enhance.ts` (translate), `passes/enhance.ts` | Keeps DOM geometry in sync with WebGL, WebGPU and hand-placed 2D. |
| `canvasClip` | `passes/enhance.ts` | The covered half of a pass takes no clicks. |
| `preserveHitTestOrder` | `hero/enhance.ts` | The poster is updated after its sticker and stays below it in the hit-test stack. |
| `getElementTransform()` | `passes/enhance.ts`; `scripts/verify.mjs` | Lines the slider up with where the pass was drawn. The verifier uses it to aim real clicks. |
| `clearElementGeometry()` | `passes/enhance.ts`, `voices/enhance.ts` | Un-draws a fully covered pass and off-stage quotes (offscreen for assistive tech). |
| `getElementImageDefaultSize()` | `hero/enhance.ts`, `voices/gpu.ts`, `workers/tape.worker.ts` (on `OffscreenCanvas`) | Sizes GPU textures (fractional, so `Math.ceil`) and the worker's tape repeat. |
| `texElementSubImage2D()` + pre-allocation `texImage2D(…, null)` | `hero/enhance.ts` | Poster and sticker textures, with `LINEAR` filtering and `UNPACK_FLIP_Y_WEBGL` set explicitly. |
| `WebGLCopyElementImageConfig` (`sx…sheight`, `width`, `height`) | `hero/enhance.ts` | Source outsets keep the sticker's shadow. `width`/`height` rasterize into exactly the allocated storage. |
| `GPUQueue.drawElementImageToTexture()` | `voices/gpu.ts` | Copies quotes into `rgba8unorm` textures (`TEXTURE_BINDING \| COPY_DST \| RENDER_ATTACHMENT`), with a source rect for the overflowing quote mark and an explicit destination `size`. |
| `captureElementImage()` / `ElementImage` (transfer + `close()`) | `band/enhance.ts`, `workers/tape.worker.ts` | Snapshots move to the worker in the transfer list. The worker closes the one it replaces. |
| `OffscreenCanvasRenderingContext2D.drawElementImage` | `workers/tape.worker.ts` | Draws the tape off the main thread. Worker draws update geometry too. |
| `elementgeometryupdate` | `band/enhance.ts` | Reveals the tape once the worker's geometry has landed (clickable), and counts batches. |
| Focus rings painted + `drawFocusIfNeeded()` | everywhere; `toybox/enhance.ts` | Native rings show inside snapshots, even on the tilted 3D poster. Round cards get a ring that follows their shape. |
| Accessibility tree, `aria-hidden` / `inert` / `hidden` | `hic/a11y.ts`, `voices`, `passes`, `programme` | Canvas content stays in the accessibility tree. What isn't drawn leaves it. |
| Read-back-allowed rendering | `badge/enhance.ts` | Same-origin fonts and CSS-only art: the canvas is never tainted, so `toBlob()` exports a PNG. |
| Device-pixel grid, `scaleX`/`scaleY`, `box-sizing: border-box` | `hic/sizing.ts`, all CSS | Crisp at any DPR and zoom. Positions mix grid px and CSS px exactly as the units table says. |
| Theme through JS, not pixels | `lib/palette.ts` | Canvas-drawn colours and shader uniforms come from computed styles, so dark mode and forced colors carry over. |
| Fallback | every `enhance.ts` early return + `*.css` `:not(canvas)` rules | The same markup, ordinary HTML. |

## Accessibility and keyboard

- Real semantics in every canvas: an `h1` on the WebGL poster, real `form`/`input`/`button`, `article`s with links, a WAI-ARIA tablist, `dl`s, `figure`/`blockquote` slides with `aria-roledescription`, and `aria-pressed` toggles.
- Everything works by keyboard: Tab through the tilted poster, the cards (the focused card comes to the front), the timetable (the loupe follows focus), the phone (its list scrolls to the focused row), and the passes slider. Arrow keys move between quotes. Dragging always has a button alternative (*Shake*, *Tidy up*, the range input).
- The **Motion** switch (default from `prefers-reduced-motion`) disables tilt, physics, wipes and tape scrolling. Under reduced motion, dragged cards stay exactly where you drop them. The tape also pauses on hover, on focus and with its own button (WCAG 2.2.2).
- A **Dark** switch (default from `prefers-color-scheme`), forced-colors support, a skip link, and visible focus everywhere.

## Verification

`scripts/verify.mjs` drives a real Chrome (157+) with puppeteer-core. It serves `dist/` (or `--url=` for a deployed copy), screenshots every section into `.verify/`, and checks with real input and real hit testing:

- 3D hit testing: the sticker, the email field and the submit button resolve via `elementFromPoint` on the perspective-tilted poster. Tab moves focus inside the poster, and the form submits and repaints.
- The worker's geometry arrives, and the moving tape link hit-tests.
- Every thrown card's link is clickable where it's drawn, and a real mouse drag moves a card's geometry.
- The loupe marks its row (a DOM edit made inside `paint`), and the second timetable tab draws and hit-tests.
- The phone star is clickable through two canvases.
- WebGPU renders the quotes (or 2D with `--no-webgpu`), and only the current quote is interactive.
- `canvasClip` blocks the covered half of a pass. A covered pass can't take focus, and dragging the divider works.
- The badge exports (the canvas isn't tainted).
- The accessibility tree contains the canvas content and not the off-stage quotes.
- Idle canvases stop painting.
- No console errors.

```bash
pnpm verify                                   # 1440px, DPR 1, light
pnpm verify -- --dark --dpr=2
pnpm verify -- --width=390 --height=844 --dpr=3
pnpm verify -- --reduce | --forced | --no-webgpu | --fallback
pnpm verify -- --url=https://your-site.workers.dev/
```

All of these passed in Chrome 157.0.8103.39 on macOS, against the local build and against the deployed site.

### Things learned natively in Chrome 157

These aren't stated in the docs, or the docs leave them open. Each was verified in the browser:

1. **`inert` is not honoured inside a `content="drawable"` canvas.** The subtree stays in the accessibility tree and its links still take focus. `aria-hidden="true"` and `hidden` do work. `hic/a11y.ts` sets `inert`, `aria-hidden` and `tabindex=-1` together.
2. **`getElementTransform()` only accepts drawable elements.** Passing a descendant throws `InvalidStateError`. Map points through the drawable root instead.
3. **Immediate canvas children are forced to `position: static`**, even with `position: relative`, and a `drawable` is still the `offsetParent` of its descendants.
4. **Texture sizes must come from `getElementImageDefaultSize()`, not `offsetWidth/Height`.** Those are rounded, so a snapshot 0.3px taller than its texture makes `texElementSubImage2D` fail with `INVALID_VALUE`. Passing explicit `width`/`height` also scales the snapshot to fit.
5. **`UNPACK_FLIP_Y_WEBGL` does apply to `texElementSubImage2D`.**
6. **The first `paint` fires without an initial `requestPaint()`**, and its `changedElements` lists every drawable.
7. Auto geometry from the 7- and 9-argument forms with negative source outsets maps the border box correctly. Perspective 4×4 `canvasTransform`s hit-test correctly. Hit testing works through nested canvases.
8. `prefers-color-scheme` and forced colors both apply inside snapshots.

### Not verified

- Real phones and real touch input (only Chrome's device emulation). Pointer drags were tested with a mouse.
- Real screen readers (VoiceOver, NVDA). Only Chrome's accessibility tree was inspected.
- Other browsers' fallback rendering (Safari, Firefox). The fallback path was checked in Chrome with `?fallback`.
- WebGL context loss. It isn't handled: the hero would stay blank until reload.
- Once, while generating `og.png` right after a layout change, a screenshot showed the hero sticker cut in half. It didn't reproduce in several runs, and the cause is unknown.
- The puppeteer DPR emulation reported a CSS-sized `devicePixelContentBoxSize` at DPR 3. `hic/sizing.ts` falls back to `devicePixelRatio` when the two disagree. On real hardware the device box should already be right.

## Deploy on ionloft.com

Published GitHub releases tagged `kiosk-v*` deploy it to https://ionloft.com/html-in-canvas-kiosk/, built with `BASE_PATH` and `SITE_ORIGIN` so it works under the path. How to release, roll back and change the build: [DEPLOY.md](DEPLOY.md).

## Deploy on Cloudflare

Static `dist/` plus Workers static assets (`wrangler.jsonc`: assets only, a `404.html` page, and security and cache headers in `public/_headers`):

```bash
pnpm run deploy        # = pnpm build && wrangler deploy
```

The live copy was deployed with this script. The Cloudflare MCP server was used to check the account, find the `workers.dev` subdomain, confirm no Worker name collision, and confirm the deployed script has assets.

The asset upload itself went through wrangler. The MCP's `execute` tool takes code as text, so uploading ~700 KB of fonts and images through it would mean pasting them base64-encoded into the tool call. Its sandbox also got `403` when fetching the `workers.dev` URL, so the live checks were run with `curl` and `pnpm verify -- --url=…`.

## License

MIT for the template code. Fonts are under their own licenses (SIL OFL), via Fontsource.
