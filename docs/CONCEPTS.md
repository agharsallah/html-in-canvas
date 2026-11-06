# Drawable: concept document

A 3D, story-driven, gamified learning site for the WICG **HTML-in-Canvas** proposal.
The site teaches the API by using it: the darkroom you walk through is itself
HTML drawn into WebGL.

Status: every roll is built. The Prologue, Roll 01 and Roll 02 were audited against
`docs-llm/` (see `research/04-concept-inventory.md`, section 6); Rolls 03 to 12 are
built from that inventory. The wordmark returns you to the darkroom from any view.

Research that backs this document lives in [`docs/research/`](research/):

| File | What it holds |
| --- | --- |
| `01-file-map-and-concepts.md` | Every file in `docs-llm/`, every API concept with file:line sources, a dependency graph, gotchas, open spec questions |
| `02-examples-deep-dive.md` | Line-by-line walkthrough of every official example and Chrome docs sample, extracted patterns, pitfalls, a concept × example matrix |
| `03-learning-journey-plan.md` | Coverage audit and the per-chapter pedagogy plan (objectives, labs, trials, assessment) |
| `04-concept-inventory.md` | Concept inventory for Rolls 03 to 12, an audit of the built chapters, and open items to verify natively |

---

## 1. The idea in one paragraph

Canvas only knows pixels. HTML-in-Canvas lets a `<canvas>` draw real, laid-out,
accessible HTML. So the site's world is a **photographic darkroom**: HTML elements
are *negatives*, the canvas is *photographic paper*, and drawing an element is
*developing* it into a *print*. A snapshot is an exposure. The `paint` event is the
moment the paper hits the developer. The metaphor is not decoration; it maps onto
the API one to one, which is what makes it teachable.

## 2. Story

**The Canvas Kingdom** has only ever known pixels. Its citizens (buttons, inputs,
paragraphs in every script, emoji) were banished to **the Fallback**, a fog where
canvas children wait unseen. You are the new apprentice in the last darkroom that
still knows how to develop elements into canvas.

- **Caret** (guide): a blinking text cursor who lost their input field. A nod to the
  explainer's first screenshot, a form with a blinking caret. Caret blinking inside a
  snapshot is also a real fact: caret blink rate is *not* sensitive information.
- **The Smudge** (antagonist): blurry, unselectable, untranslatable bitmap text.
  Each roll has a local foe that embodies the mistake the chapter teaches you to avoid.

The story never invents API facts. Every claim a character makes is backed by a
concept card that cites its source in `docs-llm/`.

## 2b. The opening shot: the developer tray

The site opens on a tray of developer. Lying in it is a print that develops out of blank
paper, darks first, as drips ripple the chemistry. **The print is live HTML.** It's a drawable
child of the WebGL canvas, and its snapshot is refracted through a liquid shader. It carries:

- a real `<input>` that types your name into the liquid (ripples spread from the field as you type);
- a clock that ticks every second (each tick fires `paint` and re-uploads the snapshot);
- a real *Begin* button under the water, hit-tested through `updateElementGeometry`.

Pointer ripples use the element's own `offsetX`/`offsetY`, which only exist because the browser
knows where the element lies in 3D. Walking left past the first print returns you to the tray.
Returning visitors start on the line, and the card greets them by name.

In fallback browsers the same card sits on the tray via CSS 3D, without the liquid, and says so.

Code: `src/world/hero/` (`hero-spot.ts`, `developer-tray.ts`, `liquid-material.ts`),
`src/ui/hero-card.ts`, `src/styles/hero.css`. Supporting depth on the line: volumetric
safelight shafts (`world/light-shafts.ts`), a soft shadow behind every print, and prints that
lift toward you on hover (the DOM geometry follows, so the button stays under the pointer).

## 2c. The line as a map of the API

Before you start a roll, the line already teaches. Every print is drawable HTML, and four
things make that visible:

- **A photograph per roll.** Each print carries a picture of its chapter (the Smudge's pixels,
  fog banks, a bell, a lens, gears...), drawn as plain SVG in the roll's process colours. No
  `<use>`, `<pattern>` or `<feImage>`: snapshots leave those out (read-back-allowed rendering).
  Code: `src/ui/print-art/`.
