# Drawable: Learning Journey Plan

Research note 03 for the "Drawable" learning site. Date: 2026-11-06. Companion to `01-file-map-and-concepts.md` (file map, concept inventory, gotchas, open questions) and `02-examples-deep-dive.md`. This note owns the **pedagogy**: coverage, chapter design, economy, assessment, risks.

**Contents:** 0 Read this first (legend, status, top changes) | 1 Coverage audit (chapter map, 113-concept table, findings, prerequisite graph, open questions) | 2 Chapter-by-chapter design (shared structure, Trial kit, simulation contract, then Prologue to Epilogue) | 3 Catalogs (100 Negatives, 38 Stamps) | 4 Progression and economy | 5 Assessment design | 6 Risks | Appendix A Source conflicts

## 0. Read this first

### 0.1 Citation legend and accuracy tags

Same prefixes as note 01, so cross-references line up. Line numbers were taken from `cat -n` output of the files in `docs-llm/`.

| Prefix | File |
|---|---|
| `R:` | `git-official-docs/README.md` (the WICG explainer; source of truth for API shape) |
| `S:` | `git-official-docs/security-privacy-questionnaire.md` |
| `EX` | `git-official-docs/Examples/<file>`; `EX jelly/` = `Examples/webgpu-jelly-slider/` |
| `CC:` `2D:` `GL:` `GPU:` `IDX:` | `html-in-canvas-blogs/` (Chrome developer docs scrape): `concepts.md`, `2d.md`, `webgl.md`, `webgpu.md`, `index.md` |
| `SRC:` | this repo's existing scaffolding under `src/` |
| `01 section N #k` | open question *k* in note 01, section 5 |

Tags (a claim without a tag is stated by the cited source):

- `[I]` inference: a plausible reading no source states. **Must be verified in a native build before the site asserts it.** Trials never score `[I]` items; Labs may show them, labelled "model, unverified".
- `[X]` external web-platform knowledge not in the corpus (e.g. "assigning canvas.width resets the bitmap").
- `[OPEN]` the sources are silent or conflict; the site must not invent an answer.

### 0.2 Status framing

