# Drawable

A darkroom adventure through **HTML-in-Canvas**: a 3D, story-driven, gamified
site that teaches the WICG proposal by using it. HTML elements are developed into
canvas prints that hang on a wire. Each print is a chapter with a story, a lab and
a trial.

The concept, story, chapter map, gamification and architecture are documented in
[`docs/CONCEPTS.md`](docs/CONCEPTS.md). Background research is in [`docs/research/`](docs/research/).

## Run it

```sh
pnpm install
pnpm dev        # http://localhost:5173 (the darkroom), /guide.html (the one-page guide)
pnpm test       # unit tests (vitest)
pnpm build      # typecheck + production build + bundle budget
pnpm perf:budget  # bundle budget only (after a build)
```

**The guide** (`guide.html`) puts every concept on one page, like a CSS-Tricks
complete guide: a 3D contact sheet of all 25 concepts, a scrollspy rail with
search (`/` to filter, `j`/`k` to step through concepts), and a live 3D figure
with controls for each concept. Every figure is a `content="drawable"` canvas
whose labels are real HTML drawn with `drawElementImage`. All figures share one
WebGL context and copy their pixels in with `drawImage`, so the page stays under
the browser's live-context limit.

Open it in **Chrome 157 or later** to see the real API: the prints are HTML drawn
into WebGL, and the labs fire real `paint` events. Other browsers get a faithful
simulation, and the HUD says which mode you're in.

| URL switch | Effect |
| --- | --- |
| `?sim` | Force the simulated fallback, even when the API exists |
| `?unlock=all` | Open every roll |
| `?reset` | Wipe saved progress |

## Where things live

| Path | Contents |
| --- | --- |
| `src/hic/` | Reusable HTML-in-Canvas helpers: typings, sizing, paint loop, WebGL element textures, 3D hit-test geometry |
| `src/world/` | The 3D darkroom (three.js) and the native/CSS3D surface backends |
| `src/game/` | Progress, silver, unlocks and stamps, as a pure reducer plus a persisted store |
| `src/story/` | The rolls (chapters) and the negatives (collectible cards) |
| `src/chapters/` | Chapter shell and the playable rolls |
| `src/ui/` | HUD, Album, toasts, dialogue |
| `src/guide/` | The one-page guide: content (`content.ts`), sections, contact sheet, rail, and its 3D figures (`figures/`) on a shared renderer (`stage/`) |
| `tests/` | Unit tests |
| `perf/` | Performance probe, method and results |
| `docs-llm/` | Source material: the official explainer, examples and Chrome docs (git-ignored) |