- **Latent prints and the safelight loupe.** Locked prints carry their full content, half
  developed: readable, but muted. What stands out most from the paper develops first, so dark
  ink on light paper and light ink on the tintype and cyanotype papers read equally well.
  Hover one and a glass loupe with a safelight rim shows that spot fully developed, crisp and
  in true colours. The pointer position comes from the card's own `offsetX`/`offsetY`
  through the 3D transform. Code: `print-material.ts` (`uLoupe`), `hub-input.ts` (`cardPoint`).
- **Turn a print over.** Click any print, or its *Notes* button, and it comes off the wall and
  flips. The back is a second drawable shared by every print: one line per concept, the four
  frames as a contact sheet, what you'll build, and *Start roll* when the roll is open. The face
  turned away becomes `inert`, like the official WebGL flip-card demo; the rest of the line
  dims; ← → turn over the neighbours; Esc or a click on the wall hangs it back. Back faces are
  culled from hit testing (`facesCamera` in `native-surfaces.ts`). Code: `world/inspector.ts`,
  `ui/print-verso.ts`, notes in `story/roll-notes.ts`.
- **X-ray (button or `X`).** Outlines and tags every element inside the prints, the back and
  the hero card. The CSS change makes the canvas fire `paint` and the snapshots re-upload,
  which is the point. A tooltip names the element the browser hit, in its own pixels, through
  the 3D transform. Code: `ui/xray.ts`, `styles/xray.css`.

Finding worth keeping: in Chrome 157 an `outline` on the drawable element *itself* marks its
snapshot changed on every geometry update, so the print re-uploads every frame (X-ray first
cost 35 points of idle time). Outlines on descendants don't. X-ray uses an inset `box-shadow`
on the drawable root instead.

## 2d. Feedback: sound, confetti, and your code running

- **Sound is off by default.** A *Sound* toggle sits in the HUD and in every chapter header;
  the choice persists. Every cue is synthesised with Web Audio (no files). Goals chime,
  correct answers play a rising arpeggio, wrong ones a soft low nudge, a finished frame a
  fanfare, and turning a print over sounds like paper. Code: `ui/fx/sound.ts` (the switch),
  `ui/fx/synth.ts` (loaded the first time a cue plays).
- **Each lab sounds like its place**, on meaningful moments only, never on plain clicks: the
  fog's foghorn, the bell tower's struck bell (only on real changes), the lens grinding and
  ringing true, the projector's film gate clattering, the mirror's shimmer and ghost, the
  observatory's telemetry, the foundry's sizzle and pour, the late train's whistle, the
  lighthouse horn and sonar, the vault's tumblers, the clockwork's tick-tock and ratchet, the
  reel. Each cue varies its pitch, has a cooldown, and tires when it keeps firing (backs off
  up to 4x), so busy labs never drone. Code: `ui/fx/lab-sfx.ts` (`admit` is unit-tested).
- **HTML-in-Canvas confetti.** Correct answers and finished goals throw confetti whose pieces
  are real HTML (code chips, a star, a check, paper squares) drawn into one overlay canvas.
  Each burst draws every snapshot dozens of times with its own transform: one element, many
  copies. The overlay is `inert`; reduced motion turns it off. Code: `ui/fx/confetti.ts`,
  wired by `ui/fx/feedback-fx.ts`, which watches the UI for goals and success/error callouts,
  so every trial and exercise gets it without per-chapter code.
- **Your code, running.** Solving an exercise opens a live scene under it that acts out what
  the code does, with real drawables: the card rising out of the fog, the nested hole filled,
  the bell ringing with `changedElements` listed, a too-coarse grid next to a crisp one, the
  ticket cropped, stretched and tilted, a moving button you can catch, a card on a turning
  plane that uploads only when it changes, HTML melted in slices, `captureElementImage`
  carriages on a railway, a pie whose wedge `drawFocusIfNeeded` rings, a flip card whose back
  goes `inert`, pixels read back and exported as a PNG. Every exercise has one (tested).
  Code: `chapters/shared/proof/`; the scenes load on demand.

## 3. The journey: rolls, processes and foes

Each chapter is a **roll of film**, printed with a different historical
photographic process. The process *is* the chapter's visual identity, so chapters
are never reskins of one another.