The Chrome docs say the API **shipped in Chrome 157** (`CC:426`, `IDX:19`); the README is a living explainer with no ship status (`R:5-7`; 01 section 5 #1). So the site's **simulation is a fallback for browsers without the API** (Firefox, Safari, older Chrome, and a forced `?sim` mode for tests), not the primary path. Native mode is the default wherever feature detection passes (`canvas.content === 'drawable'`, `CC:424-433`). Two repo files still describe it as flag-only (`SRC: src/hic/types.ts:4`, `src/core/capabilities.ts:73-74`); that copy should be updated, but runtime detection stays the source of truth. No cross-vendor support claim may appear anywhere (01 section 5 #37).

### 0.3 The ten changes to the draft, ranked

| # | Change | Why (detail in section 1.3) |
|---|---|---|
| 1 | **Move nested drawables out of Ch 1 into the Projector Hall.** Ch 1 only *declares* the drawable subtree (DOM-tree highlighting). | Nested drawables are only visible once you can draw and compute a rect (`EX nested-sparkles.html:47-61,69-91`). |
| 2 | **Swap Lens Grinder ahead of Projector Hall** (units + DPR before draw overloads). The Lens chapter owns the units table. | Dest rect = grid px but source rect = CSS px (`CC:318-320`); learners misplace every draw without it. Note 01's hard prerequisite: units before any draw exercise. |
| 3 | **Pull Accessibility forward (Ch 7) and fork the path after Ch 5**: a GPU wire (Orbit, Foundry) and a People-and-Platform wire (Lighthouse, Vault, Railway), merging at the Clockwork Heart. | Accessibility is use case #2 (`R:16`) and should not sit at 80% of the journey where drop-off is highest; GPU chapters need background not every learner has. |
| 4 | **Trim Ch 5**: it teaches geometry as a *concept* in 2D (auto, preserve, clip, order, clear) and the boss uses the 2D desync (`2D:73-95`). Building the 3D matrix moves to Ch 6. | Ch 5 as drafted holds seven or more ideas; `updateElementGeometry` is only *required* in 3D (`R:49`). |
| 5 | **Fill coverage gaps**: feature detection and the legacy attribute (Ch 1), nested canvases and "two paints" (Ch 2), source-rect outsets and exceptions (Ch 4), libraries (Ch 6, Epilogue), media export, hedged (Ch 9), the rejected worker design (Ch 11), fallback strategies (Epilogue). | See audit table: 49 of the 113 concepts are absent from the draft's chapter list. |
| 6 | **Replace the "zero wasted paints" Stamp** with *Quiet Tower* (no needless requestPaint loop) and *Frugal Printer* (no redundant uploads). | Paint events are fired by the browser; authors can only waste loops, redraws and uploads. |
| 7 | **Add a Truth Meter and dual-mode runtime** (Native/Simulated badge, per-Lab fidelity label, optional "Reality Check" that re-runs a Lab natively). | The simulation cannot reproduce everything (section 6.3); the learner must always know which behaviour is real. |
| 8 | **Build the assessment spine**: hidden pre-test in the Prologue, isomorphic post-test in the Exhibition, confidence-weighted items, Leitner "Rinse" warm-ups, boss-mixing matrix. | The draft has gamification but no evidence of learning (section 5). |
| 9 | **Add mini-bosses and a final boss** so every other chapter has a fight: Echo (Ch 11) and The Smudge (Epilogue, five audits). Chapters 2, 4, 6, 8, 10 get a non-boss Trial with a distinct mechanic. | The draft has four bosses in 13 slots. |
| 10 | **Dogfood Lens**: a toggle that overlays the hub's own hit regions, geometry and accessibility bounds. | The hub already uses the tech; showing its geometry makes Ch 5 and Ch 7 concrete and keeps the team honest about hub accessibility. |

### 0.4 Where I disagree with the draft's story claims (accuracy)

- "The Smudge = bitmap text that cannot be translated" is too strong if read literally. Canvas `fillText` can draw Unicode text. The README's claim is that there is no easy way to lay out *complex content* (rich text, wrapping, inline images, mixed scripts) and keep it accessible, localized, fast and crisp (`R:11`). The Prologue Lab must show that distinction, not a fake "canvas can't render Arabic".
- "Banished to the Fallback" is accurate for `content=fallback` (the default, `R:26`) but "fallback" also names a *different* concept: what to do when the browser lacks the API (`CC:424-443`). Keep "Fog" for the attribute meaning and call the engineering meaning the **Escape Hatch** (Epilogue). Never use the bare word "fallback" for both.
- "Paint" has two meanings the README itself separates: the new canvas `paint` event versus the browser's existing Paint step (`R:425`). The Bell Tower says "paint event" or "the bell" every time; "Paint" with a capital P only for the browser step.

---

## 1. Coverage audit

### 1.1 Chapter map: draft to proposed

| Proposed | Chapter | Draft # | Change |
|---|---|---|---|
| P | The Blank Canvas | P | + hidden pre-test, first print, "Two Trays" Lab, status framing |
| 1 | The Fallback Fog | 1 | removes nested drawing (to Ch 4); adds feature detection, invalid-value rule, legacy attribute relic |
| 2 | The Bell Tower | 2 | adds nested canvases, "two paints", frame primer, idempotence |
| 3 | The Lens Grinder (boss Blur) | 4 | moved earlier; owns the units table and the evolving Unit Ledger |
| 4 | The Projector Hall | 3 | moved later; absorbs nested drawables, source-rect outsets, exceptions, snapshot-not-live |
| 5 | The Mirror Maze (boss Ghost Clicks) | 5 | 2D-only geometry; 3D matrix moved to Ch 6; adds geometry-is-not-paint, getElementTransform |
| 6 | The Orbit Observatory | 6 | adds the manual canvasTransform build, WebGL config, libraries |
| 7 | The Lighthouse of Voices (boss Silence) | 9 | moved earlier (right after the geometry chapter it depends on) |
| 8 | The GPU Foundry | 7 | "delta chapter" over Ch 6; carries the jelly slider's design lesson |
| 9 | The Vault (boss The Leak) | 10 | adds iframe nuance, SPQ drill, hedged media export |
| 10 | The Worker Railway | 8 | moved after the Vault (captured snapshots are also read-back-safe) |
| 11 | The Clockwork Heart (mini-boss Echo) | 11 | adds the rejected worker design and the paint-vs-Paint vocabulary |
| E | The Endless Reel (final boss The Smudge) | E | adds Escape Hatch, ecosystem wall, the Exhibition exam |

### 1.2 Concept-to-chapter table

"Draft → Proposed" gives chapter codes (`none` = the draft does not cover it). Flags: **MISS** missing from draft, **MOVE** placed badly in draft, **HEDGE** sources silent or conflicting (see 1.5), **OK** fine as drafted.

| ID | Concept | Source | Draft → Proposed | Flag |
|---|---|---|---|---|
| K01 | Problem: no easy way to lay out complex content in canvas, hurting accessibility, i18n, performance, quality | R:11 | P → P | OK (mind 0.4) |
| K02 | Use case: styled, laid-out content (charts, creative tools, game menus) | R:15 | P → P, 4 | OK |
| K03 | Use case: accessibility without hand-syncing a DOM | R:16 | P → P, 7 | OK |
| K04 | Use case: shader effects on HTML (vs CSS filter, backdrop-filter, mix-blend-mode) | R:17 | P → P, 6, 8 | OK |
| K05 | Use case: HTML on 3D surfaces | R:18 | P → P, 6 | OK |
| K06 | Use case: media export (HTML as image/video) | R:19 | none → 9, E | MISS, HEDGE (#35) |
| K07 | Status: living explainer; shipped in Chrome 157 per docs | R:5-7; CC:426; IDX:19 | none → P, E | MISS, HEDGE (#1) |
| K08 | Authors and WICG process | R:459-468 | none → E (credits) | MISS |
| K10 | `content` attribute: `fallback` default, `drawable`; blockified, statically positioned children | R:25-26,109-112 | 1 → 1 | OK |
| K11 | Invalid or missing value reflects to `fallback` | R:109-112 | none → 1 | MISS |
| K12 | Feature detection: set `content`, read it back | CC:424-433 | none → 1, E | MISS |
| K13 | Legacy `layoutsubtree` attribute in demos | EX complex-text.html:13-15 | none → 1 (relic) | MISS |
| K14 | Children start with no geometry and are not hit-testable | R:26,317 | 1 → 1 (plant), 5, 7 | OK |
| K15 | `drawable` attribute; `isolation: isolate`; containing block | R:29 | 1 → 1 | OK |
| K16 | Drawable subtree = element + descendants minus nested drawables | R:29; CC:45-68 | 1 → 1 (declare) | OK |
| K17 | Nested drawables drawn independently (layering, per-word effects) | EX nested-sparkles.html:32-39,47,61 | 1 → 4 | MOVE |
| K18 | In-flow rect of a nested drawable (offsetLeft/Top, GeometryUtils fallback, times DPR) | EX nested-sparkles.html:69-91 | none → 4 (advanced note) | MISS |
| K19 | Drawing starts at the border box; `box-sizing: border-box` | R:37; CC:379-388 | none → 4 | MISS |
| K20 | A snapshot of drawable rendering is recorded every rendering update | R:32 | 2 → 2 | OK |
| K21 | `paint` must fire if a snapshot would differ; may over-fire, "should avoid" | R:32 | 2 → 2 | OK (teach idempotence) |
| K22 | `paint` fires just after IntersectionObserver steps in update-the-rendering | R:32,405-425 | 2, 11 → 2, 11 | OK |
| K23 | `CanvasPaintEvent.changedElements` | R:238-247; CC:93-101 | 2 → 2 | OK |
| K24 | Canvas draws in the handler show now; DOM changes there show next update | R:32; CC:110-123 | 2, 11 → 2, 11 | OK |
| K25 | Reverse document/tree order, children before parents | R:32 | 2 → 2 | OK |
| K26 | Nested canvases: the inner canvas paints first | CC:125-187 | none → 2 | MISS, HEDGE (#6) |
| K27 | `requestPaint()` | R:34 | 2 → 2 | OK |
| K28 | `onpaint` single slot vs `addEventListener('paint')` | R:113; CC:84-91 | none → 2 (note) | MISS (minor) |
| K29 | Is an initial paint automatic? (demos call requestPaint, Basic Example does not) | EX complex-text.html:44; R:70-80 | none → 2 | HEDGE (#12) |
| K30 | Self-sustaining loop: `requestPaint()` inside the handler | EX nested-sparkles.html:64; EX webGL.html:374; CC:189-206 | 2 → 2 | OK |
| K31 | Vocabulary: `paint` event vs browser Paint step | R:425 | none → 2, 11 | MISS |
| K32 | Trigger wording differs ("snapshot would differ" vs "layout, text, CSS change") | R:32; CC:80 | none → 2 (note) | HEDGE (#38) |
| K40 | `drawElementImage` draws the last snapshot into 2D | R:37 | 3 → 4 | OK |
| K41 | Four overloads plus `DrawElementImageOptions` | R:170-196; 2D:42-62 | 3 → 4 | OK |
| K42 | Source rect: outsets for clipping or ink overflow | R:37 | 3 → 4 | OK (no official example) |
| K43 | Destination rect: position and scale | R:37; EX nested-sparkles.html:61 | 3 → 4 | OK |
| K44 | Exceptions: not drawable, no snapshot yet, other canvas ancestors | R:37 | none → 4 | MISS, HEDGE (#6, #8) |
| K45 | Context transform applies (rotate, translate) | EX complex-text.html:39-42 | 3 → 4 | OK |
| K46 | `ctx.reset()` at the top of every handler | R:71; EX complex-text.html:39 | none → 4 | MISS (minor) |
| K47 | Rich content: emoji, RTL, vertical text, inline img/SVG | EX complex-text.html:16-32 | P → P, 4 | OK |
| K48 | You draw a snapshot, not the live DOM | R:32,37 | none → 4 | MISS |
| K49 | `(Element or ElementImage)` accepted by every draw/upload/geometry call | R:172-195,214,225 | none → 10 | MISS |
| K50 | ResizeObserver with `device-pixel-content-box` | R:75-79 | 4 → 3 | MOVE |
| K51 | Three coordinate systems; double anti-aliasing | CC:258-284 | 4 → 3 | OK |
| K52 | Units table (grid px vs CSS px vs texture px) | CC:313-324 | none → 3 (evolving ledger) | MISS |
| K53 | Scale factors from the resize observer; converting CSS to grid | CC:326-377 | none → 3 | MISS |
| K54 | Default 300x150 grid looks blurry | CC:282 | none → 3 | MISS |
| K55 | `getElementImageDefaultSize` | R:136-138; CC:319 | 4 → 3 (+6, 8) | OK |
| K56 | Robust sizing: feature-check, `contentRect * devicePixelRatio` fallback | CC:290-304; R:391-397 | none → 3, 10 | MISS |
| K57 | Assigning `canvas.width/height` clears the bitmap | [X] | none → 3 | MISS |
| K60 | Why geometry matters: hit testing, layout queries, accessibility bounds | CC:208-221 | 5 → 5 | OK |
| K61 | `updateElementGeometry` and its options | R:85-101 | 5 → 5 (concept), 6 (3D use) | OK |
| K62 | 2D `drawElementImage` updates geometry automatically | R:49 | 5 → 5 | OK |
| K63 | `preserveElementGeometry` and how it desyncs | R:162-168; 2D:71-95 | 5 → 5 | OK |
| K64 | `canvasTransform` (DOMMatrix, CSS px) | R:44; CC:322 | 5 → 5 (2D), 6 (build) | OK |
| K65 | `canvasClip` (hit-test only) | R:45 | 5 → 5 | OK |
| K66 | Hit-test list, order, `preserveHitTestOrder`, skip intervening clips/transforms | R:43,86-90; CC:232-247 | 5 → 5 | OK |
| K67 | `clearElementGeometry` | R:47; CC:249-256 | 5 → 5 | OK |
| K68 | `getElementTransform` (one argument per IDL; PixiJS snippet uses two) | R:126-130; IDX:116 | none → 5 | MISS, HEDGE (#18) |
| K69 | Geometry updates do not trigger paint | R:44-45 | none → 5 | MISS |
| K70 | 3D must call `updateElementGeometry` itself | R:49; CC:218 | 6 → 6 | OK |
| K71 | The official 3D demo approximates the turning card with an unrotated rect | EX webGLSetup.js:189-192; EX webGL.html:141-179 | none → 6 | MISS, HEDGE (#21) |
| K80 | `texElementSubImage2D` | R:210-216 | 6 → 6 | OK |
| K81 | `WebGLCopyElementImageConfig` | R:201-208 | none → 6 | MISS |
| K82 | Pre-allocate with `texImage2D(..., null)` at the default size | EX webGL.html:195-212; GL:31-76 | none → 6 | MISS |
| K83 | Texture parameters, `UNPACK_FLIP_Y_WEBGL` | EX webGL.html:186-189,327-328 | none → 6 | MISS |
| K84 | Upload only elements in `changedElements` | EX webGL.html:351-369 | none → 6 | MISS |
| K85 | Flip card: two textures, `inert` swap on the hidden face | EX webGL.html:60-84,108-128 | 6 → 6, 7 | OK |
| K86 | Libraries: three.js `HTMLTexture`, Babylon `HtmlTexture` | R:287; IDX:44-55,76-96 | none → 6 | MISS |
| K87 | Legacy `texElementImage2D` branches | EX webGL.html:213-230 | none → 6 (relic) | MISS |
| K90 | `drawElementImageToTexture` | R:232-236 | 7 → 8 | OK |
| K91 | WebGPU texture usage flags in the docs and demo | GPU:50-55; EX jelly/src/index.ts:68-72 | none → 8 | MISS |
| K92 | Source and destination dictionaries and their defaults | R:220-230; GPU:60-83 | none → 8 | MISS |
| K93 | Jelly design: invisible real input, `inert` readout, only the readout drawn | EX jelly/index.html:17,74-75; EX jelly/src/index.ts:773-820 | 7 (shader focus) → 8, 7 | OK (reframe) |
| K94 | `requestPaint` on `input`, focus and style changes | EX jelly/src/index.ts:103-109,927-934 | none → 2 (pattern), 8 | MISS |
| K95 | Reduced motion/transparency, forced colors, contrast, color scheme | EX jelly/index.html:30-59; EX jelly/src/index.ts:885-941 | none → 7 | MISS |
| K96 | Computed style to shader uniforms; focus re-expressed as jelly color | EX jelly/index.html:27-29; EX jelly/src/index.ts:927-937 | none → 8 | MISS |
| K97 | Pre-API baseline: 101-numeral atlas, canvas mouse handlers (both unused in the fork) | EX jelly/src/numbers.ts:3-5,23-62; EX jelly/src/events.ts:12-94 | none → 8 (cameo), P | MISS |
| K98 | Legacy `copyElementImageToTexture` | EX jelly/src/index.ts:783-799 | none → 8 (relic) | MISS |
| K99 | One transform shared by two elements; hard-coded TODO geometry | EX jelly/src/index.ts:802-818 | none → 8 | MISS |
| K100 | `captureElementImage` | R:39,117 | 8 → 10 | OK |
| K101 | `ElementImage`: transferable, Window+Worker, `close()` | R:249-252 | 8 → 10 | OK, HEDGE (#9) |
| K102 | OffscreenCanvas worker example | R:342-399 | 8 → 10 | OK |
| K103 | Offscreen geometry: microtask batch, async post to main, atomic apply | R:51,141-160 | 8 → 10 | OK |
| K104 | `elementgeometryupdate` / `ElementGeometryUpdateEvent.elements` | R:51,132-134,254-265,385-388 | 8 → 10 | OK |
| K105 | Worker-example sizing by `contentRect * dpr` plus `requestPaint` after resize | R:391-397 | 8 → 10 (ties to 3) | OK |
| K110 | Drawable content is in the accessibility tree like DOM | R:26,317 | 9 → 7 | MOVE |
| K111 | No geometry, reported without geometry | R:317 | 9 → 7 | MOVE |
| K112 | Hide unused views: `aria-hidden`, `inert`, removal | R:317 | 9 → 7 | MOVE |
| K113 | Focus rings and carets are rendered | R:319 | 9 → 7 (plant in 2) | MOVE |
| K114 | Figure/img/figcaption drawn separately | R:321-340 | 9 → 7 | MOVE |
| K115 | Roles, tabindex and `drawFocusIfNeeded` in the pie chart | EX pie-chart.html:24-31,62-63,77-78 | none → 7 | MISS |
| K116 | `inert` swap on a flip card | EX webGL.html:108-128 | none → 7 | MISS |
| K117 | `clearElementGeometry` marks the element offscreen for assistive tech | CC:249-256 | none → 5, 7 | MISS |
| K120 | Read-back-allowed rendering principle | R:295 | 10 → 9 | OK |
| K121 | Two channels: painting and invalidation | R:297; S:15 | 10 → 9 | OK |
| K122 | Sensitive list | R:299-307 | 10 → 9 | OK, HEDGE (#26-28) |
| K123 | Not-sensitive list | R:309-313 | 10 → 9 | OK, HEDGE (#27) |
| K124 | Same-origin iframes paint, cross-origin content in them does not | R:300 | none → 9 | MISS |
| K125 | Questionnaire answers (no persistent state, sensors, new script loading; no 1P/3P or private-mode difference) | S:21-24,36-47,59-67 | 10 → 9 | OK |
| K126 | Works only in fully active documents | S:79-81 | none → 9 | MISS, HEDGE (#31) |
| K127 | Normative text lives in a separate WHATWG PR | S:72 | none → 9 (footnote) | MISS |
| K128 | Questionnaire numbering skips 7 | S:26-31 | none → 9 (hidden) | MISS, HEDGE (#29) |
| K129 | `foreignObject` already exposes scrollbars and form looks | R:311 | none → 9 (sim design note) | MISS |
| K130 | The update-the-rendering list the options refer to | R:405-425 | 11 → 11 | OK |
| K131 | Option A (resize-observer timing, loop; placeholder flaw) | R:427-433 | 11 → 11 | OK |
| K132 | Option B (after Paint, loop) | R:435-439 | 11 → 11 | OK |
| K133 | Option C (selected): once, after Paint, locked-in frame | R:441-443 | 11 → 11 | OK |
| K134 | WebGL flush/deadlock argument against placeholders | R:433 | 11 → 11 | OK |
| K135 | Rejected: worker-thread snapshots for threaded effects | R:445-447 | none → 11 | MISS |
| K136 | Future: auto-updating canvas | R:449-453 | E → E | OK (label speculative) |
| K137 | Step numbers (14, 16.2.1, 16.2.6, 19) are tied to a spec version | R:407-415 | none → 11 (hidden) | MISS, HEDGE (#11) |
| K140 | Fallback strategies: alternative UI, overlays, three-html-render, html2canvas, dom-to-image | CC:424-443 | none → E | MISS |
| K141 | Libraries: PlayCanvas, PixiJS `HTMLSource`, CanvasUI | IDX:57-74,98-125 | none → E | MISS |

Tally: 113 concepts; 49 are **MISS** (absent from the draft's chapter list), 7 are **MOVE**, 14 carry a **HEDGE**. Most MISS rows are fine-grained facts the draft lumps into a chapter title, but 23 are chapter-level gaps (K06, K07, K12, K13, K18, K19, K26, K31, K44, K48, K52-K57, K68, K69, K86, K124, K135, K140, K141).

### 1.3 Findings: what the draft misses or orders badly, and the fixes

| # | Problem | Fix | Type |
|---|---|---|---|
| F1 | **Nested drawables in Ch 1 depend on Ch 2/3/5.** Seeing a nested drawable means drawing it separately (`EX nested-sparkles.html:47,61`), placing it (rect math, `:69-91`) and looping `requestPaint` (`:64`). | Ch 1 only *defines* the subtree with a DOM-tree highlighter. Nested drawing becomes the Projector Hall's capstone Lab. | reorder |
| F2 | **Units after draw.** The draft teaches overloads (Ch 3) before DPR (Ch 4), but dest rects are grid px while source rects, `canvasTransform`, `canvasClip` and `getElementTransform` are CSS px (`CC:318-322`), and README does not say so. Note 01 makes units a hard prerequisite of every draw exercise. | Swap: Lens Grinder is Ch 3, Projector Hall Ch 4. The Prologue's first print and Ch 1 still show the 3-argument draw (`R:70-73`), so the Lens Lab has something to focus. The Basic Example's ResizeObserver block (`R:75-79`) is shown as a sealed "lens cap" in the Prologue and opened in Ch 3. | reorder |
| F3 | **Paint before draw is abstract** unless something is drawn. | Spiral curriculum: the Prologue "First Print" worked example uses a minimal paint handler; Ch 2 deepens the handler with the draw call pre-scaffolded. | scaffold |
| F4 | **Ch 5 overloaded** (seven concepts plus a boss). `updateElementGeometry` is only *required* in 3D (`R:49`). | Ch 5 = geometry as a concept in 2D; boss Ghost Clicks uses `preserveElementGeometry: true` (`2D:71-95`) and 2D hit tests. The matrix build moves to Ch 6. | split |
| F5 | **Accessibility at 80% of the journey.** It is use case #2 (`R:16`), depends only on geometry (Ch 5), and its best 2D examples (`EX pie-chart.html:24-31,77-78`; `R:321-340`) need no GPU. | Move to Ch 7, ahead of WebGPU and workers; plant it earlier (Ch 1 tree membership, Ch 2 Caret, Ch 5 bounds). | reorder |
| F6 | **GPU chapters gate non-GPU learners.** A canvas-2D chart author may never touch WebGL/WebGPU. | Fork after Ch 5 (see 1.4): Wire A (Orbit, Foundry) optional for Master; Wire B (Lighthouse, Vault, Railway) required. Trials use prewritten shader presets, never free GLSL/WGSL. | split |
| F7 | **Jelly slider reduced to "WebGPU example".** Its real lesson is design: an invisible real `<input>`, only the readout drawn, `inert` on the readout, focus re-expressed in the shader, preferences honored (`EX jelly/index.html:17,27-29,74-75`; `EX jelly/src/index.ts:811-814,885-941`). | Ch 8 becomes a short "delta" chapter (what differs from WebGL) plus this design lesson; Ch 7 uses its preference handling. The unused `numbers.ts` atlas (`:3-5,23-62`) becomes the Smudge's "before" picture. | merge |
| F8 | **Media export is a listed use case with no home** (`R:19`). The mechanism is undocumented (01 section 5 #35). | Ch 9: framed only as "why read-back-safe pixels may leave the canvas" (`R:295`); no recipe on a card. | add |
| F9 | **Feature detection and the Escape Hatch are missing.** `canvas.content === 'drawable'` (`CC:424-433`) is the natural follow-up to the `content` attribute and its reflection rules (`R:109-112`). | Test Strip in Ch 1; full fallback strategies (`CC:424-443`) as a decision Lab in the Epilogue. | add |
| F10 | **Ecosystem is missing** (`R:287`; `IDX:44-125`). The PixiJS snippet calls `getElementTransform` with two arguments (`IDX:116`) while the IDL has one (`R:126-130`), and sets `style.transform` the way demos mark "do not use" (`EX webGL.html:175-177`). | Guild Hall cards in Ch 6 (three.js, Babylon) and the Epilogue (PlayCanvas, PixiJS, CanvasUI), explicitly "wrapper libraries, behavior may differ from the README". | add |
| F11 | **The rejected worker design is missing** (`R:445-447`) although Ch 11 and Ch 8 depend on it. | Ch 11 second half: "Road Not Taken", then the Epilogue's auto-updating canvas as the proposed successor (`R:449-453`). | add |
| F12 | **"Zero wasted paints" is not authorable.** The browser fires paint; the examples intentionally loop `requestPaint` (`EX nested-sparkles.html:64`, `EX webGL.html:374`) and gate *uploads* on `changedElements` (`:351-369`). | Replace with Quiet Tower and Frugal Printer (3.2). | fix |
| F13 | **Boss spacing.** Four bosses over 13 slots. | Add mini-boss Echo (Ch 11) and the final Smudge (Epilogue); non-boss Trials in Ch 2, 4, 6, 8, 10 use distinct mechanics (2.2). | add |
| F14 | **Ch 11 needs platform knowledge nothing teaches** (rAF, ResizeObserver, IntersectionObserver in the same frame; `R:405-425`). | Ch 2 carries a 90-second "Frame Strip" primer; Ch 3 teaches ResizeObserver properly; the Rendering Update card (bell-01) names IntersectionObserver as the step the bell follows. | scaffold |
| F15 | **Naming collisions**: "fallback" (attribute vs strategy), "paint" (event vs step). | 0.4: Fog vs Escape Hatch; "bell" vs "Paint". | rename |
| F16 | **No review structure.** The draft ends every chapter and moves on. | "Rinse" warm-up at the start of each chapter, fogging cards, boss mixing, and the Exhibition (section 5). | add |
| F17 | **Hub dependency risk.** The hub's perspective-tilted prints need hit-testing under a projective `canvasTransform`, which no source shows (the official demos use scale+translate only: `GL:117-131`, `GPU:119-126`, `EX webGL.html:161-169`; 01 section 5 #21). | Verify natively before the hub relies on it; otherwise hub prints face the camera (axis-aligned) while the 3D scenery supplies depth. Trials teach only the affine form. | risk |

### 1.4 Prerequisite graph (with the fork)

```
P -> 1 -> 2 -> 3 -> 4 -> 5 --+--> 6 (Orbit) -> 8 (Foundry) ----------+
                              |                                       +--> 11 (Heart) -> E (Reel)
                              +--> 7 (Lighthouse) -> 9 (Vault) -> 10 (Railway) --+
```

Hard edges (each from a concept dependency, not preference): 1 before 2 (need `drawable` to have a snapshot), 2 before 3 (a resize must be followed by a repaint, K57), 3 before 4 (units before overloads), 4 before 5 (geometry presumes a drawn element), 5 before 7 (accessibility bounds are geometry), 5 before 6 (3D replaces automatic geometry), 7 before 9 and 9 before 10 (captured snapshots are covered by read-back-allowed rendering, `R:295`), 10 before 11 (the rejected worker design), 11 and the whole Wire B before the Epilogue. Soft edge: 6 before 11 (Option A's flaw cites WebGL, `R:433`; Ch 11 carries a 20-second WebGL primer for those who skipped Wire A). Everything unlocks one chapter at a time by Trial pass (draft rule kept); the fork simply makes two prints hang on separate wires after Ch 5.

### 1.5 What the sources do not settle (never invent these)

Cross-referenced to note 01 section 5. The site's Trials never score these; Labs show them as "unverified" or omit them.

| Open item | Where it bites | Policy |
|---|---|---|
| Is an initial paint automatic? (#12) | Ch 2 | Teach "request one defensively, as the demos do"; do not claim it is required or unnecessary. |
| May `drawElementImage` run outside `paint`? (#10) | Ch 2, 4 | Always teach drawing inside the handler; never claim outside is an error. |
| "Other canvas ancestors" wording vs the nested-canvas docs (#6) | Ch 2, 4 | Teach "draw into the canvas that owns the element". |
| `ElementImage.close()`, capture preconditions, lifetime (#9) | Ch 10 | Lab shows it as a model; no Trial item. |
| Perspective (non-affine) `canvasTransform` hit testing (#21) | Ch 6, hub | Affine only in Trials; perspective only in an `[I]` Lab. |
| `canvasClip` coordinate space (#16); transform units vs the worker-example comment (#17) | Ch 5, 10 | Use the Chrome docs' "CSS px" and the worked 2D snippet (`2D:77-88`) only. |
| `getElementTransform` arity (#18) | Ch 5 | One argument, per IDL; library snippets flagged. |
| What replaces withheld content (#26); README vs questionnaire lists (#27); system colors vs forced-colors (#28) | Ch 9 | Scored items use only unambiguous list entries; ambiguous ones are unscored "discussion" slots. |
| Non-fully-active transitions (#31) | Ch 9 | Say only "works only in fully active documents". |
| Scroll/animation inside drawables (#34) | Ch 11, E | Mentioned only as motivation for the future auto-updating mode. |
| Media-export mechanism (#35) | Ch 9 | "Why it is allowed", never "how to do it". |
| Cross-vendor status (#37) | everywhere | No claim about any browser but Chrome 157. |

## 2. Chapter-by-chapter design

### 2.1 Shared structure

Every chapter keeps the draft's three frames and adds two thin layers:

| Layer | Length | Purpose |
|---|---|---|
| **Rinse** (chapter entry) | 90 s, 2 questions | Spaced recall of older Negatives (section 5.3). Never blocks; wrong answers fog the card instead. |
| **Story** | 2-3 min | Cutscene with a transcript, then **one predict-first question** about the Lab ahead (pre-testing effect). |
| **Lab** | 6-12 min | Sandbox, no fail state. Predict, toggle, observe, explain: the Lab asks for a prediction before each major toggle and logs accuracy. |
| **Trial** | 5-12 min | Scored. Has a pass threshold, a numeric win condition, and a justification step ("why?" chips) so a lucky guess does not pass. |

Rules for all Trials: every option has a *named* misconception distractor with feedback citing the source line; hints are three-level and cost only the no-hint bonus; every timed mechanic has an untimed or turn-based mode with identical silver; every drag mechanic has a keyboard path; item parameters are seeded so a re-run shows a different variant.

Total length at typical pace: 4.5 to 5.5 hours (Prologue 15 min including the pre-test; chapters 20-30 min; Exhibition 40 min).

### 2.2 Trial mechanic kit (so the thirteen Trials do not all feel like quizzes)

| Pattern | Used in | Accessibility path |
|---|---|---|
| T1 **Parsons assembly**: arrange and complete code chips, with distractors | P, 6, 8 | Move-up/move-down buttons; chips are real buttons. |
| T2 **Predict the frame**: forecast what an event stream does, then watch it run | 2 | Turn-based stepping; each frame is a labelled row. |
| T3 **Aim to match**: tune parameters until a live result matches a target (score: IoU) | 4 | Numeric fields beside every handle; target described in text. |
| T4 **Wave defense**: environment changes in waves and you apply the right fix | 3 | Turn-based mode; waves announced via a live region. |
| T5 **Policy routing**: choose a policy per item, then run a simulation that exposes mistakes | 5, 10 | Policy menus are native `<select>`s; the run is replayable step by step. |
| T6 **Triage and sort**: classify items into bins, defend against attacks | 7, 9 | Bins are lists with "Move to" actions. |
| T7 **Bug-bash**: find and fix seeded defects in a working print | E | Defects listed in a panel; every fix is a labelled control. |
| T8 **Matrix and review**: fill a prediction matrix, then justify a design choice | 11 | Plain table with row/column headers. |
| T9 **Lamp puzzle**: set configuration switches per room under a lives budget | 1 | Switches are checkboxes; "lives" can be set to unlimited. |

### 2.3 The Simulation Contract ("Fallback Reel")

Native mode (Chrome 157+, detected by `canvas.content === 'drawable'`, `CC:424-433`) runs real code. The **Fallback Reel** is the same Labs and Trials running through a thin adapter on browsers without the API, and in `?sim` for deterministic tests. Principle: **Trials grade against a spec model of observable behaviour (events, lists, flags, ordering), never against pixels**, so a Trial's verdict is identical in both modes and CI can run it headless.

| Module | What it reproduces | How | Fidelity |
|---|---|---|---|
| S1 `SimCanvas` | `content` reflection (invalid to `fallback`), `drawable` marking, `requestPaint`, `onpaint`/`paint`, `changedElements` | Polyfill on `HTMLCanvasElement`; children stay real DOM, visually hidden | **M** (model) |
| S2 `SimSnapshot` | "A snapshot is recorded each rendering update" (`R:32`) | Rasterize the drawable subtree to an `ImageBitmap` at the end of layout (SVG `foreignObject` raster, fonts inlined), refreshed on mutation/resize/animation; doubles as the `ElementImage` payload | **I** (illustrative: no live caret, native form controls differ) |
| S3 `SimFrame` | The ordering rAF, resize observers, intersection observers, snapshot, paint event (`R:405-425,443`) | One rAF-driven pipeline that fires `paint` after ResizeObserver and IntersectionObserver callbacks; a **spurious toll** option (default 10% in Ch 2) to teach idempotence (`R:32`) | **M** for order, **I** for exact browser timing |
| S4 `SimDraw2D` | The four `drawElementImage` overloads, unit conversion (dest = grid px, source = CSS px, `CC:318-320`), exceptions (`R:37`), automatic geometry | Over `drawImage` with the snapshot bitmap | **M** |
| S5 `SimGeometry` | Ordered hit-test list, `canvasTransform`, `canvasClip`, `preserveHitTestOrder`, `clearElementGeometry`, `getElementTransform`, "no geometry" flag | Pointer router: invert transforms in stack order, test clips, dispatch synthetic events to the target element | **M** for lists and results; **I** for focus, selection, IME |
| S6 `SimGL` | `texElementSubImage2D` incl. config, pre-allocation rule, flip-Y | `texSubImage2D` from the snapshot bitmap | **M** |
| S7 `SimGPU` | `drawElementImageToTexture` dictionaries and validation | Descriptor validator (rules from `R:220-230`, `GPU:60-83`; usage-flag rule marked `[I]`) then `copyExternalImageToTexture` where WebGPU exists, else a WebGL2 or 2D effect-lite | **M** validation, **I** visuals |
| S8 `SimWorker` | `captureElementImage`, transfer, worker draw, microtask batching, async apply, `elementgeometryupdate` (`R:51`) | `ImageBitmap` stands in for `ElementImage` (transferable); real `Worker` and `OffscreenCanvas` | **M** for sequencing; the handle's `close()` semantics are `[OPEN]` |
| S9 `SimRedact` | Read-back-allowed rendering for a fixed set of **fixtures** | Scripted fixtures carry a `sensitive` tag from `R:299-307`; the sim paints a labelled "withheld" hatch. The real appearance of withheld content is unspecified (01 section 5 #26), so the hatch is captioned "placeholder". `foreignObject` already behaves similarly for external resources (cf. `R:311`) `[X]` | **M** for classification, **I** for appearance |
| S10 `SimA11y` | Accessibility-tree membership plus the "no geometry" flag (`R:317`) | A *model* tree computed from the DOM and the geometry store; the Lab inspector is labelled "model of README behaviour", not a platform tree | **M** for the rule, **N** for real assistive tech |
| S11 `SimDPR` | Fractional DPR and zoom (Ch 3) | A virtual device-pixel grid computed by the lab; where real `ResizeObserver` `devicePixelContentBoxSize` exists it is used | **M** numbers, **I** loupe |

**Truth Meter.** Every Lab and Trial header shows a three-segment badge: *Model-faithful* (behaviour is from the spec text), *Illustrative* (a visual stand-in) and *Native-only* (needs the real API). Native mode adds **Reality Check**: re-run the Lab's scenario on the real API and show a diff. Differences are logged (locally) as sim bugs. Known limits are in section 6.3.

### 2.4 Visual system: what is constant and what varies

Constant (usability): UI type is Atkinson Hyperlegible Next with Mono for code (both already dependencies in `package.json`); Bodoni Moda is for print titles only. Controls, spacing, Story/Lab/Trial chrome, Truth Meter and the Album behave the same in every chapter. Variable (the world): palette, signature effect, motion language, ambient sound (always optional and captioned). Every effect has a **reduced-motion** and **reduced-transparency** variant (the same preferences the jelly demo honors, `EX jelly/src/index.ts:885-908`), no luminance flashing above 3 per second, and all text pairs meet 4.5:1 against their chapter background (palettes below are the *world* colors; text colors are picked from them with a contrast check at build time). Locked hub prints share one effect, **latent develop**: a noise-threshold reveal that runs when a chapter unlocks.

---

### Prologue. The Blank Canvas

**Draft delta:** adds the hidden pre-test, a ten-line "First Print" worked example (README Basic Example), the "Smudge cameo", and the status framing (0.2).

**Learning objectives**
1. Given eight statements, choose the ones the README names as consequences of having no easy way to lay out complex content in canvas (layout, accessibility, internationalization, performance, quality; `R:11`) and reject the two decoys (for example "canvas cannot draw Unicode glyphs"): at least 6 of 8.
2. Match five scenarios to the five use cases (`R:15-19`): at least 4 of 5.
3. In the Basic Example, point at the four visible primitives (`content`, `drawable`, `onpaint`, `drawElementImage`) and say why the fifth, geometry sync, is invisible (it is automatic in 2D, `R:49`): at least 4 of 5.
4. Complete the 12-item hidden pre-test (completion, not score, is required; this is the baseline for section 5).

**Story beat.** The Canvas Kingdom paints everything by hand: every letter, every button, even the blinking cursor. Caret, a text cursor who has lost their input field, finds the apprentice's darkroom and shows a single print where a real `<form>` appears inside the canvas, caret and all (`R:55-81`). The Smudge's first mark is already on the wall: a 101-slice atlas of pre-baked percentages (`EX jelly/src/numbers.ts:3-5,23-62`), the way things were done before.

**Lab: "Two Trays."** Two development trays side by side. Left: the same multilingual paragraph and an emoji, drawn with `fillText` into a canvas. Right: the same markup drawn by `drawElementImage` (`EX complex-text.html:16-32`: emoji, RTL, vertical text, an inline image, inline SVG). The learner manipulates: text size, language (flip LTR/RTL, vertical writing), zoom, a "select and copy" probe, a "screen reader view" (model, S10) and a width squeeze to force wrapping. They observe: the left tray draws glyphs fine but the learner must write every line break, wrap and layout rule; selection and structure are absent; the right tray wraps, shapes and exposes structure. (This keeps 0.4 honest: the point is layout and semantics, not glyph support.) A sealed "lens cap" over the right tray's ResizeObserver block says "opened in Chapter 3".

**Trial: "First Light."** Mechanic T1 (Parsons). *Win condition:* assemble the Basic Example from chips, in order, with the five primitives placed correctly: `<canvas content="drawable">`, `<form drawable>`, `canvas.onpaint = ...`, `ctx.reset(); ctx.drawElementImage(form, 100, 0)`, with the lens cap pre-placed. Distractor chips: `content="fallback"`, a lone `layoutsubtree`, `ctx.fillText(form.textContent, ...)`, a `drawElementImage` call on a child without `drawable`. Pass = a working print within three attempts; full bonus for the first attempt. *Proves understanding:* the learner must discriminate the attribute pair and the handler, and each distractor targets a known misconception (X14, X35 in note 01 section 4). *Without the API:* S1, S2, S4 only. The sim renders the form as a bitmap into the canvas; the "blinking cursor" is an overlay animation labelled illustrative. Fidelity: **model-faithful** for structure, **illustrative** for pixels.

**Visual identity.** Palette: paper #F2EDE3, emulsion black #14110F, safelight red #B3202A, fixer teal #2F5D62, silver gelatin #C9B27C. Signature effect: **latent image**: the print emerges from white paper through a noise-threshold develop shader; the first print "develops" in front of the learner. Motion: slow tray rocking, drifting grain, the safelight pulsing at 0.25 Hz (reduced-motion: static).

**Negatives:** pro-01, pro-02, pro-03. **Stamps:** first-light, blink (hidden).
**Official examples:** `R:55-81` (Basic Example); `EX complex-text.html:16-32` (rich content); `EX jelly/src/numbers.ts:3-5,23-62` (pre-API cameo).

---

### Chapter 1. The Fallback Fog

**Draft delta:** nested drawing moves to Ch 4; adds feature detection (Test Strip), the invalid-value rule and the legacy-attribute relic. Keeps the draft's story.

**Learning objectives**
1. Classify six snippets by whether their canvas children are laid out (`content="drawable"`) or treated as fallback (default, missing or invalid value, `R:26,109-112`): at least 5 of 6, including the `content="drawble"` typo.
2. State what `drawable` adds (`isolation: isolate`, containing block, an independent paint root; `R:29`) and what `content="drawable"` adds (opt-in to layout, blockified and statically positioned immediate children; `R:26`): 2 of 2.
3. Mark the drawable subtree boundaries on two DOM trees, one with a nested `drawable` (`R:29`; `CC:45-68`): exactly right on both.
4. Write `supportsHtmlInCanvas()` (`CC:424-433`) and predict its result in a browser with no API: 2 of 2.
5. Name the one thing an element has *not* got yet after being declared: geometry and hit-testability (`R:26,317`), as a promissory note for Ch 5 and 7.

**Story beat.** Caret leads the apprentice into the Fog, the place where HTML children of a `<canvas>` have always been sent: fallback content, never laid out for drawing (`R:26`). Two lamps part it. One on the canvas (`content="drawable"`) lets layout reach through; one on each element (`drawable`) marks it as a print of its own. Beyond the Fog, the Smudge's lanterns flicker: strange old marks like `layoutsubtree` that mean the same as something newer.

**Lab: "Fog Lamp."** A DOM tree on the left, a stage on the right. Toggles: the canvas `content` value (type it, so `drawble` can be tried), a `drawable` checkbox per node, and an element kind switch (inline `<span>` vs block `<div>`). Observations: layout outlines appear only when `content="drawable"`; an immediate inline child becomes block (`R:26`); a `position: absolute` descendant is anchored to the nearest `drawable` (containing block, `R:29`; whether forced or default is `[OPEN]`, 01 section 5 #5, so the Lab shows only the anchoring result); the subtree highlighter shades "this print" versus "its own print" for nested nodes; a model accessibility panel (S10) lists every node but marks all "no geometry yet" (`R:317`); a hit-test overlay shows nothing is hit-testable yet (`R:26`); a console runs the Test Strip.

**Trial: "Lamp Lighting."** Mechanic T9. Six rooms (HTML snippets) lie in fog; each needs the right lamps to appear. Three lives (unlimited in accessible mode). *Win condition:* light all six rooms with at most three mistakes. Two trap rooms: a misspelled `content` value, and a child that has no `drawable` (it would throw if drawn, `R:37`). *Proves understanding:* a room is only lit when the learner picks the right switches *and* picks the reason from three justification chips. *Without the API:* S1 only; pure declarative reasoning. Fidelity: **model-faithful**.

**Visual identity.** Palette: fog #9AA5B8, mist #D9DCE6, shadow #3B4252, lamp amber #E8B04A, edge teal #7FB7BE. Signature effect: **volumetric fog parting**: layered noise planes with depth-blur that clear in a radius around each lit lamp; fogged elements are low-contrast and blurred, lit ones crisp. Motion: drifting layers, lamp flicker, a slow lantern sway (reduced-motion: static haze with a hard-edged clear zone).

**Negatives:** fog-01, fog-02, fog-03, fog-04, fog-05, fog-06 (relic). **Stamps:** lamplighter, typo-hunter (hidden).
**Official examples:** `R:25-29,57-63`; `EX complex-text.html:13-16` (legacy-attribute comment); `EX nested-sparkles.html:32-39` (markup only; drawing waits for Ch 4); `CC:27-68,424-433`.

---

### Chapter 2. The Bell Tower

**Draft delta:** adds nested canvases, the "two paints" vocabulary, idempotence, the frame primer, and one rule: the Trial scores only unambiguous cases (must-fire / should-stay-silent / loop-on-request), since over-firing is allowed (`R:32`).

**Learning objectives**
1. Given nine change events (style change on a drawable, text edit, focus change, change outside the canvas, a request, etc.), label each **must toll**, **should stay silent (may toll spuriously)** or **tolls on request**: at least 7 of 9 on the unambiguous set.
2. Place the paint event in a simplified rendering update: rAF callbacks, style and layout, ResizeObserver, IntersectionObserver, snapshot and Paint, **paint event**, commit (`R:405-425,441-443`): exact order, 1 attempt of 3.
3. Predict, for three handlers, what appears this frame and what appears next frame (canvas draws vs DOM edits, `R:32`; `CC:110-123`): 3 of 3.
4. Use `changedElements` to restrict work (`R:238-247`) and write a handler that is safe if the event fires when nothing changed: complete a template correctly.
5. Run an animation loop with `requestPaint()` and stop it when the scene is idle (`R:34`; `EX nested-sparkles.html:64`): fix 3 of 3 seeded loops.
6. State the order for a nested canvas (inner first, `R:32`; `CC:125-187`) and name the two senses of "paint" (`R:425`): 2 of 2.

**Story beat.** A tower whose bell tolls whenever something in the prints below *would look different*, not when anything at all happens in the world. Caret learns the bell may sometimes ring for nothing (`R:32`), so the keeper must be able to ring it twice without harm. Bells in the lowest rooms ring first, then the ones above them (`R:32`). The keeper's second lesson: a canvas drawing made now lands in this frame, but a change to the DOM made while ringing shows only in the next one.

**Lab: "Belfry Console."** A drawable form (input, checkbox, a CSS animation, an unrelated element outside the canvas) and a live event log. Controls: type, tab, hover, toggle a class, edit outside the canvas, call `requestPaint()`, run a DOM edit inside the handler, toggle the spurious-toll rate (S3). Observations: each toll appears in the log with its `changedElements` list highlighted on the prints; a Frame Strip shows where in the frame the toll fell (after the observer steps) and shades the "current frame" versus "next frame" for DOM edits; a second canvas nested in a drawable shows inner-first order; a toggle contrasts the paint event with the browser's Paint step (`R:425`). A flagged `[I]` panel shows a focused input's caret ringing the bell on every blink (`R:312,319` support the premise; 01 section 5 #34 and the Stamp *Heartbeat* stay hidden until verified natively).

**Trial: "Ringing Hours."** Mechanics T2 plus a repair round. *Win condition:* over 20 frames the learner forecasts toll/silent/request correctly at least 85% (on the unambiguous set), then fixes 3 buggy handlers: one expects a DOM edit to show instantly, one runs an unconditional `requestPaint` loop on a static scene, one assumes the event never fires spuriously. Pass is 70% with all three fixes. *Proves understanding:* forecasts require applying the rule to new streams, and each fix needs the mechanism named. *Without the API:* S1 and S3. The sim drives `paint` with a MutationObserver/ResizeObserver change detector; its spurious tolls teach idempotence deliberately. Fidelity: **model-faithful** for ordering and semantics, **illustrative** for timing; the caret premise is `[I]`.

**Visual identity.** Palette: stone #2F3640, verdigris #43A08A, bronze #B5793B, candlelight #FFD479, mist #C8D1D9. Signature effect: **shockwave rings**: a radial displacement shader ripples across the prints each time the bell tolls; the ring width encodes how many elements changed. Motion: pendulum swing, rope sway; each toll has a caption (sound optional; reduced-motion: concentric static rings with a text count).

**Negatives:** bell-01 to bell-08. **Stamps:** quiet-tower, bell-ringer, heartbeat (hidden, `[I]`).
**Official examples:** `R:31-34,70-73`; `EX nested-sparkles.html:44-65` (loop); `EX webGL.html:345-376` (`changedElements`); `EX jelly/src/index.ts:103-109` (`requestPaint` on `input`); `EX complex-text.html:44` (initial request); `CC:78-206`.

---

### Chapter 3. The Lens Grinder (boss: Blur)

**Draft delta:** moved ahead of the Projector Hall; owns the units table (`CC:313-324`) as an **evolving card** (the Unit Ledger); adds the default-grid blur, robust sizing and the resize-clears-bitmap rule.

**Learning objectives**
1. Compute the canvas grid for a CSS size and DPR, including fractional DPR and the worked 360x180 CSS at 1.5 DPR = 540x270 example (`CC:274-280`): 5 of 5.
2. Sort ten parameters into CSS px, device px or canvas-grid px using the table (`CC:313-324`), revealing the rows available so far (`canvas.width/height`, `dx/dy/dwidth/dheight`, `getElementImageDefaultSize`, DOM measurements, `devicePixelContentBoxSize`): at least 9 of 10.
3. Write a ResizeObserver that sizes the grid with `device-pixel-content-box` and falls back to `contentRect * devicePixelRatio` when unsupported (`R:75-79`; `CC:290-304`), and compute `scaleX = canvas.width / cssContentWidth` (`CC:347`).
4. Diagnose three blur causes: default 300x150 grid (`CC:282`), grid not equal to device pixels (`CC:262-284`), a CSS-px value passed where grid px are expected (`CC:326-377`): 3 of 3.
5. Explain why a resize must be followed by a redraw (`[X]` assigning width/height clears the bitmap; the worker example requests a paint after resizing, `R:391-397`).

**Story beat.** In the lens grinder's shop every lens is ground to match the screen's own pixel grid. The apprentice's first print looks soft: Blur, a boss who changes the screen in waves (a different monitor, a zoom, a fractional scale). Caret learns the three grids that never agree: the page's CSS pixels, the glass's device pixels, and the canvas's own grid (`CC:260`).

**Lab: "Focus Bench."** A virtual screen with sliders for DPR (1 to 3, fractional allowed), page zoom, canvas CSS size and the canvas `width/height`. A magnifying loupe shows the pixel edge of a circle and a text glyph: unaligned grids visibly resample twice (`CC:262-284`). A switch turns on ResizeObserver auto-sizing. A readout shows the three sizes and a **sharpness score** (1.0 when grid equals device pixels). The Unit Ledger pins the table; rows for source rects, `canvasTransform`/`canvasClip`, texture sizes and `getElementTransform` are **sealed with wax** and unseal in Ch 4, 5, 6 and 8 (the evolving card). A conversion drill has the learner place a card at the centre using `offsetWidth * scaleX` (`CC:362-377`).

**Trial (boss Blur): "Five Dioptres."** Mechanic T4. Blur attacks in five waves: DPR 1, DPR 2 plus zoom, a monitor move (DPR changes live), DPR 1.5, DPR 1.25 with a layout resize. For each wave the learner applies a sizing action (hard-coded size, `width = round(css*dpr)`, `device-pixel-content-box`, unit conversion on a draw call) before the wave lands. *Win condition:* sharpness 1.0 for the settled state in at least four of five waves, no blurred frame longer than 200 ms in the learner's chosen mode (untimed mode checks the settled state only), and the Ledger quiz 9/10. Blur's HP falls only when the grid equals the device grid. *Proves understanding:* the correct fix differs per wave (a fixed multiplier fails at 1.5), and the unit questions confirm which grid each parameter uses. *Without the API:* S11 and S4; real `ResizeObserver` `devicePixelContentBoxSize` where available. Fidelity: **model-faithful** (numbers), **illustrative** (loupe).

**Visual identity (a deliberately light chapter).** Palette: blueprint paper #EAF2F8, ink navy #0B3C5D, lens blue #328CC1, brass #D9B310, steel #1D2731. Signature effect: **rack focus**: the scene goes from blurred to crisp with a chromatic fringe that shrinks to zero as grid and glass align; faint aligned pixel-grid lines overlay the bench. Motion: lens carousel, a slowly turning lathe (reduced-motion: crossfade between "soft" and "crisp").

**Negatives:** lens-01 to lens-07. **Stamps:** pixel-perfect, fractional-focus, zoom-zoom (hidden).
**Official examples:** `R:75-79,136-138,391-397`; `EX complex-text.html:46-50`; `EX pie-chart.html:82-87`; `EX nested-sparkles.html:54,86-90,94-98` (DPR scaling); `CC:258-388`.

---

### Chapter 4. The Projector Hall

**Draft delta:** moved after Lens; absorbs nested drawables (from Ch 1), the border-box rule, exceptions, source-rect outsets and snapshot-not-live; unseals the Ledger's source-rect row (CSS px).

**Learning objectives**
1. Choose the overload for eight described intents (place, scale, crop, crop-and-scale, glow included, etc.; `R:171-195`; `2D:42-62`): at least 7 of 8.
2. For four tasks, write the arguments with the right units: source rect in CSS px, destination in grid px (`CC:318-320`): 4 of 4.
3. Explain the border-box rule and fix a clipped box-shadow by widening the source rect (`R:37`; ink overflow outset; the negative-offset form is `[I]`, no official example): reach IoU 0.95 on the fixed print.
4. Predict the result of `ctx.rotate/translate` before a draw (`EX complex-text.html:39-42`): 3 of 3.
5. Draw a nested drawable on top of its parent at the right place and state why the parent omits it (`R:29`; `EX nested-sparkles.html:47,61,69-91`): reproduce with at most one hint.
6. Name the three throw conditions (`R:37`), and distinguish nested drawables (one canvas) from nested canvases (Ch 2): 4 of 4.
7. State "you draw a snapshot, not the live DOM" and give one example of pixels and DOM disagreeing (`R:32,37`).

**Story beat.** Down in the Projector Hall the carbon-arc lamp throws a negative through the gate (the source rect) onto the screen (the destination rect). The apprentice learns that the gate starts at the border box, so a glowing shadow gets cut off unless the gate is widened. A nested lantern slide is a print of its own, so Caret can make a single word sparkle while the rest of the poem stays still. A minion, the Cut-Off Shadow, lurks in the booth.

**Lab: "The Gate and the Screen."** A negative (a card with text, a box-shadow glow and a nested `<span drawable>`) on the left; on the right a screen. Draggable gate and screen rectangles drive a live `drawElementImage(...)` line with the active parameters highlighted and units annotated; an overload switch changes the line; canvas rotation and translation sliders show the pipeline order; a layer toggle draws the nested span separately or not at all, with a sparkle toggle copied from the official demo (`EX nested-sparkles.html:53-61`). Observations: the glow is clipped until the gate is outset; the parent never contains its nested child; the nested child must be positioned by an in-flow rect (`:69-91`), shown with the DPR multiplier; an error panel triggers each of the three throw conditions. The Ledger unseals the source-rect row.

**Trial: "Reel Change."** Mechanic T3. Six levels, each with a target silhouette: position, scale, crop, crop-and-scale, glow-preserving outset, and nested layering. The learner sets arguments (or fills code chips); the projected result is compared with the target. A misfire round asks which of three calls throws and why. *Win condition:* all six levels at IoU at least 0.95 and at least 2 of 3 misfire predictions right; Perfect Projection needs IoU 0.99. *Proves understanding:* the arguments are checked, so a guess cannot match unit-sensitive levels. *Without the API:* S4 plus S2 (an ink-overflow margin is rasterized so the outset is real). Fidelity: **model-faithful** for rects and units; the negative-outset form is `[I]` and clearly tagged in the Lab.

**Visual identity.** Palette: velvet #0C0C10, beam #F7E7B4, curtain #E4572E, balcony blue #29335C, marquee gold #F3A712. Signature effect: **volumetric light cone**: the beam from gate to screen is drawn with dust motes and keystone distortion; the cone's edges literally are the source and destination rectangles. Motion: a gentle projector flicker kept below 3 Hz luminance change (so no 24 fps flash; the 24 fps feel comes from a grain overlay at low contrast) and slow reel rotation (reduced-motion: a still beam).

**Negatives:** proj-01 to proj-07. **Stamps:** perfect-projection, sparkle (hidden).
**Official examples:** `R:36-37,170-196`; `EX complex-text.html:16-43`; `EX nested-sparkles.html:32-91`; `EX pie-chart.html:40-79` (a draw loop placing labels); `2D:23-62`. No official example uses a source rect: that row is covered by the README and Chrome docs only.

---

### Chapter 5. The Mirror Maze (boss: Ghost Clicks)

**Draft delta:** 2D only; the 3D matrix build moves to Ch 6; adds *geometry is not paint*, `getElementTransform`, "hit testing skips intervening clips and transforms", and the **Dogfood Lens** (an overlay that shows the hub's own hit regions and geometry). Unseals the Ledger rows for `canvasTransform` and `canvasClip` (CSS px).

**Learning objectives**
1. Name the three things the browser needs an element's geometry for: hit testing, layout queries such as `getBoundingClientRect`, and accessibility bounds (`CC:208-214`): 3 of 3.
2. Predict, for three scenarios, whether a click reaches the element: before any draw (not hit-testable, `R:26`), after a 2D draw (automatic, `R:49`), after a draw with `preserveElementGeometry: true` and no manual update (stale, `2D:71-95`): 3 of 3.
3. Given a hit-test stack of four elements with transforms and clips, name the receiver of a click: at least 8 of 10, including a case where a wrapper's CSS transform is ignored ("straight from the canvas element to each descendant, skipping intervening clips and transforms", `R:43`) and a case where `canvasClip` clips clicks but not pixels (`R:45`).
4. Predict the stack after a sequence of draws and updates with and without `preserveHitTestOrder` (`R:86-90`; `CC:232-247`): 5 of 6.
5. Choose among automatic geometry, `preserveElementGeometry` plus a manual update, `canvasClip`, `clearElementGeometry` and `getElementTransform` for seven scenarios: at least 6 of 7.
6. Write the CSS-px `canvasTransform` for an element drawn at a given grid-px position, using the scale factors from Ch 3 (`2D:82-88`): 2 of 2.
7. State that geometry updates do not trigger paint (`R:44-45`).

**Story beat.** The Mirror Maze shows every print where it is *drawn*, but the real elements stand wherever the maze keeper last told them. Move a mirror and forget to tell the keeper, and visitors click the glass where the print used to be: Ghost Clicks. In 2D the keeper listens to every draw automatically (`R:49`); the apprentice learns when to stop listening, and why the hub's own prints in the world above are kept in step by the same rules.

**Lab: "Hall of Mirrors."** Three or four drawable cards drift through a 2D scene. A translucent overlay shows each element's *hit region* (transform plus clip) against its *painted position*. Toggles: automatic geometry versus `preserveElementGeometry`; a per-card `canvasClip` handle; `preserveHitTestOrder` for a backdrop; `clearElementGeometry`; a readout of `getElementTransform` (identity when none, `R:126-130`); a wrapper `<div>` with its own CSS `transform` to show it is ignored. A click probe logs the receiver and the stack. The model accessibility panel (S10) shows "bounds known/unknown" flipping with geometry. The **Dogfood Lens** overlays the same view on the real hub prints.

**Trial (boss Ghost Clicks): "Whack-a-Ghost."** Mechanic T5. A drifting scene of overlapping cards, one partly clipped and one hidden. Customers arrive and click the button on a ticket. For each of five rounds the learner picks a geometry *policy per card* (automatic; preserve plus manual transform in CSS px; `preserveHitTestOrder` for a backdrop; `canvasClip` for a partial card; `clearElementGeometry` when hidden). The simulation then runs the customers. *Win condition:* at least 18 of 20 customers served, no more than 2 ghost clicks across the five rounds, and the hidden-card round clears its geometry. *Proves understanding:* each policy produces a different hit result in the model, so brute force fails, and the Ledger unit rule is tested again (grid vs CSS px). *Without the API:* S5 (list, transforms, clips) over S4. Fidelity: **model-faithful** for the lists and results; focus, text selection and IME are **illustrative** (synthetic events).

**Visual identity.** Palette: night #2B2D42, mirror steel #8D99AE, ghost red #EF233C, violet #9B5DE5, glass white #F8F9FA. Signature effect: **ghost after-image**: planar reflections plus a translucent duplicate left at the *stale* geometry position that fades when geometry syncs. Motion: sliding mirror panels with parallax, a faint kaleidoscopic shimmer (reduced-motion: static panels with a persistent labelled ghost outline). Color is never the only signal: ghost positions also use a dashed outline.

**Negatives:** mir-01 to mir-12. **Stamps:** no-ghosts, backdrop-keeper, mirror-image (hidden).
**Official examples:** `R:41-51,85-101,162-168`; `EX pie-chart.html:65-71` (automatic geometry from a draw loop); `EX complex-text.html:39-42` (rotated draw); `2D:65-95`; `CC:208-256`; a preview of manual geometry in `EX jelly/src/index.ts:808-814`. No official example exercises `canvasClip`, `preserveHitTestOrder`, `clearElementGeometry` or `getElementTransform`: those rows rest on the README and Chrome docs alone and must be verified in a native build before release.

---

### Chapter 6. The Orbit Observatory

**Draft delta:** now owns the *manual* `canvasTransform` build (moved from Ch 5), the pre-allocation rule, the copy config, upload gating and the first library cards. Wire A (optional for Master).

**Learning objectives**
1. Order the pipeline for a live element in WebGL: create the texture and parameters, allocate with `texImage2D(..., null)` at `getElementImageDefaultSize`, call `texElementSubImage2D` in the paint handler, draw the scene, call `updateElementGeometry` (`EX webGL.html:195-212,235-264`; `GL:27-133`): exact order.
2. Explain why 3D must update geometry itself (`R:49`; `CC:218`) and compute `a, d, e, f` of a `DOMMatrix` for a given screen rect in CSS px (`EX webGL.html:161-169`): at least 3 of 4 (affine only).
3. Find and fix redundant uploads by gating on `changedElements` (`EX webGL.html:351-369`): 3 of 3.
4. Choose texture parameters and pixel-store flags so text is legible and upright: `LINEAR`, clamp, `UNPACK_FLIP_Y_WEBGL` (`EX webGL.html:186-189,327-328`): 4 of 4.
5. Crop or scale an upload with `WebGLCopyElementImageConfig` (`R:201-208`).
6. Name one limit of the demo's approximation: it computes geometry from an unrotated card (`EX webGLSetup.js:189-192`), so the hit region need not follow the turn; whether perspective matrices work is `[OPEN]` (01 section 5 #21).
7. Name two wrapper libraries and what they hide (`IDX:44-55,76-96`).

**Story beat.** In the Orbit Observatory a brass orrery carries a flip card whose faces are *real forms*: radio buttons on the front, a message in four languages on the back (`EX webGL.html:60-84`). The telescope's lens is WebGL: the print becomes a texture. But when the card spins the keeper must tell the browser where the card *really* is, or clicks hit empty sky (a Ghost Clicks cameo). Guilds of other observatories (three.js, Babylon) have written helpers that do the matrix work for you.

**Lab: "Card Bench."** A 3D flip card. Controls: rotation, texture pre-allocation on/off, upload every frame versus on `changedElements`, a GPU upload counter, `LINEAR` versus mipmapped filtering, flip-Y, a config crop/scale, and *update geometry each frame on/off*. Observations: with geometry updates off, clicks hit "where it used to be" (`CC:224`); the active face is switched with `inert` (`EX webGL.html:108-128`), previewing Ch 7; a hit-region quad overlays the card with its `DOMMatrix` numbers in CSS px; a **perspective toggle** (`[I]`, marked "experimental, unverified") shows what happens if a full 4x4 matrix is supplied. The Ledger unseals "texture sizes: texture pixels, by default the element's size in grid pixels, rounded up" (`CC:321`).

**Trial: "Orrery Assembly."** Mechanic T1 plus a flight test. Stage 1: assemble the pipeline from typed chips with parameters. Stage 2: the card orbits; a probe clicks 12 controls on both faces. *Win condition:* valid pipeline, at least 10 of 12 probe clicks land on the intended control, at most one upload per changed element (this earns Frugal Printer), and the face not being shown is inert. The flight test uses the **affine** scale-plus-translate form only. *Proves understanding:* geometry correctness is measured by where clicks land, not by a checklist. *Without the API:* S6 plus S5 (the sim ray-casts the card plane using the learner's matrix and dispatches to the element). Fidelity: **model-faithful** for upload rules and hit mapping; **illustrative** pixels.

**Visual identity.** Palette: night #05071A, deep ultramarine #1B2A6B, star blue #5E8BFF, brass gold #F5D547, moon #E8E8F0. Signature effect: **long-exposure star trails**: an accumulation buffer streaks the stars behind a real HTML card orbiting in depth-of-field. Motion: slow orbital drift, eased flips (reduced-motion: discrete 90-degree snaps, no trails).

**Negatives:** orb-01 to orb-09 (orb-09 is a relic). **Stamps:** frugal-printer, flip-side (hidden), lens-and-light (with Ch 8).
**Official examples:** `EX webGL.html:60-84,141-179,195-232,235-264,339-385`; `EX webGLSetup.js:157-271`; `R:201-216`; `GL:27-133`; `R:287`, `IDX:44-96` (libraries).

---

### Chapter 7. The Lighthouse of Voices (boss: Silence)

**Draft delta:** moved before WebGPU and workers; centred on 2D examples (no GPU needed); draws on the jelly demo's preference handling; plants Caret and focus earlier. Wire B.

**Learning objectives**
1. Predict the accessibility entries for a canvas with drawables, including which have geometry: at least 8 of 10 (`R:26,317`).
2. State the rule "no geometry means reported without geometry", and list the two ways geometry becomes established (automatic with `drawElementImage`, or `updateElementGeometry`; `preserveElementGeometry` prevents the first): 3 of 3 (`R:317`).
3. Choose `aria-hidden`, `inert`, or DOM removal for four "unused view" scenarios (`R:317`): 4 of 4.
4. Assemble a keyboard flow: `tabindex`, visible focus, and a custom-shape focus ring with `drawFocusIfNeeded` (`EX pie-chart.html:24-31,62-63,77-78`): complete a handler.
5. Preserve semantics while drawing parts separately (figure, image, caption, `R:321-340`): label 3 of 3 nodes.
6. Name the preference signals to honor and the behavior for each: reduced motion, reduced transparency, contrast, forced colors, color scheme (`EX jelly/index.html:30-59`; `EX jelly/src/index.ts:885-908`): at least 4 of 5.
7. Explain why the jelly slider re-expresses focus as a color change (`EX jelly/index.html:27-29`; `EX jelly/src/index.ts:936-937`).

**Story beat.** The lighthouse keeper learns that a good beam does two jobs: it names what is out there (semantics) and says where (geometry). Ships are people with screen readers, magnifiers, keyboards and contrast needs. The Smudge's lieutenant, Silence, mutes every bitmap in the harbor. Caret, whose input field now has a voice again, shows that focus rings and carets are drawn along with the print (`R:319`) but that a pie wedge made of canvas art needs a ring you draw yourself.

**Lab: "Keeper's Console."** A pie-chart-like scene and a figure with a caption. A **model** accessibility inspector (S10: name, role, "bounds known/unknown") sits beside a captioned screen-reader transcript, a magnifier that follows focus using the bounds, and a keyboard simulation. Toggles: draw or skip an element (geometry on/off), `aria-hidden`, `inert`, `tabindex`, role attributes, an offscreen stale view, and system preferences (reduced motion, forced colors, contrast). Observations: undrawn elements are present but "unlocated" and the magnifier skips them; a stale view stays announced until hidden; focus rings appear in the print. A note in native mode points to the browser's real accessibility inspector, because the page cannot show the real tree.

**Trial (boss Silence): "Silent Harbor."** Mechanic T6. Four ships approach: a screen-reader user, a magnifier user, a keyboard-only user, and a forced-colors plus reduced-motion user. The lighthouse scene has six interactive elements and eight seeded defects (an unhidden stale view, a missing accessible name, an element never drawn so it has no geometry, an invisible focus ring on a canvas shape, a missing tab stop, a looping animation that ignores reduced motion, a missing forced-colors palette, an unlabelled language block). The learner applies a remedy to each defect; a wrong remedy visibly has a side effect (for example `aria-hidden` on a live control). *Win condition:* all four ships dock, with at most three misapplied remedies. Playable keyboard-only (earns toward Keyboard Pilgrim). *Proves understanding:* ships fail for specific reasons the learner must trace. *Without the API:* S10 and S5 with real DOM semantics. Fidelity: **model-faithful** for the geometry rule, **native-only** for real assistive technology.

**Visual identity.** Palette: dusk sea #0F2D3A, teal #1E6F86, beam gold #F4D35E, warning orange #F95738, foam #EBEBD3. Signature effect: a sweeping **beam with voice ripples**: the beam reveals elements as it passes and radiates waveform rings with captions of what would be announced. Motion: slow sweep at 0.1 Hz, rolling foam (reduced-motion: a static spotlight and a text list). A built-in high-contrast variant switches the scene to the forced-colors palette the demo models.

**Negatives:** lig-01 to lig-09. **Stamps:** all-ships-safe, polyglot, keyboard-pilgrim (progress).
**Official examples:** `R:315-340`; `EX pie-chart.html:24-31,62-63,77-78`; `EX webGL.html:62-83,108-128`; `EX jelly/index.html:27-59,75`; `EX jelly/src/index.ts:833-843,885-941`; `CC:390-422`.

---

### Chapter 8. The GPU Foundry

**Draft delta:** a "delta chapter" on top of Ch 6 (what changes in WebGPU) plus the jelly slider's design lesson; the Smudge's pre-API atlas is the "before" picture. Wire A.

**Learning objectives**
1. Map six WebGL steps to their WebGPU counterparts (explicit `createTexture` with usage flags; `drawElementImageToTexture` for `texElementSubImage2D`; the same geometry rule): 6 of 6 (`GPU:27-127`; `R:218-236`).
2. Write a valid `source` and `destination` dictionary, and identify three invalid ones: a missing `source`, a partial source rect ("all four or none", `GPU:60-72`), and a texture without the usage flags the docs use (`[I]`: the requirement is by analogy, the docs only show the flags): 4 of 4.
3. Explain the **invisible real control** pattern and what each side provides: browser (focus, keyboard, accessibility, events) versus shader (look) (`EX jelly/index.html:17,74-75`; `EX jelly/src/index.ts:773-820`): rubric of four points, at least 3.
4. Feed `getComputedStyle` into shader uniforms and call `requestPaint` after a change (`EX jelly/src/index.ts:927-934`): complete a handler.
5. Identify the demo's honest approximations: one shared hard-coded transform for two elements and a TODO to calculate it from the matrices (`EX jelly/src/index.ts:802-818`).

**Story beat.** In the Foundry a molten jelly slider wobbles over a stone plate. The percentage written on the plate is a live HTML readout poured into the plate as a texture, not one of 101 pre-baked numerals (the Smudge's old atlas, `EX jelly/src/numbers.ts:3-5,23-62`, unused in this fork). The real range input is invisible but alive (`opacity: 0`), and the shaders decide only how it looks. The Foundry master's rule: the shader may change the look, never the meaning.

**Lab: "Casting Floor."** A jelly-lite slider (preset refraction, ripple and heat-haze shaders with uniform sliders; no shader editing). Toggles: texture usage flags (omit one and the validator reports a failure, labelled `[I]`), source rect, destination size versus texture size, **slider `opacity:0` plus geometry on/off** (arrow keys still move the jelly when on), readout `inert` on/off, reduced motion (damping 1.0, `EX jelly/src/index.ts:895-899`), and an "old way" toggle that swaps in a 101-numeral atlas: change language or size and the atlas fails while the HTML readout adapts.

**Trial: "Pour and Test."** Mechanic T1 plus personas. Stage 1: assemble the upload with typed dictionaries. Stage 2: three personas (mouse, keyboard, screen reader) must use the slider and see the effect; the learner decides which elements are drawn, hidden (`opacity:0`), inert and geometry-synced. *Win condition:* a valid dictionary pair, all three personas pass, and the readout renders in Arabic and Korean with no extra code. *Proves understanding:* breaking the pattern (drawing the input, forgetting geometry) makes a persona fail visibly. *Without the API:* S7 (validator plus `copyExternalImageToTexture` where WebGPU exists, else effect-lite). Fidelity: **model-faithful** validation, **illustrative** visuals.

**Visual identity.** Palette: coal #1A0F0A, jelly orange #FF7313 (the demo's `--jelly-color: rgb(255, 115, 19)`, `EX jelly/index.html:19`), ember #FFC145, steel #8D8D92, anvil #3A3A40. Signature effect: **heat-haze and jelly refraction over live HTML** with a spring wobble like the demo's Verlet slider (`EX jelly/src/slider.ts:232-243`). Motion: spring physics and drifting sparks (reduced-motion/transparency: no wobble, flat tint, as the demo does).

**Negatives:** frg-01 to frg-08 (frg-07 relic, frg-08 hidden). **Stamps:** jellyfish (hidden), archaeologist (hidden), lens-and-light.
**Official examples:** `EX jelly/index.html:13-26,73-76`; `EX jelly/src/index.ts:68-73,103-109,773-820,927-934`; `EX jelly/src/numbers.ts:3-62`; `R:218-236`; `GPU:27-127`.

---

### Chapter 9. The Vault (boss: The Leak)

**Draft delta:** after accessibility; adds the same-origin iframe nuance, a questionnaire drill, an *unscored* discussion slot for items the sources disagree on, and hedged media export.

**Learning objectives**
1. State the principle in your own words, naming **both** channels: painting (pixel readback or timing) and invalidation (the `paint` event) (`R:295,297`; `S:15`). Rubric of three points, all required.
2. Classify 17 scored items as withheld or allowed: the sensitive list (`R:300-307`: cross-origin images, cross-origin iframe content, cross-origin CSS `url()`, tainted canvas, SVG references, spelling marks, visited-link information, autofill, subpixel text anti-aliasing, captions and video controls, IME pop-ups) and the not-sensitive list (`R:310-313`: find-in-page, text-fragment markers, scrollbar and form appearance, caret blink rate, forced-colors): at least 15 of 17.
3. Explain the same-origin iframe case (`R:300`): 1 of 1.
4. Match five attacks to the channel they use and the defense the spec relies on: 5 of 5.
5. Answer six questionnaire items without notes (no new persistent state, no sensors, no new script loading, no first/third-party or private-mode difference, fully active documents only; `S:21-24,36-47,59-67,79-81`): at least 5 of 6.
6. Explain why export of drawn pixels is permitted (`R:19,295`) while giving no recipe (mechanism undocumented; 01 section 5 #35).

**Story beat.** The Vault holds other people's negatives. Before any print leaves the darkroom for the canvas, a guard (read-back-allowed rendering) strips what a script must not learn, because once pixels sit in a canvas anyone's script can read them (`R:295`). The Leak is a trickster who tries two doors: the pixels, and the bell (the paint event can reveal that something changed, so invalidation is guarded too, `R:297`; `S:15`).

**Lab: "Customs Desk."** Fixtures: a cross-origin image (simulated), a CSS `url()` background, a tainted canvas, an SVG `<use>`, a visited link, spellcheck marks, an autofill preview, a captioned video, an IME composition, a scrollbar, a find-in-page highlight, a text-fragment marker, a caret and a forced-colors toggle. The learner drags a fixture through the scanner in two modes: ordinary DOM and **drawn (read-back-allowed)**. Withheld regions show a labelled hatch (a placeholder: the real appearance is unspecified, 01 section 5 #26). A *Pixel Probe* and a *Paint-Timing Probe* show what a hostile script could learn if the naive mode were used. A same-origin versus cross-origin iframe pair shows the nuance. Two fixtures (system colors/themes versus forced-colors, 01 section 5 #28) are tagged "sources differ" and unscored.

**Trial (boss The Leak): "Customs Inspector."** Mechanic T6. Twenty packages move on a conveyor (17 scored, 3 discussion), then The Leak mounts five attacks (a visited-link probe, a cross-origin pixel read, an autofill sniff, a paint-timing probe on a cross-origin change, a system-color fingerprint). *Win condition:* at least 15 of 17 sorted correctly, 5 of 5 attacks matched to channel and defense, and at most three "leaks" (a sensitive item passed). Pass 80%; Zero Leaks needs none. *Proves understanding:* items are new combinations, not the list recited back, and attack mapping requires the two-channel model. *Without the API:* S9 (labelled fixtures). Fidelity: **model-faithful** for classification, **illustrative** for how withheld content looks. The questionnaire's missing item 7 (`S:26-31`) is the hidden card.

**Visual identity.** Palette: black-green #0A0F0D, vault steel #1F2A24, bank green-grey #5B7766, scanner teal #5BC0BE, alarm pink #FF3864. Signature effect: a **scanline and hatch redaction**: a frosted-glass scanner sweeps and crosshatches withheld regions. Motion: tumblers clicking, bolts sliding, a sweeping scanner (reduced-motion: stepped scan with captions; the alarm never flashes faster than 1 Hz).

**Negatives:** vlt-01 to vlt-10 (vlt-10 hidden). **Stamps:** zero-leaks, missing-seven (hidden), people-and-platform (with Ch 7, 10).
**Official examples:** `R:293-313`; `S:1-85`; `R:300` (iframes); `EX complex-text.html:25` (the same-origin `wolf.jpg` paints); `EX jelly/index.html:50-59` (forced-colors).

---

### Chapter 10. The Worker Railway

**Draft delta:** after the Vault; stresses that the `(Element or ElementImage)` union appears in every call (`R:172-195,214,225`); the Trial scores only `[S]` behaviour; `close()` semantics stay `[OPEN]`. Wire B.

**Learning objectives**
1. Order the lifecycle of a worker draw: `paint` on main, `captureElementImage`, post with transfer, worker `drawElementImage`, microtask batch, async post to main, apply, `elementgeometryupdate` (`R:51,374-399`): all steps correct.
2. State what a worker may pass to geometry calls (only `ElementImage`, `R:51,142-144`) and why `paint` is a main-thread event (`CanvasPaintEvent` is `Exposed=Window`, `R:238`): 2 of 2.
3. Predict, for three scenarios, when geometry takes effect: when the main-thread updates complete and the event fires (`R:51`), not before: 3 of 3.
4. State what the `elementgeometryupdate` list contains and when an element is omitted (it no longer exists when the event fires, `R:51`): 2 of 2.
5. Size an OffscreenCanvas as the worker example does (`contentRect * devicePixelRatio` and a `requestPaint` after, `R:391-397`) and contrast it with Ch 3's device-pixel box: 2 of 2.
6. Show that the same `ElementImage` can also feed `texElementSubImage2D` (`GL:88-94`) and WebGPU (`GPU:67`), which is why it is the common currency: 1 of 1.

**Story beat.** The main station is the only place that can see the DOM; the Worker Depot has the drawing press and cannot see it. Snapshots travel in sealed glass cases (`ElementImage`) on the transfer rail, and a transferred case is moved, not copied. Telegrams (`elementgeometryupdate`) come back later, in batches, after the depot has drawn.

**Lab: "Two-Rail Yard."** Main-thread and worker lanes on one timeline. A form on main; `paint` fires; the learner captures, transfers and lets the worker draw; a microtask bucket batches geometry updates; a task is posted to main; the event fires with its `elements` list. Toggles: pass an `Element` to the worker (error lane), skip the transfer list, block the main thread (jank: the worker keeps drawing, geometry lags), remove the element before the event fires (omitted from the list), skip `requestPaint` after a resize. The **model** shows the sender's handle unusable after transfer and the effect of `close()`; both are tagged `[I]` and unscored.

**Trial: "Dispatcher."** Mechanic T5. Fifteen snapshot cases arrive on the main platform; the learner routes each (capture, transfer, draw, await geometry). *Win condition:* at least 13 of 15 routed correctly with zero derailments (a derailment is passing an `Element` where only an `ElementImage` may go, or forgetting the repaint after a resize), plus the lifecycle ordering 6 of 6. *Proves understanding:* each error has a different visible failure on the tracks. *Without the API:* S8 (real `Worker` and `OffscreenCanvas`, `ImageBitmap` standing in for the case). Fidelity: **model-faithful** for sequencing, **illustrative** for the handle.

**Visual identity.** Palette: soot #2E2A24, locomotive red #A63D2F, brass signal #E2B659, verdigris #4C7F7B, timetable paper #EDE6D3. Signature effect: parallel tracks with a **particle-dissolve transfer**: a glass case dissolves at the origin and re-forms at the destination, making "moved, not copied" literal. Motion: scheduled trains, semaphore arms, a visible latency gap on the timeline (reduced-motion: a stepped railway diagram).

**Negatives:** rwy-01 to rwy-07. **Stamps:** on-schedule, last-stop (hidden), people-and-platform.
**Official examples:** `R:39,51,141-160,249-265,342-399`; `GL:88-94`, `GPU:67` (ElementImage as a source elsewhere).

---

### Chapter 11. The Clockwork Heart (mini-boss: Echo)

**Draft delta:** adds the rejected worker design and the vocabulary pair "paint event" versus "Paint step"; every scored fact is `[S]` from the README; presented as "the design as of the explainer".

**Learning objectives**
1. Place the paint event in the list of rendering steps for each of Options A, B and C (`R:405-425`): 3 of 3.
2. Fill a matrix of three options by four attributes (firing point; loops or once; needs a synchronous or partial Paint, or placeholders; selected or not; `R:427-443`): at least 11 of 12 cells.
3. Explain why Option C: it runs once, and the contents of the update are locked in before paint runs "except for one intentional carve-out: the drawn content of the canvas" (`R:443`): 1 of 1.
4. Explain the placeholder flaw for WebGL (synchronous calls such as `getError()` force a flush and would deadlock or give inconsistent rendering, `R:433`): 1 of 1.
5. Explain why worker-thread rendering was not chosen for scroll and animation (`R:447`) and what the future auto-updating mode would change (`R:451-453`): 2 of 2.
6. Distinguish the `paint` event from the browser's Paint step (`R:425`): 1 of 1.

**Story beat.** At the heart of the darkroom three clockmakers each built a different escapement. A rings the bell while the lenses are still being adjusted; B waits until the picture is painted, but loops; C waits until the picture is painted and rings once, then locks the frame (`R:427-443`). The apprentice winds each clock and sees why the keeper chose C. The chamber of unbuilt clocks holds a worker-driven mechanism that needed script to run on every scroll (`R:447`).

**Lab: "Escapement."** A one-update timeline with named steps (animation frame callbacks, style and layout, ResizeObserver delivery with its loop, IntersectionObserver, Paint, commit). A draggable `paint` marker snaps to A, B or C. Handler toggles: canvas draw only; a DOM edit inside the handler; a change outside the canvas; a WebGL `getError()` call. Outputs: how many times canvas code ran, when the DOM edit appeared, and whether the model flags a deadlock for the placeholder variant with WebGL (`R:433`).

**Trial (mini-boss Echo): "Calibrate the Escapement."** Mechanic T8. Fill the 12-cell matrix, then a three-case design review under constraints: (a) the page uses WebGL, (b) the engine cannot run a synchronous partial Paint (`R:431`), (c) you want canvas code to run once per update. The learner picks an option and justifies it with the cited reasoning. Echo repeats a handler that dirties the DOM; the learner applies each option to count runs. *Win condition:* at least 11 of 12 cells and 3 of 3 review decisions with valid reasons. On a miss, Echo returns in the Epilogue's Echo audit. *Proves understanding:* decisions use the criteria, not the labels. *Without the API:* none needed; it is a pure model (S3). Fidelity: **model-faithful** to the explainer; real engines may differ and the README is living (01 section 5 #1, #11).

**Visual identity.** Palette: case black #12060B, ruby #9B1D3F, rose gold #E8A598, ivory #F6EDE3, jewel cyan #27E1C1. Signature effect: an exploded **gear-train cutaway** with an escapement whose *stepped* ticks pulse outward as light; each tick is one rendering update and the jewel glows when paint fires. Motion: discrete ticking (not smooth), with a step-through control (reduced-motion: the learner advances ticks manually).

**Negatives:** hrt-01 to hrt-08. **Stamps:** on-the-tick, bookmarks (hidden).
**Official examples:** none (the chapter is spec reasoning). Sources: `R:401-453`; the step numbers cited there are version-bound (`R:407-415`; 01 section 5 #11), so the Lab names steps, not numbers.

---

### Epilogue. The Endless Reel (final boss: The Smudge)

**Draft delta:** adds the Escape Hatch decision Lab, the ecosystem wall, a speculative-concept section that is labelled as such, and the Exhibition (final exam). Requires Wire B and Ch 11; Wire A optional.

**Learning objectives**
1. Explain the auto-updating canvas idea (a replayable command buffer with fresh placeholders, independent of main-thread script) and state that it is a *future consideration*, not available (`R:451-453`): rubric of three points.
2. Choose a strategy for five deployment scenarios from: native path with feature detection, alternative UI, floating HTML overlays, three-html-render, html2canvas, dom-to-image (`CC:424-443`), and name one trade-off for each: at least 4 of 5.
3. Pass the **Exhibition** (below): at least 8 of 10 seeded defects fixed with the right reason, and at least 4 of the 5 audits passed (an audit passes when both of its defects are fixed).
4. Score higher on the isomorphic post-test than on the Prologue pre-test (section 5.2) and read your own gain.

**Story beat.** The Smudge makes a last stand: a smeared, blurry, silent, leaky, echoing print hung in the main hall. The apprentice must hang a clean one. The Endless Reel, a film loop that keeps turning while the main hall is busy, hangs on the far wall in dotted frames: a design still being explored (`R:449-453`), not yet shipped. At the end, Caret's input field is returned: a real `<input>` inside a drawn print, with a live caret (`R:55,319`).

**Lab: "The Reel Room."** Three stations. (1) A speculative demo labelled *concept, not an API*: a scroll scene where the main thread is blocked; the conventional drawn scene stutters, the "auto-updated" scene keeps moving. (2) The **Escape Hatch** chooser for fallback strategies with trade-offs (some of them re-implement rendering in script, so they differ from the real thing). (3) The **ecosystem wall**: three.js `HTMLTexture`, Babylon `HtmlTexture`, PlayCanvas, PixiJS `HTMLSource` and CanvasUI (`IDX:44-125`), each with a "this wrapper may behave differently from the README" caption and the arity note for `getElementTransform` (`IDX:116` versus `R:126-130`).

**Trial: "The Exhibition" (final boss, The Smudge).** Mechanic T7. A deliberately smudged print with **ten seeded defects in five audits**; each audit is one earlier boss returning in mixed form:

| Audit (boss) | Seeded defects | Chapters |
|---|---|---|
| Blur | B1 grid hard-coded to the CSS size or the default 300x150; B2 a destination rect given in CSS px | 3, 4 |
| Ghost Clicks | G1 `preserveElementGeometry: true` with no manual update; G2 a backdrop that steals clicks (hit order) | 5 |
| Silence | S1 a stale view not hidden from assistive tech; S2 no visible focus, or a loop that ignores reduced motion | 7 |
| The Leak | L1 a design that relies on a cross-origin image painting into the canvas; L2 a design that relies on withheld content being readable (autofill or visited state) | 9 |
| Echo | E1 a DOM change inside `paint` expected to show this frame; E2 an unconditional `requestPaint` loop on a static scene | 2, 11 |

Learners who took Wire A get an optional eleventh item (a texture re-uploaded every frame); learners who took Wire B get a twelfth (an `Element` sent to a worker). Each fix needs a one-line reason picked from chips. *Win condition:* at least 8 of 10 defects fixed with valid reasons and at least 4 of 5 audits passed; pass is 80%, distinction 95% with no hints (the Flawless Stamp). Three tasks are **production** (assemble or write code, not select). *Proves understanding:* it is the integrated transfer task. *Without the API:* all earlier modules. Fidelity: the sum of the earlier chapters, with the same Truth Meter segments.

**Visual identity.** Palette: film black #000000, bone #F2F2F2, safelight amber #FFB000, with spectrum accents #E63946, #2A9D8F and #457B9D. Signature effect: an **infinite film loop** made of the learner's own Album prints; the scene starts monochrome and color blooms in as the exam score rises. Motion: a continuous scroll that stays smooth even when the page is busy (a nod to the concept; reduced-motion: stepped frames), and end credits (authors, `R:459-468`).

**Negatives:** reel-01 to reel-06. **Stamps:** master, flawless, credits-roll (hidden).
**Official examples:** `R:449-453,459-468`; `CC:424-443`; `IDX:44-125`; all earlier examples are reused in the Exhibition kit.

---

## 3. Catalogs

### 3.1 Negatives (the Album / contact sheet): 100 cards

**Rarity scale** (rarity = how subtle or hard-won the idea is, not how important it is; Commons are the foundation and are what the spaced-recall system drills most):

| Code | Rarity | Meaning |
|---|---|---|
| C | Common | A definition or attribute you must know to run any demo. |
| U | Uncommon | An API member or pattern used in ordinary, working code. |
| R | Rare | Nuanced semantics, ordering rules, units or pitfalls that cause real bugs. |
| E | Epic | A cross-cutting idea or a boss-won concept; always ties together earlier cards. |
| L | Legendary | Capstones (and the one speculative card, which carries a dotted "not shipped" border). |
| Y | Relic ("Yellowed") | Deprecated or legacy names found in demos and old tutorials. Collectible for recognition; excluded from "Album complete". |

`†` = hidden card (appears in the Album only after its secret is found; see 4.5). Card text is deliberately the exact claim the site is allowed to make; anything marked `[I]` in the chapter specs is NOT on a card until verified natively. IDs use a chapter slug so reordering chapters never renumbers cards. The "Three Grids" card (lens-02) is an **evolving card**: it gains rows (the Unit Ledger) as later chapters unseal them (source rects in Ch 4, canvasTransform/clip in Ch 5, texture sizes in Ch 6/8) and becomes the Epic "Unit Ledger" face when complete.

| ID | Name | Rar | Ch | Card text | Source |
|---|---|---|---|---|---|
| pro-01 | The Blank Canvas | C | P | A canvas holds pixels, not structure: laying out rich content in it and exposing it to assistive tech is hard to do by hand. | R:11 |
| pro-02 | Five Reasons | U | P | Styled content, accessibility, shader effects on HTML, HTML in 3D, media export: why the proposal exists. | R:15-19 |
| pro-03 | The Basic Print | C | P | A drawable canvas, a drawable form, an onpaint handler, one drawElementImage call. | R:57-81 |
| fog-01 | content=fallback | C | 1 | The default. Canvas children are fallback content and are not opted into layout for drawing. | R:26 |
| fog-02 | content=drawable | C | 1 | Opts canvas children into layout: blockified and statically positioned. | R:26 |
| fog-03 | drawable | C | 1 | Marks an element as drawable; implies isolation: isolate and acts as a containing block. | R:29 |
| fog-04 | Drawable Subtree | U | 1 | A drawable element plus its descendants, minus nested drawables and their subtrees. | R:29; CC:45-68 |
| fog-05 | Test Strip | U | 1 | Feature-detect by setting content="drawable" on a scratch canvas and reading it back. | CC:424-433; R:109-112 |
| fog-06 | Yellowed: layoutsubtree | Y | 1 | Legacy attribute that still sits beside content="drawable" in demos. Teach content="drawable". | EX complex-text.html:13-15 |
| bell-01 | Rendering Update | C | 2 | The browser's fixed per-frame sequence. The paint event fires inside it. | R:405-425 |
| bell-02 | paint event | C | 2 | Fires on the canvas when a drawable's snapshot would look different. It may over-fire, so handlers must be idempotent. | R:32 |
| bell-03 | changedElements | U | 2 | The drawables whose snapshots changed since the last paint. | R:238-247; CC:93-101 |
| bell-04 | requestPaint() | U | 2 | Schedules one paint event at the next opportunity even if nothing changed. Loop it only while animating. | R:34; CC:189-206 |
| bell-05 | Next-Frame Rule | R | 2 | Canvas draws in the handler show now; DOM changes made there show in the next rendering update. | R:32; CC:110-123 |
| bell-06 | Reverse Tree Order | R | 2 | Descendants fire paint before ancestors. | R:32 |
| bell-07 | Nested Canvas Cascade | R | 2 | A canvas inside another canvas's drawable paints first; the outer canvas then draws the fresh result. | CC:125-187 |
| bell-08 | Two Paints | R | 2 | The paint event is the canvas's new event; Paint is the browser's existing step. Not the same thing. | R:425 |
| lens-01 | Canvas Grid | C | 3 | The bitmap's own pixel grid (width x height), separate from CSS and device pixels. | CC:260-270 |
| lens-02 | Three Grids (evolving) | R | 3 | CSS px, device px, canvas-grid px: every parameter uses exactly one. | CC:313-324 |
| lens-03 | Device-Pixel Box | U | 3 | ResizeObserver with box "device-pixel-content-box" reports the exact device pixels to size the grid. | R:75-79; CC:286-304 |
| lens-04 | Double Anti-Aliasing | R | 3 | A grid that does not match device pixels gets resampled, so edges are smoothed twice: blur. | CC:262-284 |
| lens-05 | getElementImageDefaultSize | U | 3 | An element's natural size in canvas-grid pixels. The docs Math.ceil it for texture sizes. | R:136-138; CC:319; GL:60-72 |
| lens-06 | Resize Clears the Bitmap | U | 3 | Assigning canvas.width/height resets the bitmap, so a resize needs a repaint (standard canvas behavior; see Ch 3 note). | [X]; R:391-397 |
| lens-07 | Blur, Defeated | E | 3 | Boss card. Match the grid to the glass and edges stay crisp at any DPR. | CC:258-284 |
| proj-01 | drawElementImage | C | 4 | Draws a drawable's last snapshot into a 2D canvas. Four overloads plus an options bag. | R:37,170-196 |
| proj-02 | Border-Box Rule | U | 4 | Drawing starts at the border box, before CSS transforms. Use box-sizing: border-box so width means what you wrote. | R:37; CC:379-388 |
| proj-03 | Destination Rect | U | 4 | dx, dy [, dwidth, dheight] in canvas-grid pixels place and scale the print. | R:176-180; CC:318 |
| proj-04 | Source Rect and Outsets | R | 4 | sx, sy, swidth, sheight (CSS px) crop the print or reach past the border box to include ink overflow. | R:37,182-195; CC:320 |
| proj-05 | Throws! | U | 4 | Not drawable, no snapshot yet, or other canvas ancestors: drawElementImage throws. | R:37 |
| proj-06 | Nested Slide | R | 4 | A nested drawable is its own print: draw it separately, where and when you want. | EX nested-sparkles.html:32-39,47,61 |
| proj-07 | Snapshot, Not Live | R | 4 | You draw the last recorded snapshot. The DOM stays live, so pixels and DOM can disagree. | R:32,37 |
| mir-01 | Geometry | C | 5 | Where a drawn element is: for clicks, getBoundingClientRect and assistive technology. | CC:208-221 |
| mir-02 | Hit Testing | U | 5 | Drawable children start out not hit-testable. The canvas keeps an ordered list and tests each directly, skipping intervening clips and transforms. | R:26,43 |
| mir-03 | Auto Geometry | U | 5 | In 2D, drawElementImage updates geometry for you. | R:49 |
| mir-04 | preserveElementGeometry | R | 5 | Opt out of auto-updates. You now own the geometry, and can desync it. | R:162-168; 2D:71-95 |
| mir-05 | updateElementGeometry | R | 5 | Set canvasTransform, canvasClip and hit-test order by hand. | R:85-101,120-122 |
| mir-06 | canvasTransform | R | 5 | A DOMMatrix in CSS px mapping the border box (before CSS transforms) to where it is drawn. | R:44,97-100; CC:322 |
| mir-07 | canvasClip | U | 5 | Hit-test clip for partly drawn elements. It does not clip pixels. | R:45,92-95 |
| mir-08 | Hit-Test Stack | U | 5 | Most recently updated is topmost, unless preserveHitTestOrder leaves an element already in the stack where it is. | R:86-90; CC:232-247 |
| mir-09 | clearElementGeometry | U | 5 | Un-draw an element without removing it; resets its transform and marks it offscreen for assistive tech. | R:47; CC:249-256 |
| mir-10 | getElementTransform | U | 5 | Reads the element's current canvas transform (identity if none). The README declares one argument; a PixiJS snippet shows two. | R:126-130; IDX:116 |
| mir-11 | Geometry Is Not Paint | R | 5 | Geometry is not used for rendering: changing it fires no paint, and repainting does not move a 3D hit area. | R:44-45 |
| mir-12 | Ghost Clicks, Banished | E | 5 | Boss card. Clicks land where the print is drawn, because you told the browser where that is. | CC:224 |
| orb-01 | texElementSubImage2D | U | 6 | Copies an element snapshot into a WebGL texture. | R:210-216; GL:78-98 |
| orb-02 | Pre-allocated Texture | R | 6 | texImage2D with null at the default size first, then upload with the sub-image call. | EX webGL.html:195-212; GL:31-76 |
| orb-03 | Copy Config | R | 6 | WebGLCopyElementImageConfig (sx, sy, swidth, sheight, width, height) crops and sizes the upload. | R:201-208 |
| orb-04 | 3D Needs Your Matrix | R | 6 | The browser cannot know where a texture lands in your scene. Call updateElementGeometry whenever it moves. | R:49; EX webGL.html:141-179; CC:218 |
| orb-05 | Linear Beats Mip | U | 6 | The official demo uses LINEAR filtering, noting it looked better than mipmaps for text. | EX webGL.html:186 |
| orb-06 | Flip-Y | C | 6 | WebGL wants rows bottom to top. The demo sets UNPACK_FLIP_Y_WEBGL. | EX webGL.html:327-328 |
| orb-07 | Upload Only What Changed | R | 6 | Check changedElements before re-uploading a texture. | EX webGL.html:351-369 |
| orb-08 | Guild Hall I | U | 6 | three.js HTMLTexture and Babylon.js HtmlTexture wrap the upload and matrix work (experimental). | R:287; IDX:44-55,76-96 |
| orb-09 | Yellowed: texElementImage2D | Y | 6 | Older upload name still in demo fallback branches. Use texElementSubImage2D. | EX webGL.html:213-230 |
| lig-01 | Same-as-DOM Tree | C | 7 | Drawable content is in the accessibility tree like regular DOM unless you hide it. | R:317; CC:390-398 |
| lig-02 | Geometry-less Reporting | R | 7 | A drawable with no geometry yet is reported to assistive tech without geometry, so tools can filter it. | R:317; CC:394-406 |
| lig-03 | aria-hidden, inert, or Remove | U | 7 | Unused views do not go away on their own. Hide them from the accessibility tree. | R:317 |
| lig-04 | Focus and Caret | U | 7 | Focus indicators and carets are rendered by drawElementImage. | R:319 |
| lig-05 | drawFocusIfNeeded | U | 7 | For canvas-art shapes (a pie wedge) you draw the focus ring yourself. | EX pie-chart.html:62-63,77-78 |
| lig-06 | Semantic Siblings | R | 7 | Figure, image and caption keep their semantics while drawn separately. | R:321-340 |
| lig-07 | Inert Swap | U | 7 | On a flip card only the visible face should be interactive: toggle inert as it turns. | EX webGL.html:108-128 |
| lig-08 | Preference Manners | R | 7 | Honor reduced motion/transparency, contrast, forced colors and color scheme. | EX jelly/index.html:30-59; jelly/src/index.ts:885-941 |
| lig-09 | Silence, Broken | E | 7 | Boss card. Semantics and location, both provided: the beam and the voice. | R:317 |
| frg-01 | drawElementImageToTexture | U | 8 | WebGPU: a GPUQueue method that copies a snapshot into a GPUTexture. | R:232-236; GPU:59-107 |
| frg-02 | Source Dictionary | R | 8 | source plus an optional rect (sourceX/Y/Width/Height, all four or none) in CSS px. | R:224-230; GPU:60-72 |
| frg-03 | Destination Dictionary | R | 8 | texture, size, origin, mipLevel, aspect, colorSpace, premultipliedAlpha. | R:220-222; GPU:73-83 |
| frg-04 | Texture Usage Flags | U | 8 | The docs and demo create the target with TEXTURE_BINDING, COPY_DST and RENDER_ATTACHMENT. | GPU:50-55; EX jelly/src/index.ts:68-72 |
| frg-05 | Invisible Real Control | E | 8 | An opacity:0 range input stays live with synced geometry. Shaders change the look, never the meaning. | EX jelly/index.html:17,74; jelly/src/index.ts:811-814 |
| frg-06 | Style to Uniform | R | 8 | getComputedStyle feeds shader colors; requestPaint after a change. | EX jelly/src/index.ts:927-934 |
| frg-07 | Yellowed: copyElementImageToTexture | Y | 8 | Older WebGPU name in the demo's fallback branches. Use drawElementImageToTexture. | EX jelly/src/index.ts:783-799 |
| frg-08 | Atlas of 101 † | U | 8 | The pre-API way: bake 101 numeral bitmaps and sample them. Present but unused in this fork. | EX jelly/src/numbers.ts:3-5,23-62 |
| vlt-01 | Read-Back-Allowed Rendering | E | 9 | Painting and invalidation must not reveal anything author code could not already observe. | R:295 |
| vlt-02 | Two Channels | R | 9 | Pixels (readback, timing) and invalidation (the paint event) can each leak. | R:297; S:15 |
| vlt-03 | Sensitive List | R | 9 | Cross-origin data, system colors/themes/prefs, spellcheck marks, visited links, autofill, subpixel AA, captions, IME. | R:299-307 |
| vlt-04 | Not-Sensitive List | R | 9 | Find-in-page and text-fragment markers, scrollbar and form looks, caret blink rate, forced-colors. | R:309-313 |
| vlt-05 | Same-Origin Iframe Nuance | R | 9 | Same-origin iframes still paint; cross-origin content inside them does not. | R:300 |
| vlt-06 | Nothing Persists, Nothing Differs | U | 9 | No new persistent state, sensors or script loading; same in first-party, third-party and private modes. | S:21-24,36-47,59-67 |
| vlt-07 | Fully Active Only | U | 9 | The feature works only in fully active documents. | S:79-81 |
| vlt-08 | Export Pass | U | 9 | Because drawn pixels are read-back-safe, they may leave the canvas: the basis of media export (mechanism not documented). | R:19,295 |
| vlt-09 | The Leak, Sealed | E | 9 | Boss card. Nothing sensitive crosses the line, by pixels or by bell. | R:297 |
| vlt-10 | Missing Seven † | C | 9 | The questionnaire numbers jump from 6 to 8. Do not invent an item 7. | S:26-31 |
| rwy-01 | captureElementImage | R | 10 | Grabs the latest snapshot of a drawable as an ElementImage. | R:39,117 |
| rwy-02 | ElementImage | R | 10 | A transferable snapshot handle exposed to Window and Worker. A worker can pass only these to geometry calls. | R:51,142-144,249-252 |
| rwy-03 | Transfer, Don't Copy | U | 10 | The README example lists the ElementImage in postMessage's transfer list. | R:379-382 |
| rwy-04 | close() | U | 10 | ElementImage's only declared method. What it releases is not spelled out in the sources. | R:250-252 |
| rwy-05 | Worker Painter | R | 10 | An OffscreenCanvas 2D context can drawElementImage an ElementImage inside a worker. | R:356-372 |
| rwy-06 | elementgeometryupdate | R | 10 | Fires on the HTMLCanvasElement when worker-originated geometry has been applied; vanished elements are omitted. | R:51,132-134,254-265,385-388 |
| rwy-07 | Microtask Batching | R | 10 | Updates are batched by microtask, posted to main asynchronously, then applied atomically. | R:51 |
| hrt-01 | Option A | U | 11 | paint at ResizeObserver timing, looping if needed; needs a synchronous Paint (hard for Gecko) or placeholders (flawed for WebGL). | R:427-433 |
| hrt-02 | Option B | U | 11 | paint right after Paint, looping if needed; avoids partial Paint but re-runs more steps each loop. | R:435-439 |
| hrt-03 | Option C (Selected) | E | 11 | paint once, right after Paint. DOM invalidations made in the handler apply to the next update. | R:441-443 |
| hrt-04 | Locked-In Frame | R | 11 | Before paint runs the update's contents are locked in, except the canvas's drawn content. | R:443 |
| hrt-05 | Placeholder Flaw | R | 11 | Buffering placeholders breaks WebGL: calls that force a flush (getError) would deadlock or give inconsistent output. | R:433 |
| hrt-06 | Looping Cost | U | 11 | Arbitrary script can keep dirtying the DOM, so looping designs may run canvas code many times per update. | R:429,437-439 |
| hrt-07 | Road Not Taken | R | 11 | Worker-thread snapshots need script called synchronously on scroll and animation, which is hard in restricted-process designs. | R:447 |
| hrt-08 | Echo, Silenced | E | 11 | Boss card. One paint per update, and you know exactly where it lands. | R:441-443 |
| reel-01 | Auto-Updating Canvas | L | E | Future consideration, not shipped: a replayable command buffer with fresh placeholders, independent of the main thread. | R:451-453 |
| reel-02 | Escape Hatch | U | E | No API? Alternative UI, HTML overlays, three-html-render, html2canvas, dom-to-image. | CC:424-443 |
| reel-03 | Guild Hall II | U | E | PlayCanvas, PixiJS (HTMLSource) and CanvasUI wrap the API. The PixiJS snippet uses a two-argument getElementTransform. | IDX:57-74,98-125 |
| reel-04 | Living Explainer | R | E | The README is continuously updated and sources can disagree. Check, then verify in a real browser. | R:5-7; 01 section 5 #1 |
| reel-05 | Master Print | L | E | Your exhibition print, passed through five audits. | (earned) |
| reel-06 | Smudge, Cleared | L | E | Final boss card. | (earned) |

### 3.2 Stamps (achievements)

Types: **S** skill (performance threshold), **Y** style (how you played or breadth), **H** hidden (discovered, see 4.5), **C** capstone. Every Stamp must be earnable without time pressure, without a mouse, and without audio; where a Stamp is inherently visual-spatial (a hidden hunt), it has a text-riddle alternative in the Album.

| ID | Name | Type | Ch | Criterion |
|---|---|---|---|---|
| first-light | First Light | S | P | Develop the first print (Prologue Trial). |
| lamplighter | Lamplighter | S | 1 | Fog Trial with zero mistakes. |
| quiet-tower | Quiet Tower | S | 2 | Bell Trial: no unnecessary requestPaint loop on any static scene. (Replaces the draft's "zero wasted paints": paint events are fired by the browser; what an author can waste is loops and redraws.) |
| bell-ringer | Bell Ringer | S | 2 | At least 85% predictions correct over 20 frames. |
| pixel-perfect | Pixel Perfect | S | 3 | Blur boss with sharpness 1.0 in all five waves. |
| fractional-focus | Fractional Focus | S | 3 | Clear the DPR 1.5 and 1.25 waves with zero blurred frames. |
| perfect-projection | Perfect Projection | S | 4 | All six projector levels at IoU 0.99 or better. |
| no-ghosts | No Ghosts | S | 5 | Ghost Clicks boss with zero ghost clicks. |
| backdrop-keeper | Backdrop Keeper | S | 5 | Use preserveHitTestOrder correctly in every backdrop round. |
| frugal-printer | Frugal Printer | S | 6 | Orbit Trial with at most one upload per changed element. (Replaces "zero wasted paints" for uploads.) |
| all-ships-safe | All Ships Safe | S | 7 | Silence boss: all four assistive ships dock, no misapplied remedy. |
| zero-leaks | Zero Leaks | S | 9 | Vault Trial with zero leaks. |
| on-schedule | On Schedule | S | 10 | Dispatcher Trial with zero derailments. |
| on-the-tick | On the Tick | S | 11 | Calibration matrix perfect (12/12). |
| keyboard-pilgrim | Keyboard Pilgrim (tiered) | Y | all | Complete a Trial with keyboard only: bronze 1 chapter, silver 5, gold all. (The draft's "keyboard-only run", made cumulative.) |
| hand-developed | Hand-Developed | Y | all | Finish the whole journey without using a hint. |
| both-sides | Both Sides of the Glass | Y | all | Clear one Lab in both Native and Simulated mode (needs a supporting browser). |
| album-complete | Contact Sheet Complete | Y | all | Every non-hidden, non-relic Negative collected. |
| full-spectrum | Full Spectrum | Y | all | Own at least one card of every rarity, relics included. |
| spaced-recall | Sharp Eyes | Y | all | Correctly recall 25 due Album cards in "Rinse" warm-ups (spread over at least 5 days). |
| polyglot | Polyglot | Y | 7 | Tag every language block with the right lang in the Lighthouse Lab (EX webGL.html:69-80 sets them). |
| lens-and-light | Lens and Light | Y | 6, 8 | Finish the GPU wire (Orbit + Foundry). |
| people-and-platform | People and Platform | Y | 7, 9, 10 | Finish the accessibility, privacy and worker wire. |
| blink | Blink | H | P | Watch Caret blink ten times without touching anything (caret blink rate is a known, non-sensitive signal, R:312). |
| typo-hunter | Typo Hunter | H | 1 | Notice that content="drawble" is treated as fallback (invalid value maps to fallback, R:109-112). |
| heartbeat | Heartbeat | H | 2 | `[I]` Let a focused input's caret ring the bell by itself three times. Ships only if verified natively (01 section 5, R:312, R:319). |
| zoom-zoom | Zoom Zoom | H | 3 | Change real browser zoom and watch the grid re-size. |
| sparkle | Sparkle | H | 4 | Find the one word in the Projector Lab poem that is its own nested drawable (the "you" in EX nested-sparkles.html:37). |
| mirror-image | Mirror Image | H | 5 | Click the reflection of a card in the Mirror Maze and read what it says about geometry. |
| flip-side | Flip Side | H | 6 | Flip the card to all four languages (EX webGL.html:62-83). |
| jellyfish | Jellyfish | H | 8 | Drag the jelly from 100 to 0 and back in under two seconds. |
| archaeologist | Archaeologist | H | 8 | Open the digit atlas relic (the pre-API baseline, EX jelly/src/numbers.ts). |
| missing-seven | The Missing Seven | H | 9 | Spot that the questionnaire skips item 7 (S:26-31). |
| last-stop | Last Stop | H | 10 | Remove an element before the geometry event fires and see it omitted from the list (R:51). |
| bookmarks | Bookmarks, Not Law | H | 11 | Notice that the README's update-the-rendering step numbers (14, 16.2.1, 16.2.6, 19; R:407-415) are tied to a spec version that can change (01 section 5 #11). |
| credits-roll | Credits Roll | H | E | Read the end credits (authors, R:459-468) to the last line. |
| master | Master of the Darkroom | C | E | Reach the top rank (see 4.2). |
| flawless | Flawless Exhibition | C | E | Exhibition passed at 95% or better with no hints. |

## 4. Progression and economy

### 4.1 Silver: sources and values

Silver (silver-halide grains) measures *engagement with evidence*, never replaces mastery: **no chapter unlocks because of silver**, and all silver except Rinse is one-time per item (no farming).

| Source | Silver | Rule |
|---|---|---|
| Lab discovery ping | 5 | First time a learner triggers a labelled observation; max 8 per Lab (40). |
| Lab correct prediction | 4 | Predict-before-toggle prompts; max 5 per Lab (20). Lab total cap: **60**. |
| Trial pass | 100 | Prologue Trial is a flat 100. |
| Accuracy bonus | 0 to 60 | Linear from the pass threshold to 100% accuracy. |
| First-try bonus | 20 | Pass on the first attempt. |
| No-hint bonus | 20 | No hint used in the Trial. |
| Boss clear | +100 | Blur, Ghost Clicks, Silence, The Leak, Echo. The Exhibition adds +300 for The Smudge. |
| Negative (first collection) | C 10, U 20, R 40, E 80, L 150, Relic 15 | Hidden cards pay double. Fogged cards that are re-fixed pay nothing. |
| Stamp | Skill 25, Style 50, Hidden 40, Capstone 100 | Once each. |
| Rinse recall (correct, due card) | 5 | Capped at 40 per calendar day. The only repeatable source, and tiny on purpose. |

Replays award only the *improvement* in the accuracy bonus. Untimed and turn-based modes pay exactly the same as timed modes.

### 4.2 Silver by chapter, and rank thresholds

Computed from the catalogs in section 3 (Negatives by rarity, Stamps by type). Global Stamps (Style and Capstone: 600) are not chapter-bound.

| Ch | Lab cap | Trial max | Negatives | Chapter Stamps | Chapter total | Cumulative (full run) |
|---|---|---|---|---|---|---|
| P | 60 | 100 | 40 | 65 | 265 | 265 |
| 1 | 60 | 200 | 85 | 65 | 410 | 675 |
| 2 | 60 | 200 | 220 | 90 | 570 | 1,245 |
| 3 | 60 | 300 | 230 | 90 | 680 | 1,925 |
| 4 | 60 | 200 | 190 | 65 | 515 | 2,440 |
| 5 | 60 | 300 | 370 | 90 | 820 | 3,260 |
| 6 (Wire A) | 60 | 200 | 245 | 65 | 570 | 3,830 |
| 7 (Wire B) | 60 | 300 | 290 | 75 | 725 | 4,555 |
| 8 (Wire A) | 60 | 200 | 295 | 80 | 635 | 5,190 |
| 9 (Wire B) | 60 | 300 | 400 | 65 | 825 | 6,015 |
| 10 (Wire B) | 60 | 200 | 240 | 65 | 565 | 6,580 |
| 11 | 60 | 300 | 340 | 65 | 765 | 7,345 |
| E | 60 | 500 | 530 | 40 | 1,130 | 8,475 |

Maximum chapter-bound silver is 8,475; with global Stamps 9,075; Rinse adds a little on top. The core path (skipping Wire A, chapters 6 and 8) has a maximum of 7,270 plus 550 of global Stamps, about 7,820.

| Rank | Meaning (a learning marker, not a certification) | Silver | **and** milestone |
|---|---|---|---|
| Apprentice | Can read and run a print. | 0 | none |
| Printer | Can make a *crisp, correct* 2D print. | 1,000 (about 52% of what exists by end of Ch 3) | Blur cleared |
| Developer | Can make a print that is *interactive and inclusive*. | 2,800 (about 70% of the core path to Ch 7: 3,985) | Ghost Clicks and Silence cleared |
| Master of the Darkroom | Can *defend* a print: privacy, timing, transfer, integration. | 5,500 (about 70% of the core-path maximum) | Wire B complete, Ch 11 done, Exhibition passed at 80% or better |

Silver is a floor, the milestone is the gate; a high-silver learner who has not cleared a boss does not advance in rank. The GPU wire adds 1,205 chapter-bound silver (plus 50 for its Style Stamp), so Wire-A learners clear the Master threshold with a smaller share of everything else, which is the intended reward for going deeper.

### 4.3 Unlock rules

| Rule | Detail |
|---|---|
| Chapter unlock | Pass the prerequisite Trial per the graph in 1.4: 70% standard, 80% for boss Trials. Wire A and Wire B hang on separate wires after Ch 5. |
| Retention (soft) | Each chapter opens with a 90-second Rinse (2 older questions). It never blocks; misses fog cards and schedule extra recall. |
| Develop effect | An unlock plays the hub's latent-develop shader (a blank print develops). The unlocked print is real HTML drawn through the API in native mode, DOM with CSS 3D in simulated mode. |
| Challenge skip | A learner who scores at least 90% on a chapter's pre-test item may take that chapter's Trial directly ("Challenge"), skipping Story and Lab. They keep Trial silver and the Negatives from passing; Lab pings and predictions are forgone. |
| Exhibition gate | Needs Ch 11 and Wire B; Wire A recommended (the Exhibition has an extra item for it). |
| No hard lock on content | Completed chapters stay open for Labs forever; Open Studio exposes every Lab sandbox. |

### 4.4 Replay value

- **Re-develop**: every Trial is seeded; each replay is a different variant (new scenarios, same structure), improving the accuracy bonus only.
- **Daily Contact Sheet**: a 3-minute mixed set from due Album cards. No streaks and no loss for skipping a day.
- **Open Studio**: all Lab sandboxes unlocked after the Prologue is cleared, with a "Reality Check" button in native mode.
- **Hard mode** (cosmetic): predict-first, no hints; changes the Album card border, awards no extra silver.
- **Keyboard Pilgrim** and **Both Sides of the Glass** (Native vs Simulated) as breadth goals.
- **Source Archaeology**: the hidden items below reward reading the sources, not just clicking.
- Future stretch (not in scope): *Inspector mode*, where a learner pastes their own print and runs the Exhibition's five audits.

### 4.5 Hidden secrets (13 hidden Stamps; two also add hidden Negatives)

Rule for all secrets: **a non-visual, keyboard route exists**, there is no time limit, and a text riddle in the Album's "Whispers" tab (spoilers collapsed) points to it.

| Secret | Where | Trigger | Non-visual route |
|---|---|---|---|
| Blink | P | Leave Caret idle for ten blinks (caret blink rate is a known, non-sensitive signal, `R:312`) | Riddle says "wait ten ticks"; a "Wait" command (key `W`) counts ticks aloud politely. |
| Typo Hunter | 1 | Type `content="drawble"` and see it resolve to fallback (`R:109-112`) | Same typing field; the console prints the resolved value. |
| Heartbeat `[I]` | 2 | Let a focused input's caret ring the bell by itself three times | Ships only after native verification (6.4 item 2). |
| Zoom Zoom | 3 | Change real browser zoom while the Focus Bench is open | The Bench announces the new grid size. |
| Sparkle | 4 | Find the one nested drawable word in the poem (`EX nested-sparkles.html:37`) | Subtree highlighter lists nested nodes; riddle says "one word is a print of its own". |
| Mirror Image | 5 | Click a card's reflection | Reflection is a focusable element with a label. |
| Flip Side | 6 | Flip to all four languages (`EX webGL.html:62-83`) | Radio buttons are real controls; the progress is announced. |
| Jellyfish | 8 | Drag the jelly 100 to 0 and back in under two seconds | Keyboard: hold Home/End and the step keys; the threshold is in "steps" not seconds for keyboard users. |
| Archaeologist (+ card Atlas of 101) | 8 | Open the digit-atlas relic | A "Show the old way" button in the Casting Floor. |
| The Missing Seven (+ card) | 9 | Notice questionnaire item 7 is absent (`S:26-31`) | The questionnaire drill lists items 1-19 in order; the riddle says "count". |
| Last Stop | 10 | Remove an element before the geometry event fires (`R:51`) | A button in the Yard; the event log announces the omission. |
| Bookmarks, Not Law | 11 | Notice step numbers are version-bound (`R:407-415`) | The Escapement shows names; a hint chip says "numbers move". |
| Credits Roll | E | Read the credits to the end (`R:459-468`) | Credits are a plain list with a "skip to end" that still counts when the list is read. |

Hidden secrets must never carry unverified facts: Heartbeat waits for native verification.

---

## 5. Assessment design: how we know learning happened

### 5.1 Evidence model

Every objective in section 2 is tagged with a cognitive level and a source: **Recognize** (identify), **Apply** (predict, assemble, fix), **Transfer** (new scenario, production). Every item in the bank has `{id, concept, level, src[], misconception?, variant-seed}`. The `src` field cites the exact line (as above); a CI check verifies the cited line still exists and the quoted claim text still matches, so a README edit that changes a fact fails the build instead of silently teaching the old fact. Items tagged `[I]`, `[OPEN]` or "sources differ" are excluded from scoring.

### 5.2 Pre-test and post-test (the learning-gain measure)

- **Pre-test** (Prologue, hidden, 6-8 minutes): 12 items, one per chapter (P to 11), each with a confidence rating (sure / think so / guess). Used to (a) show recommended Challenge skips and (b) set the baseline. Completion is required; score is never shown during the journey.
- **Post-test** (Exhibition, after the final boss): 12 *isomorphic* items (same structure, new surface: different elements, numbers and wording).
- **Gain** is shown to the learner as normalized gain g = (post − pre) / (100 − pre), plus a heat map of concepts. Data stays local (browser storage guarded as in `SRC: src/core/storage.ts`); any export is opt-in.
- **Calibration**: confident-and-wrong items are collected into a "Fog list" with targeted explanations; these are the learner's likely misconceptions (5.5).

### 5.3 Spaced recall ("Rinse")

| Element | Design |
|---|---|
| Items per card | Two retrieval prompts: one Recognize or Apply (cloze, predict-the-output, spot-the-bug) and one production-flavoured (assemble or write one line). All cite `src`. |
| Schedule | Four Leitner boxes. Intervals: next session, 3 days, 7 days, 21 days (minimum; the first session after the interval). A correct recall moves a card up, a miss drops it to box 1. |
| Fogging | A card that was recalled wrongly shows fog in the Album until re-fixed in a Rinse. No silver is lost. |
| Selection | A simple per-concept mastery estimate (knowledge-tracing style) picks the due card with the lowest estimate; Commons are drilled most. Cards with `[I]` or `[OPEN]` content are never selected. |
| Surfaces | 2 questions at every chapter entry; the Daily Contact Sheet; the Epilogue's Reel Room. |
| No streak pressure | Missing days never costs anything. The Style Stamp Sharp Eyes rewards 25 correct recalls spread over at least 5 days. |

### 5.4 Interleaving: boss mixing matrix

Each boss deliberately pulls earlier concepts into a fresh context, so learners cannot pass by recalling only the latest chapter.

| Boss | Chapter | Concepts pulled from earlier chapters |
|---|---|---|
| Blur | 3 | P (the Basic Example's grid), 1 (the `content`/`drawable` setup), 2 (a resize clears the bitmap, so redraw in `paint`) |
| Ghost Clicks | 5 | 3 (grid vs CSS px in `canvasTransform`), 4 (draw placement), 2 (paint cadence) |
| Silence | 7 | 5 (geometry decides bounds), 1 (tree membership), 4 (focus ring drawing) |
| The Leak | 9 | 2 (invalidation is a channel), 4 (snapshot, not live), 7 (preferences and forced colors) |
| Echo | 11 | 2 (frame lifecycle), 3 (ResizeObserver timing), 10 (worker batching), 6 (WebGL `getError`) |
| The Smudge | E | All five bosses |

### 5.5 Misconception targets (what distractors are built from)

Each is grounded in note 01 section 4 and appears as a named distractor with feedback citing the source.

| # | Misconception | Truth (source) | Trapped in |
|---|---|---|---|
| M1 | CSS `width` also sets the canvas resolution | The grid is separate; unsized default 300x150 blurs (`CC:260-284`) | Ch 3 |
| M2 | `dx` and `sx` use the same units | Grid px vs CSS px (`CC:318-320`) | Ch 3, 4 |
| M3 | `paint` is `requestAnimationFrame` | Fires late in the update, only on change or request (`R:32,405-425`) | Ch 2 |
| M4 | `requestPaint()` inside the handler is harmless | An unconditional loop (`R:34`) | Ch 2 |
| M5 | A DOM edit inside `paint` shows this frame | It shows next update (`R:32`) | Ch 2, 11 |
| M6 | `content="drawable"` alone draws | Each drawn element needs `drawable` (`R:29,37`) | Ch 1, P |
| M7 | `drawElementImage` draws the live DOM | It draws the last snapshot (`R:32,37`) | Ch 4 |
| M8 | A nested drawable is inside its parent's picture | The subtree excludes it (`R:29`) | Ch 4 |
| M9 | A drawn element is clickable | Not hit-testable until geometry is set (`R:26,49`) | Ch 5 |
| M10 | 3D geometry is automatic | 3D must call `updateElementGeometry` (`R:49`) | Ch 6 |
| M11 | No geometry means hidden from assistive tech | Reported without geometry (`R:317`) | Ch 7 |
| M12 | The jelly slider draws the slider | The real input is invisible; only the readout is drawn (`EX jelly/index.html:17`) | Ch 8 |
| M13 | The `paint` event cannot leak anything | Invalidation is a channel (`R:297`; `S:15`) | Ch 9 |
| M14 | It is just html2canvas built in | Live, geometry-synced, with a strict privacy model (`R:295`; `CC:424-443`) | Ch 9, E |
| M15 | Old names (`layoutsubtree`, `texElementImage2D`, `copyElementImageToTexture`) are current | Legacy fallbacks in demos (`EX complex-text.html:13-15`; `EX webGL.html:213-230`; `EX jelly/src/index.ts:783-799`) | relic cards |

### 5.6 The final exam: the Exhibition

Defined in the Epilogue: ten seeded defects in five audits (plus optional wire items), three production tasks, one-line reasons from chips, pass 80% and at least 4 of 5 audits, distinction 95% with no hints. Retakes use a different seed within the same defect categories, unlimited, with no silver penalty. After it, the post-test and the gain read-out.

A **teach-back** closes the exam: Caret asks for a hand-off note; the learner composes one by choosing and ordering four of eight statements (the rubric requires the two accuracy-critical ones, "geometry must be kept in sync" and "withheld content is not readable", and rejects the misconceptions in 5.5).

### 5.7 Evidence quality

- Pilot with 5-10 front-end developers before release. Target item difficulty between 0.5 and 0.85, discrimination at least 0.3; retire items outside that range.
- An accessibility review with screen-reader and keyboard users on the Labs and Trials, not only on the hub.
- No claim of certification: ranks and the Master title are markers inside the site.

---

## 6. Risks

### 6.1 Where gamification could teach misconceptions

| Risk | How it could mislead | Mitigation |
|---|---|---|
| Speed rewarded | Fast answers feel like understanding; time pressure also excludes players. | No timed gate; timed modes are optional and pay the same silver; every Trial has a justification step. |
| Rarity read as importance | Players chase Rares and skip Commons. | Rarity scale is defined as subtlety (3.1); Commons are drilled most in Rinse. |
| Boss names imply a haunted platform | "Ghost Clicks" and "The Leak" suggest browser bugs. | Each boss card states the *cause* in plain terms (stale geometry; withheld content). |
| "Zero wasted paints" Stamp | Teaches that painting is wasteful or authorable. | Replaced by Quiet Tower and Frugal Printer (3.2). |
| Smudge as "canvas cannot do text" | False if read literally (0.4). | Prologue Lab shows glyphs drawing fine, layout and semantics missing. |
| Spurious bell | A learner infers the event fires only on real change. | The sim fires occasional spurious tolls and Rinse tests idempotence (`R:32`). |
| Lucky guesses | A multiple-choice pass without understanding. | Justification chips, seeded variants, production tasks in the Exhibition. |
| Mere exposure to wrong code | Distractor code is copied. | Wrong code carries a persistent "WRONG" ribbon, is never copyable, and never appears as a final state. |
| Legacy names copied | Relic cards list `layoutsubtree` and old upload names. | Relics are flagged "do not use"; all code samples use current names only. |
| Streaks and loss aversion | Anxiety, abandonment. | Fogging has no silver cost; no streak counters. |
| Native/sim confusion | A pass in the sim implies it works in the learner's browser. | Truth Meter and the Native/Simulated badge on every Lab and Trial (6.3). |
| "Master of the Darkroom" | Implies expertise in a still-evolving API. | Labelled a learning marker; Living Explainer card; source citations everywhere. |
| Two meanings of one word | "Fallback", "paint" (0.4). | Fog vs Escape Hatch; bell vs Paint, enforced in copy review. |

### 6.2 Accessibility of the site itself (we teach Ch 7, so we must pass it)

| Area | Requirement |
|---|---|
| Hub | A first-class **Index mode**: a plain HTML list of chapters with status, equal in capability to the 3D hub. In native mode hub prints are real DOM with accessible names, keep geometry updated every frame (an undrawn print is reported without geometry, `R:317`), and a hidden or locked print is either hidden properly or announced as "locked, requires chapter N". |
| Keyboard | Every Lab and Trial is fully operable by keyboard; every drag mechanic has a button path (WCAG 2.2 dragging-movements `[X]`); visible focus everywhere; no keyboard traps in 3D scenes (skip links). |
| Motion | `prefers-reduced-motion` and `prefers-reduced-transparency` honored (the demo already models both, `EX jelly/src/index.ts:885-908`); a Motion setting (Off, Reduced, Full) in the UI; every signature effect has a static variant. |
| Flashing | No luminance flash above 3 per second anywhere (projector, scanner, alarm). Chapter 4's flicker is grain, not strobe. |
| Contrast and color | Text 4.5:1 against its chapter background (dark worlds need a **Lightroom** light theme); color never the only signal (Ch 5's ghost outline is dashed); forced-colors and high-contrast modes tested. |
| Timing | No required timing; turn-based variants for waves, rhythms and conveyors. |
| Targets | At least 24 CSS px interactive targets (WCAG 2.2 `[X]`). |
| Screen readers | Event logs use polite, throttled live regions; the model accessibility inspector is itself a real tree; cutscenes have transcripts; audio is optional and captioned. |
| Reflow and zoom | Works at 400% zoom and with text-spacing overrides; no horizontal scrolling at narrow widths. |
| Cognitive load | Plain-language toggle for story text; "explain simpler" on every Lab prompt; Story can be skipped without losing silver (Lab/Trial are the substance). |
| Performance | A low-power mode drops particle effects and 3D post-processing; the hub degrades to Index mode on weak devices. |
| Testing | Automated checks plus manual passes with a screen reader (NVDA and VoiceOver), keyboard-only, reduced-motion, forced-colors and 400% zoom before every release. |

### 6.3 The simulation (Fallback Reel): fidelity limits

Status: the Chrome docs say the API shipped in Chrome 157 (`CC:426`); the sim exists for other browsers and tests, so these gaps matter only where the learner runs it (and the Truth Meter says so).

| Feature | Sim approach | Gap | Consequence | Mitigation |
|---|---|---|---|---|
| Position of the paint event in the frame | rAF pipeline with callbacks ordered after RO/IO (S3) | Script cannot hook "after Paint" or the browser's step order precisely | Timing numbers are approximate | The Frame Strip shows the *spec* order (`R:405-425`); the sim is labelled model-faithful for order, illustrative for timing. |
| Invalidation accuracy (`changedElements`) | MutationObserver/ResizeObserver change detection | False positives and negatives vs native; the README says over-firing is allowed (`R:32`) | A learner over-trusts `changedElements` | Spurious-toll option; Trials score only unambiguous cases. |
| Snapshot content | `foreignObject` raster (S2) | Async; fonts and stylesheets must be inlined; no live caret/selection; native controls differ | Pixels differ from real drawing | Labelled illustrative; caret is an overlay; Reality Check in native mode. |
| Hit testing | Synthetic pointer router (S5) | Untrusted events; focus, selection, IME not equivalent | Typing into drawn inputs may differ | Real DOM inputs hold focus in the sim; documented. |
| Accessibility | A model tree (S10) | Not a platform accessibility tree | Learner may assume real assistive tech behaves the same | "Model of README behaviour" label; native mode points to browser inspectors. |
| Read-back-allowed rendering | Fixtures with a `sensitive` tag (S9) | Cannot truly withhold arbitrary content; appearance of withheld content is unspecified (01 section 5 #26) | Placeholder look may be mistaken for real | Hatch captioned "placeholder"; classification only. |
| WebGPU | Descriptor validator plus effect-lite (S7) | Visuals differ; the usage-flag rule is `[I]` | Overconfidence in validator strictness | `[I]` rules excluded from scoring. |
| Worker transfer | `ImageBitmap` stands in for `ElementImage` (S8) | `close()` and neutering semantics unspecified (01 section 5 #9) | Mis-teaching lifetime rules | Lab-only, tagged `[I]`, unscored. |
| DPR and zoom | Virtual device grid (S11) | The real DPR cannot be changed from script | Numbers right, perception approximate | Loupe labelled illustrative; real zoom change is a hidden secret. |
| Cross-browser claims | None | No source documents any non-Chrome status (01 section 5 #37) | Risk of implying support | Site never claims any browser's support; it says "this browser does not have the API". |

**Version drift.** Names have already changed (`texElementImage2D` to `texElementSubImage2D`, `copyElementImageToTexture` to `drawElementImageToTexture`, `layoutsubtree` to `content="drawable"`; see the demo comments, `EX webGL.html:213-230`, `EX jelly/src/index.ts:783-799`, `EX complex-text.html:13-15`). Keep a machine-readable `api-contract` (names, signatures, units, cited lines) that Labs, Trials and cards read, and a card-level `verified` stamp (date and README revision). Re-diff the README and Chrome docs before every release; the README is the intent, the Chrome docs are the practice (note 01, X36).

**Licences and credit.** The jelly slider is MIT (Software Mansion), and the demo credits it (`EX jelly/index.html:77-79`; its `LICENSE`); any adaptation keeps that notice. The explainer is under the W3C Software and Document License (`LICENSE.md`); quotations keep attribution.

### 6.4 Native-verification sheet (do these before building on the claim)

Prioritized; each unblocks a scored item or a hub dependency.

| # | Verify in Chrome 157+ | Unblocks | If it fails |
|---|---|---|---|
| 1 | Hit testing under a perspective (non-affine) `canvasTransform` (01 section 5 #21) | Hub prints tilted in 3D; the Ch 6 perspective toggle | Hub prints face the camera; Trials stay affine. |
| 2 | A focused input's blinking caret triggers `paint` (`R:312,319`) | Heartbeat Stamp, Ch 2 story line | Remove both. |
| 3 | Is an initial paint automatic? (01 section 5 #12) | Ch 2 template and wording | Keep "request defensively". |
| 4 | Negative source-rect offsets reaching ink overflow (`R:37`) | Ch 4 glow level | Fall back to a margin wrapper in the Lab. |
| 5 | WebGPU destination texture usage requirements (`GPU:50-55`) | Ch 8 validation rule | Drop the usage-flag validation from the Trial. |
| 6 | `ElementImage.close()` and post-transfer state (01 section 5 #9) | Ch 10 Lab model | Keep unscored. |
| 7 | `drawElementImage` outside the handler (01 section 5 #10) | Ch 2/4 wording | Keep "always in the handler". |
| 8 | `canvasClip` coordinate space (01 section 5 #16) | Ch 5 clip rounds | Use only translated-only clips in the Trial. |
| 9 | What withheld content looks like (01 section 5 #26) | Ch 9 Lab realism | Keep the caption "placeholder". |
| 10 | `getElementTransform` arity (`R:126-130` vs `IDX:116`) | Ch 5 card text, Epilogue note | Keep the "sources differ" note. |

---

## Appendix A. Source conflicts the site must not paper over

| Conflict | Sources | Handling |
|---|---|---|
| Flag-only vs shipped | `SRC: src/hic/types.ts:4`, `src/core/capabilities.ts:73-74` vs `CC:426`, `IDX:19` | Runtime detection decides; update repo copy; no cross-vendor claims. |
| `getElementTransform` signature | `R:126-130` (one argument) vs `IDX:116` (two) | Card mir-10 shows both; Trials avoid it. |
| Paint trigger wording | `R:32` ("snapshot would differ") vs `CC:80` ("layout, text, CSS change") | Teach "would look different"; mention the Chrome docs' narrower wording. |
| Sensitive vs not-sensitive lists | `R:299-313` vs `S:4` (text selection) | Unscored discussion slot. |
| System colors vs forced-colors | `R:301` vs `R:313` | Unscored discussion slot. |
| Questionnaire numbering | `S:26-31` skips 7 | Hidden card, not invented content. |
| Initial paint | `R:70-80` (none) vs `EX complex-text.html:44`, `EX pie-chart.html:80` (explicit) | "Request defensively". |
| Canvas ancestors | `R:37` vs `CC:125-187` | Teach "draw into the canvas that owns the element". |
| Wrapper-library style | `IDX:98-121` sets `style.transform`; demos mark that route "do not use" (`EX webGL.html:175-177`) | Ecosystem wall caption. |
