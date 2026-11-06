# Performance

How we measure, what we changed, and the numbers before and after.

## Method

All numbers come from the **production build** (`pnpm build && pnpm preview`) in
Chrome 157 with the native HTML-in-Canvas API, at **4× CPU throttling**, 1440×900
at DPR 2, on a 120 Hz display. Throttling exaggerates main-thread cost the way
a mid-range laptop or phone would feel it.

- **Runtime**: [`probe.js`](probe.js). Paste it into DevTools or run it with
  `evaluate_script`. It lets the page settle for 2.5 s, then samples for 5 s:
  - *idle %*: share of the main thread left over, from `requestIdleCallback`.
    This is the headline number: headroom for input and everything else.
  - *p95 frame*: the 95th-percentile interval between frames.
  - *long frames*: Long Animation Frame entries (frames of 50 ms or more), and their blocking time.
  - *DOM mutations/s*, *JS heap*.
  Noise between runs is about ±3 points of idle % for the same page.
- **Load**: boot marks (`drawable:*` in DevTools > Performance > Timings, from
  `src/core/perf.ts`) plus LCP from a `PerformanceObserver`, cold cache.
- **Bundle**: `pnpm perf:budget`, which also runs as part of `pnpm build`.
  Gzip budgets per chunk; the build fails when one is exceeded.
- **Render rate**: count `paint` events on `#world` for a few seconds.

## Results

| Page (4× CPU) | Idle % before | Idle % after | p95 frame before → after | Heap before → after | DOM mutations/s before → after |
| --- | --- | --- | --- | --- | --- |
| Hub, active | 70.1 | ~77 (75.5–78.9) | 9.2 → 9.3 ms | 26 → 21 MB | 0 → 0 |
| Hub, idle 8 s+ | 70.1 | **84.2** | 9.2 → 9.2 ms | 26 → 25 MB | 0 → 0 |
| Prologue story (3D Smudge) | **0.0** | **81.1** | **17.4 → 9.2 ms** | **115 → 24 MB** | 0 → 0 |
| Fog lab (3D fog + lab canvas) | 48.2 | 84.3 | 9.3 → 9.3 ms | 52 → 26 MB | 0 → 0 |
| Bell lab (3D bell + timeline) | 12.2 | **86.7** | 9.2 → 9.3 ms | 28 → 25 MB | **239 → 2** |

Long animation frames: 3 (33 ms blocking) on the prologue before, 0 everywhere after.

| Load (hub, cold) | Before | After |
| --- | --- | --- |
| LCP | 460 ms (830 ms in a traced run) | **268–288 ms** |
| First frame | 430 ms | 333–373 ms |
| Prints uploaded in frame one | 13 (≈32 MB of pixels) | 2–3 |
| Entry JS (gzip) | 167 kB | 161.7 kB |

| Render rate (hub) | Before | After |
| --- | --- | --- |
| `paint` events/s, active | 120 (display rate) | **60** |
| `paint` events/s, idle | 120 | **31** |
| `paint` events/s, chapter open | 120 | **0** |
| Point lights shading the wall | 13 | **4** |

## What changed, biggest win first

1. **Stop drawing what nobody can see.** An open chapter covers the darkroom
   completely, but the hub kept rendering behind it. The world loop now
   stops while a chapter is open, and snapshots are invalidated on return.
   (`app.ts`, `chapter-controller.ts`)
2. **Cap the frame rate, and throttle `requestPaint()` itself.** Drawing at
   60 fps (30 when idle for 8 s) instead of the display's 120. In native
   mode, skipping our draw is not enough: every `requestPaint()` forces a
   rendering update and a `paint` event, so the next request is timed to the
   next allowed frame. Skipped paints still deliver their `changedElements`
   later. (`hic/paint.ts`, covered by `tests/frame-driver.test.ts`)
3. **Upload only what is on screen.** Prints are projected once per frame;
   only visible ones upload snapshots or sync DOM geometry. Off-screen prints
   get an empty hit-test clip once, then cost nothing until they scroll in.
   (`world/surfaces/native-surfaces.ts`)
4. **Render on demand in 3D scenes.** A scene's frame callback returns
   `false` when nothing moved; with no pointer move or resize, the GPU draw
   is skipped. The bell rests between rings; the Smudge stops recomputing
   680 instances once its letters have formed and runs its chaos at 30 fps.
   (`scenes/mini-stage.ts`)
5. **Live chart on a canvas.** The paint timeline rebuilt 180 SVG rects
   every frame; it now draws to a 2D canvas, freezes when quiet, and only
   writes its status label when the text changes. (`ui/charts/paint-timeline.ts`)
6. **Cheap ambient visuals.** Fog, mosaic and bell rings run on a throttled
   loop (8–20 fps) at CSS-pixel resolution; the mosaic writes an ImageData
   buffer instead of parsing 1,296 colour strings; bell rings no longer
   animate SVG `r`. (`ui/fx/loop.ts`, chapter `backdrop.ts` files)
7. **Fewer lights.** Thirteen point lights became a rig of four that travels
   with the camera; flat props use Lambert instead of PBR. GPU-side: lighting
   cost scales with lights × lit pixels, and the wall fills the screen.
8. **Faster first frame.** Shaders compile asynchronously (`compileAsync`)
   before the loop starts; the CSS3D fallback is fetched only by browsers
   that need it; allocation-free projection maths; one cached
   `prefers-reduced-motion` query instead of a new one per frame.

## The opening shot

The developer tray (live HTML under a rippling liquid shader) was added after the numbers above.
At 4× CPU on the tray view: **72% idle, p95 frame 10.1 ms, 0 long frames**. Cold LCP is 388 ms
(+~100 ms over the plain hub), from compiling the liquid shader and the first hero upload.
Only the hero card is uploaded on that first frame, because the prints on the line are off screen.
The liquid samples 8 ripples × 3 heights per pixel, a fixed cost bounded by the tray's screen area.

## Known limits

- The entry bundle is dominated by three.js (≈150 kB gz); its WebGL renderer
  doesn't tree-shake much further. It is cached across visits.
- GPU time is reasoned about, not measured: Chrome doesn't expose
  `EXT_disjoint_timer_query` to pages. The light-rig change is justified by
  shading cost, not by a number here.
- The probe's own `requestAnimationFrame` keeps the display at 120 Hz, so
  *fps* in its output is the display rate, not our render rate. Use the
  `paint` event count for that.