| Frame | Roll | Process (visual identity) | Foe | Concepts | Status |
| --- | --- | --- | --- | --- | --- |
| 00 | The blank canvas | Digital proof: cold white, pixel grid, a crawling mosaic of fat pixels | The Smudge | Motivation, the five use cases | Playable |
| 01 | The fallback fog | Platinum print: soft greys, drifting fog banks | The Fog | `content="drawable"`, `drawable` at any depth, laid out but not hit testable, accessible without geometry, nested drawables, draw exceptions | Playable |
| 02 | The bell tower | Sepia toning: brass, sound rings rippling from an unseen bell | The Restless Bell | `paint`, snapshots, `changedElements` and what counts as a change, `requestPaint()`, timing, the `onpaint` single slot, reverse order | Playable |
| 03 | The lens grinder | Daguerreotype: mirror silver, focus rings | Blur | Canvas grid vs CSS px, `device-pixel-content-box`, `getElementImageDefaultSize()` | Playable |
| 04 | The projector hall | Three-strip colour: velvet, projector beams | The Crooked Reel | `drawElementImage()` overloads, source/destination rects, ink overflow | Playable |
| 05 | The mirror maze | Tintype: dark plate, warm highlights | Ghost Clicks | `updateElementGeometry()`, `canvasTransform`, `canvasClip`, hit-test order, `preserveElementGeometry`, `getElementTransform()`, `clearElementGeometry()` | Playable |
| 06 | The orbit observatory | Cyanotype: Prussian blue, white linework | The Flat Earth Society | `texElementSubImage2D()`, texture allocation, 3D hit testing | Playable |
| 07 | The GPU foundry | Lith print: molten orange, deep blacks | The Melt | `drawElementImageToTexture()`, shaders over HTML | Playable |
| 08 | The worker railway | Instant film: white borders, chemical greens | The Late Train | `OffscreenCanvas`, `captureElementImage()`, `ElementImage` transfer and `close()`, `elementgeometryupdate` batching | Playable |
| 09 | The lighthouse of voices | Salt print: warm brown, sea blue | Silence | Accessibility tree, geometry-less nodes, `inert`, `aria-hidden`, focus rings, `drawFocusIfNeeded()` | Playable |
| 10 | The vault | Redacted photocopy: black bars, toner grain | The Leak | Read-back-allowed rendering, every sensitive and non-sensitive item | Playable |
| 11 | The clockwork heart | Albumen print: watch-movement brass | The Deadlock | Update-the-rendering steps, paint timing options A/B/C, why WebGL flushes rule out placeholders | Playable |
| 12 | The endless reel | Hologram: iridescent foil | The future | Auto-updating canvas, threaded effects, worker-snapshot alternative | Playable |

The order follows concept prerequisites: attributes before drawing, units before
the longer `drawElementImage` forms (destination rects are canvas grid px, source
rects are CSS px), drawing before geometry, geometry before 3D, 3D before workers,
and the responsibility chapters (accessibility, privacy, timing) once the learner
has built enough to care. `src/story/rolls.ts` is the source of truth for the order.

## 4. Anatomy of a roll

Every roll has four **frames**, shown as a numbered stepper at the top of the chapter:

1. **Story.** A dialogue with Caret and the roll's foe. Each concept met is pinned
   to a notebook as a *concept card*: its kind (attribute, event, method, property,
   rule, idea), its name, a **one-sentence definition**, detail, code and a source.
2. **Lab.** A free-play toy built on the real API. In Chrome 157+ it uses real
   `paint` events, real `drawElementImage`, and shows the browser's real exceptions.
   Elsewhere it runs a faithful simulation that follows the same rules, and labels
   itself as simulated. The lab completes when the learner has *observed* the key
   behaviour (for example, a paint with and one without `changedElements`).
