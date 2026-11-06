# Drawable

**Live:** [htmlincanvas.vercel.app](https://htmlincanvas.vercel.app) · [the field guide](https://htmlincanvas.vercel.app/guide)

**A darkroom adventure through HTML-in-Canvas.**

Drawable teaches the [WICG HTML-in-Canvas proposal](https://github.com/WICG/html-in-canvas) by using it everywhere. You walk through a 3D darkroom where every chapter hangs on a wire as a photographic print, and every print is real HTML drawn into WebGL. You can select its words, Tab to its buttons, and click them on a tilted 3D surface. Thirteen chapters take you from "why can't canvas text be read?" to workers, WebGPU, accessibility and the rendering update, each with a story, a hands-on lab, exercises you write by hand, and a trial.

There is also a [one-page field guide](guide.html) with every concept and a live figure for each.

> Open it in **Chrome 157 or later** to see the real API. Other browsers get a faithful simulation, and the top bar tells you which mode you're in.

## Contents

- [What you'll learn](#what-youll-learn)
- [How a chapter works](#how-a-chapter-works)
- [The darkroom](#the-darkroom)
- [Getting started](#getting-started)
- [Browser support](#browser-support)
- [Project structure](#project-structure)
- [How it's built](#how-its-built)
- [Adding or changing a chapter](#adding-or-changing-a-chapter)
- [Quality checks](#quality-checks)
- [Documentation](#documentation)

## What you'll learn

Each chapter is a "roll of film" printed with a different historical photographic process, which gives it its own palette, textures and sound.

| # | Chapter | You face | Concepts |
| --- | --- | --- | --- |
| 00 | The blank canvas | The Smudge | Why HTML-in-Canvas, use cases |
| 01 | The fallback fog | The Fog | `content="drawable"`, `drawable`, nested drawables |
| 02 | The bell tower | The Restless Bell | the `paint` event, `changedElements`, `requestPaint()` |
| 03 | The lens grinder | Blur | `device-pixel-content-box`, `devicePixelRatio`, `getElementImageDefaultSize()` |
| 04 | The projector hall | The Crooked Reel | `drawElementImage()`, source and destination rects |
| 05 | The mirror maze | Ghost Clicks | `updateElementGeometry()`, `canvasTransform`, `canvasClip`, hit-test order |
| 06 | The orbit observatory | The Flat Earth Society | `texElementSubImage2D()`, 3D hit testing |
| 07 | The GPU foundry | The Melt | `drawElementImageToTexture()`, shaders over HTML |
| 08 | The worker railway | The Late Train | `OffscreenCanvas`, `captureElementImage()`, `elementgeometryupdate` |
| 09 | The lighthouse of voices | Silence | the accessibility tree, `inert`, focus rings, `drawFocusIfNeeded()` |
| 10 | The vault | The Leak | read-back-allowed rendering, sensitive information |
| 11 | The clockwork heart | The Deadlock | update the rendering, paint timing options A, B and C |
| 12 | The endless reel | The future | the auto-updating canvas, threaded effects |

Chapters unlock in order: finishing a chapter's trial develops the next print.

## How a chapter works

Every chapter has four frames, shown as a filmstrip at the top of the screen.

1. **Story.** A short scene with a 3D diorama that reacts to each line. Each concept is introduced on a card, and the card goes into your **notebook**, which you can reopen at any time.
2. **Lab.** A playground built on the real API, with a list of goals: switch attributes, drag rects, slow a worker down, click a button on a spinning globe. In Chrome 157 the exceptions, `paint` events and hit tests you see are the browser's own.
3. **Practice.** Short exercises you write by hand in a code editor. Requirements are listed up front and checked as you type. Help comes in steps: a hint, a second hint, then the solution. Solving one opens **"Your code, running"**, a live scene that acts out what your code does (a bell that rings on every `paint`, snapshots riding a railway, a pie chart whose focused wedge gets a real focus ring). Your code is saved per exercise, and *Reset code* can be undone.
4. **Trial.** A challenge that checks you understood it: predict when the bell rings, fix a broken timetable, aim through a projection.

**Progress and rewards.** Frames and hand-written exercises earn silver, and silver raises your rank from Apprentice to Darkroom master. Stamps reward clean runs and discoveries. 52 collectible negatives hide in the labs and trials, and the Album shows your collection. Progress is saved in your browser.

**Feedback.** Correct answers and finished goals throw confetti made of real HTML: code chips, stars and paper squares, all drawn into one canvas. Sound is **off by default**. Turn it on with the *Sound* button and each lab sounds like its place: a foghorn, a struck bell, a film projector's clatter, a steam whistle, a clock's tick-tock. Sounds play only on meaningful moments, never on plain clicks, and back off when they repeat.

## The darkroom

The home page is the darkroom.

- **The opening shot.** On a first visit, a card develops out of blank paper in a tray of developer. The card is live HTML refracted through a rippling liquid shader. You can type your name into it, watch its clock tick, and press its *Begin* button under the water.
- **The line.** Each chapter hangs on the wire as a print with its own picture. Scroll, drag or use the arrow keys to walk along it; Tab visits the prints.
- **Latent prints.** Locked chapters hang as half-developed images. Hover one and a safelight loupe develops the spot under your pointer.
- **Turn a print over.** Click any print, locked or not, to take it off the wire. Its back lists what the chapter teaches, its four frames, and what you'll build. Use ← and → to turn the neighbouring prints, and Esc to hang it back.
- **X-ray.** Press **X**, or the *X-ray* button, to outline every real HTML element inside the 3D scene. A tooltip names the element under your pointer, in that element's own pixels, through the 3D transform.

## Getting started

You need **Node.js 20.19+ or 22.12+** (Vite 8's requirement) and **pnpm**.

```sh
pnpm install
pnpm dev
```

Open the address Vite prints (usually <http://localhost:5173>). The darkroom is at `/`, and the field guide at `/guide.html`.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server with hot reload |
| `pnpm build` | Typecheck, build both pages, and enforce the bundle budget |
| `pnpm preview` | Serve the production build locally |
| `pnpm test` | Run the unit tests once |
| `pnpm test:watch` | Run the unit tests in watch mode |
| `pnpm typecheck` | Typecheck without building |
| `pnpm perf:budget` | Check the bundle budget of the last build |

### URL switches

Handy while developing or demoing. They combine: `?reset&unlock=all` gives a fresh save with every chapter open.

| Switch | Effect |
| --- | --- |
| `?unlock=all` | Open every chapter |
| `?reset` | Wipe saved progress and saved exercise code |
| `?sim` | Force the simulated fallback, even when the API exists |
| `#/roll/<id>` | Open a chapter, e.g. `#/roll/bells` |
| `#/roll/<id>/<frame>` | Open a frame directly: `story`, `lab`, `practice` or `trial` |

Chapter ids are `prologue`, `fog`, `bells`, `lens`, `projector`, `mirrors`, `observatory`, `foundry`, `railway`, `lighthouse`, `vault`, `clockwork` and `epilogue`.

## Browser support

| Browser | Experience |
| --- | --- |
| Chrome 157+ | **Native.** Prints, labs and figures use the real API: `drawable` children of WebGL and 2D canvases, real `paint` events, real exceptions, browser hit testing through 3D transforms, WebGPU where available. |
| Others | **Simulated.** Prints are placed with CSS 3D transforms, and labs run a simulation with the same rules and the same goals. The top bar says *Simulated*. Every chapter can be completed. |

The site respects `prefers-reduced-motion`: no camera glides, swaying or confetti.

## Project structure

| Path | Contents |
| --- | --- |
| `src/hic/` | Reusable HTML-in-Canvas helpers: typings, canvas sizing, the paint-driven frame loop, WebGL element textures, projective geometry for 3D hit testing |
| `src/world/` | The 3D darkroom (three.js): the camera rig, prints, the developer tray, the inspector that turns prints over, and the native and CSS3D surface backends |
| `src/chapters/` | One folder per chapter (story, lab, exercises, trial, diorama, backdrop), plus `shared/` for the chapter shell, editor and practice flow, and the "Your code, running" scenes in `shared/proof/` |
| `src/scenes/` | The 3D scenes used by stories and labs |
| `src/game/` | Progress, silver, ranks, unlocks and stamps as a pure reducer, a persisted store, and saved exercise drafts |
| `src/story/` | The chapters' data (`rolls.ts`), the notes on the back of each print, and the collectible negatives |
| `src/ui/` | The HUD, album, dialogue, X-ray, components, charts, the code editor, print art, sound and confetti (`fx/`) |
| `src/guide/` | The one-page field guide and its live figures |
| `src/styles/` | Design tokens and styles |
| `tests/` | Unit tests (Vitest) |
| `perf/` | The runtime probe, the layout overflow scan, and the measured results |
| `scripts/` | The bundle budget check |
| `docs/` | The concept document and research notes |

## How it's built

- **Vanilla TypeScript**, strict, with no UI framework. Modules are kept small: no file is a 400-line script.
- **three.js** for the darkroom and dioramas, on one WebGL canvas with `content="drawable"`. Each print's HTML is a `drawable` child of that canvas, uploaded with `texElementSubImage2D` only when the `paint` event lists it in `changedElements`.
- **Hit testing is the browser's.** There is no raycasting for the prints: each frame, the plane's model-view-projection is turned into a DOM matrix and sent with `updateElementGeometry`, so hover, focus and clicks land on the real elements. Faces turned away from the camera are excluded and made `inert`.
- **One backend interface, two implementations.** World code never branches on mode: `NativeSurfaces` uses the API, and `Css3dSurfaces` places the same elements with CSS 3D transforms.
- **The game is a pure reducer** (`src/game/state.ts`) behind a small persisted store. Saved exercise code lives in a separate debounced store, so typing never re-renders the darkroom.
- **Performance.** The frame rate is capped at 60 fps (30 when idle), and the world stops drawing while a chapter covers it. Only prints on screen upload or sync geometry. 3D scenes render on demand. Sound, confetti and the proof scenes load only when first needed. Method and numbers are in [`perf/README.md`](perf/README.md).

## Adding or changing a chapter

1. **Create** `src/chapters/<folder>/index.ts`, exporting a `ChapterModule` (see `src/chapters/shared/chapter.ts`). It holds:
   - `story` and its concept cards;
   - `lab`, `exercises` and `trial`, each with a one-line brief;
   - optionally, a `diorama` (3D story scene) and a `backdrop` (decorative layer).
2. **Register it** in `src/story/rolls.ts`: title, foe, logline, concepts, a print process (palette), and a lazy `load`.
3. **Add the print's picture** in `src/ui/print-art/`, and its notes in `src/story/roll-notes.ts`. A test checks that every concept on the print has a note.
4. **Give every exercise a proof scene** in `src/chapters/shared/proof/registry.ts`, and add its id to `PROOF_IDS` in `index.ts`. A test checks both lists against the exercises.
5. **Optionally, add themed sounds:** call `sfx('<cue>')` from `src/ui/fx/lab-sfx.ts` at the lab's meaningful moments.

Notes for chapter code:
- Use `createLabCanvas()` from `src/chapters/shared/lab-canvas.ts` for 2D labs. It gives you the real API in Chrome 157 and the simulation elsewhere, through one interface.
- Don't put an `outline` on a drawable element itself. In Chrome 157 it marks the snapshot as changed on every geometry update, so the element re-uploads every frame. Use an inset `box-shadow` instead.
- Snapshots only cover the element's border box, so outer shadows are clipped.

## Quality checks

- **Unit tests.** `pnpm test` covers the game reducer, chapter rules, exercise checks, content integrity, the frame driver, projective geometry, drafts, and the sound gate.
- **Bundle budget.** `pnpm build` fails if a chunk exceeds its gzip budget (`scripts/check-budget.mjs`).
- **Runtime probe.** `perf/probe.js` measures main-thread idle time, frame times, long frames and DOM mutations. Paste it into DevTools.
- **Layout scan.** `perf/overflow-scan.js` walks all 52 chapter frames and reports any text that escapes its box. Run it at desktop width and at 390 px.

## Documentation

- [`docs/CONCEPTS.md`](docs/CONCEPTS.md): the story, the chapter map, gamification, the design system, the darkroom features, architecture and accessibility.
- [`docs/research/`](docs/research/): a map of the official material, a deep dive into the examples, the learning-journey plan, and the concept inventory.
- [`perf/README.md`](perf/README.md): how performance is measured, and the results.
- `docs-llm/` (git-ignored): the source material, meaning the WICG explainer, its examples, and Chrome's documentation.

## Privacy

Progress, exercise drafts and the sound preference are stored in your browser's `localStorage` only. The production build includes cookieless Vercel Web Analytics and Speed Insights; both are disabled in development and do nothing when the site is served elsewhere.