3. **Practice.** The learner writes the important lines by hand in a highlighted
   editor. Each exercise shows its requirements up front in plain language (what the
   code must do, never the syntax), marks them pass or fail on every check, and offers
   escalating help: hint 1, hint 2, then the full solution. Every exercise links back to
   the concept card where the pattern was shown ("Seen in"), so it's challenging, but
   never asks for something the learner hasn't seen. Revealing the solution still lets you
   finish, but pays no silver; solving a whole roll by hand earns the *Hand-written* stamp.
   Exercises are pure data checked against normalised code (comments, quotes and
   whitespace don't matter); tests prove every solution passes and every starter fails.
4. **Trial.** A challenge with an explicit win condition that can't be passed by
   guessing. The outcome comes from pure rule functions that are unit-tested
   against the explainer. Passing the trial develops the next print in the hub.

Playable examples:

- *Prologue trial*: sort eight claims; five are the README's use cases, three are
  traps that foreshadow later rolls (cross-origin read-back, visited links, DOM-less layout).
- *Roll 01 trial*: configure markup and paint calls so the print shows a poem with a
  sparkling, separately drawn “you” and no advert. It exercises the nested-drawable rule
  from `nested-sparkles.html`.
- *Roll 02 trial*: predict the bell in six scenarios, including the DOM edit inside `paint`
  that only lands next frame and reverse tree order.

## 5. Gamification

| Mechanic | What it is | Why it teaches |
| --- | --- | --- |
| **Frames** | Story, lab, practice and trial per roll; shown as film frames on the print and as a stepper in the chapter | Makes progress visible and pushes learners past reading into doing |
| **Unlocks** | A roll's trial develops the next print on the wire | Enforces prerequisite order; the reveal is the reward |
| **Silver** | XP. Story 20, lab 40, practice 60, trial 80, 15 per exercise solved by hand, plus stamps | Rewards active recall more than reading; revealed solutions pay nothing |
| **Ranks** | Apprentice, Printer (150), Developer (450), Darkroom master (1000) | Long-term goal |
| **Negatives** | Collectible cards, one per API primitive, with rarity (common, rare, legendary, secret) | The Album becomes a personal API reference |
| **Stamps** | Achievements for *how* you played: Clean exposure (no mistakes), Hand-written (no revealed solutions), Quiet bells, Tab walker, Fog walker | Rewards good habits: precision, keyboard use, reading errors |
| **Secrets** | Hidden negatives found by exploring, such as reaching a print with the keyboard or typing in a native snapshot | Rewards curiosity and accessibility-minded play |

Planned:

- **Boss rolls** that mix earlier concepts (Blur, Ghost Clicks, Silence, The Leak).
- **Spaced recall**: “contact sheet” reviews in the hub, built from collected negatives.
- **The exhibition** (epilogue): the hub turns into a gallery of your developed negatives,
  drawn as holographic foil cards with HTML-in-Canvas plus a WebGL shader.

## 6. Design system

The darkroom is warm umber lit by two light sources: an amber safelight and the
verdigris glow of the developer tray. Prints are cool baryta paper with
selenium-toned ink.

| Token | Hex | Use |
| --- | --- | --- |
| Umber 950 | `#1b120e` | The room |
| Safelight | `#f0a53c` | Warm light, ranks, legendary cards |
| Tray | `#6fb7a8` | Native-mode indicator, secrets |
| Baryta | `#eef0ec` | Paper |
| Selenium | `#241c18` | Ink |

**Type.** Bodoni Moda (display), the high-contrast face of photo magazines and
print titles. Atkinson Hyperlegible Next (body) and Atkinson Hyperlegible Mono
(code and film-edge markings), chosen for legibility, which suits a site about
accessibility. All fonts are self-hosted through Fontsource, since snapshots must
not depend on cross-origin resources.

**Motion.** One orchestrated moment: prints *develop* (darks first, grain fading)
and chapters develop in from a washed-out blur. Everything else is a response to
the learner. `prefers-reduced-motion` disables sway, camera lean, typewriter and drift.

**Components.** One reusable kit in `src/ui/components/`, styled "flat but elevated":
crisp 1.5px ink lines and hard offset shadows, like cut paper on paper. Controls lift on
hover and press flat on click. No native checkboxes, radios or unstyled inputs anywhere:

| Component | Used for | Accessibility |
| --- | --- | --- |
| `button` (primary, secondary, ghost; md, sm; optional key hint) | Every action | Native `<button>` |
| `createToggle` kind `switch` | On/off settings in labs | `role="switch"`, `aria-checked` |
| `createToggle` kind `checkbox` | Pick-many answer cards | `role="checkbox"`, `aria-checked` |
| `createToggle` kind `chip` | Attributes and calls toggled inside code panels | `aria-pressed` |
| `createSegmented` | Pick one of a few values (`fallback` / `drawable`) | Radio group, roving tabindex, arrow keys |
| `callout` (info, hint, success, error) | Feedback and cues | `role="status"` for results |
| `createObjectives` | Lab goals that tick themselves off | Live count |
| `createStepper` | The four frames of a roll | `aria-current="step"` |
| Option cards (`.ui-option`) | Quiz answers, with A/B/C keys | Buttons |
| `createCodeEditor` | Practice exercises | A real `<textarea>` over a highlighted `<pre>` |

All components read `--paper`, `--ink`, `--accent` and `--glow`, so each chapter
re-themes them for free.

**Signature components** (`src/ui/components/`, our own, used across chapters):

| Component | What it is |
| --- | --- |
| Filmstrip | The roll's frames as 35mm film with sprocket holes: negatives until developed, lit by the safelight when current |
| Dial | A lens-ring rotary knob (ARIA slider, arrows, drag) |
| Light meter | A needle gauge showing progress to the next rank, in the HUD |
| Rubber stamp | Circular text around a glyph, pressed onto the finale and the Album |
| Flip negative | Album cards: dark negative on the front, developed positive with the definition on the back |
| Glyphs | Our own line icons for frames and concept kinds |
| Tilt | Cards lean toward the pointer with a moving sheen (off under reduced motion) |

**3D scenes** (`src/scenes/`, all built on `MiniStage`, which sizes to device pixels,
pauses off-screen, and releases its WebGL context on unmount):

| Scene | Where | What it shows |
| --- | --- | --- |
| The Smudge | Prologue story | A cloud of pixel cubes that resolves into crisp letters as Caret explains HTML-in-Canvas |
| The fog | Roll 01 story and lab | Canvas children adrift in fog; they snap into a layout stack, light up when drawn, shudder red when a draw throws. In the lab it mirrors your toggles live: "what the browser sees" next to "what your canvas shows" |
| The bell | Roll 02 story and lab | A bronze bell that swings once per `paint`; rings are copper for real changes and teal for bare `requestPaint()` |

**Charts and figures** (`src/ui/charts/`, plain SVG, no library; series colours validated
for colour-blind separation and contrast):

- *Paint timeline*: a live strip of rendering updates in the bell lab, bars for paints
  coloured by cause, a baseline tick for silence, hover tooltips, and a quiet counter that
  freezes the strip so the last burst stays readable.
- *Collection donut*: Album negatives by rarity, with the headline count in the centre.
- *Pipeline figure*: the rendering update with `paint` after Paint, a travelling pulse,
  and arcs showing canvas drawing landing this frame and DOM edits looping to the next.
- *Nested figure*: the spot a nested drawable leaves empty in its parent's snapshot, and the second draw that fills it.

**Palette.** The darkroom is aubergine and oxblood lit by a red-orange safelight, an amber
lamp, teal developer and magenta stain. Every roll has a duotone (`--accent`, `--second`)
that drives the chapter wash, shadows, 3D lights and chart accents, under a photographic
grain overlay.

**Navigation and cues.** A chapter always shows where you are (the stepper), what's left
(a cue such as "Meet every goal to earn 40 silver"), and how to move (Back and Continue
buttons in the bottom bar; Continue turns primary once the frame is done). The notebook
drawer, which holds every concept of the roll, is one click away from any frame. Story
lines move with Back and Next or the arrow keys, quizzes take A/B/C, and the editor checks
with Ctrl/⌘+Enter. In the hub, the roll to play next carries an "Up next" tag.

**Per-chapter identity.** Each roll sets `--paper`, `--ink`, `--accent` and `--glow`
from its process, plus a signature backdrop module (pixel mosaic, fog banks, bell rings).

## 7. Architecture

```
src/
  main.ts                    fonts, global styles, start
  app/                       composition root, hash router, chapter controller
  core/                      capability detection, storage, typed emitter
  hic/                       HTML-in-Canvas helpers (the reusable, teachable layer)
    types.ts                 typings for the experimental API + guards
    canvas-sizing.ts         device-pixel-content-box ResizeObserver
    paint.ts                 paint listener + frame driver (paint/requestPaint or rAF)
    element-texture.ts       texElementSubImage2D into a three.js ExternalTexture
    projective-geometry.ts   element -> canvas DOMMatrix for 3D hit testing
  game/                      pure reducer (progress, silver, unlocks), stamps, store
  story/                     rolls (chapters + processes), negatives catalogue
  world/                     the 3D darkroom
    stage.ts, hub.ts, hub-input.ts, print.ts, print-material.ts, darkroom-set.ts, camera-rig.ts
    surfaces/                SurfaceBackend: NativeSurfaces | Css3dSurfaces
  ui/                        HUD, toasts, album, dialogue, Caret, print-card
  chapters/
    shared/                  chapter contract, shell, lab canvas, choice quiz
    prologue/ roll-01-fog/ … roll-12-epilogue/   (story, lab, trial, backdrop, css)
tests/                       vitest: geometry, game state, fog rules, catalogue, router, capabilities
```

Key decisions:

- **One interface, two backends.** World code talks to `SurfaceBackend`. Natively,
  each print card is a `drawable` child of the WebGL canvas, uploaded with
  `texElementSubImage2D` when it shows up in `changedElements`, and its geometry
  is synced with `updateElementGeometry` using a full projective `DOMMatrix`.
  So hover, focus, Tab and click work on a tilted 3D print with **no raycasting**.
  Without support, `Css3dSurfaces` places the same element in a CSS3D layer.
- **Why not three's `HTMLTexture`?** In three r187 it calls only the legacy
  `texElementImage2D` and overwrites `canvas.onpaint`. Our `ElementTexture` uses the
  current API, keeps a legacy fallback, and shares the paint event.
- **Shaders never move vertices.** The print shader only changes colour. Bending the
  paper in a vertex shader would desync the geometry sent to `updateElementGeometry`.
- **Paint-driven loop.** Natively the hub renders inside `paint` and re-arms with
  `requestPaint()`, like the official WebGL demo; in fallback it uses rAF.
- **Units.** 2D draw positions are canvas grid px; `canvasTransform`, `canvasClip`
  and source rects are CSS px (Chrome docs, `concepts.md` units table).
- **Rules as pure functions.** Trials and simulations call the same rule functions
  (`chapters/roll-01-fog/rules.ts`), which tests pin to the explainer.
- **Lazy chapters.** Each roll is a dynamic import with its own CSS chunk.
- **Modularity budget.** No source file passes ~250 lines; most are under 150.

Dev switches: `?sim` forces the fallback, `?unlock=all` opens every roll, `?reset`
wipes the save.

### Performance

Measured, not guessed: see [`perf/README.md`](../perf/README.md) for the method, the probe and the
before/after numbers. In short:
- the darkroom stops rendering while a chapter covers it;
- every loop is capped (60 fps, 30 when idle, `requestPaint()` itself throttled);
- only on-screen prints upload snapshots;
- 3D scenes render on demand;
- live charts draw to canvas;
- a bundle budget runs in `pnpm build`.

Under 4× CPU throttling every page keeps 80–87% of the main thread idle with zero long frames.

## 8. Accessibility of the site itself

- Print cards are real headings, lists and buttons, and are reachable with Tab inside the 3D world.
- Focus rings are drawn into the texture, because the browser paints them into the snapshot.
- Toasts use a polite live region; dialogue advances with a button, never a timer.
- The Album is a native `<dialog>`.
- Reduced motion is respected everywhere.
- Open issue: locked prints add 12 “Undeveloped” headings to the accessibility tree.
  Roll 09 should make fixing this a lesson (README: hide unused canvas content).

## 9. Roadmap

Done:

- ~~Put the Lens Grinder (units: canvas grid px vs CSS px) **before** the Projector Hall~~
  Done in `src/story/rolls.ts`: the lens is Roll 03 and the projector Roll 04, because
  destination rects are canvas-grid px and source rects are CSS px.
- ~~Build Rolls 03 to 12~~ All built, from the inventory in `research/04-concept-inventory.md`.
- ~~Audit the Prologue, Roll 01 and Roll 02 against `docs-llm/`~~ Unsupported claims fixed
  (exception types, browser support, "invisible" children, the initial `requestPaint()`),
  and the missing facts added as concept cards (accessible without geometry, `drawable` at
  any depth, what counts as a change, the `onpaint` single slot, the first `changedElements`).
- ~~Make the logo a way home~~ The wordmark, in the HUD and in every chapter, returns to the darkroom from any view.
- ~~Verify perspective hit-testing under a 3D `canvasTransform`~~ Verified in Chrome 157: `elementFromPoint` on a tilted print returns the real button exactly where WebGL draws it.

Next:

1. Run the native-verification checklist (`research/04-concept-inventory.md`, section 8) in
   Chrome 157+: exception types, whether a first `paint` is automatic, what the first
   `changedElements` holds, and whether a CSS animation fires one `paint` per frame.
   Teach each answer only once it is verified.
2. Verify native mode end to end: textures, hit testing, focus rings, legacy fallback.
3. Move nested-drawable *drawing* to the Projector Hall and keep Roll 01 to declaring it
   (its basic nested exercise stays).
4. Bring Accessibility forward, and fork after Roll 05 into a GPU wire and a people-and-platform wire.
5. Fill remaining gaps: nested canvases, fallback strategies, library support, and the rejected worker design.
6. Add an assessment spine: pre/post tests, spaced recall, boss rolls mixing earlier concepts,
   and the exhibition.
7. Add end-to-end tests (Playwright) for the hub-to-chapter flow in both modes.
