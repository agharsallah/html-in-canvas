import { optionsFigure, reverseOrderFigure } from '../../ui/charts/clockwork-figures';
import { pipelineFigure } from '../../ui/charts/figures';
import type { StoryLine } from '../shared/chapter';

const TIMING = 'README.md, Alternatives considered: paint event timing';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'Behind the darkroom wall ticks the clockwork heart. Every rendering update turns its gears once, always in the same order.',
  },
  {
    speaker: 'caret',
    text: 'Each gear is a step of “update the rendering”. The explainer lists the ones that matter for us.',
    concept: {
      id: 'clock-update-rendering',
      title: 'Update the rendering',
      kind: 'idea',
      what: 'The browser’s per-frame routine from the HTML spec: animation frame callbacks, style and layout, resize observers, intersection observations, Paint, then commit.',
      body: [
        'Step numbers here are as numbered in the explainer: 14 (rAF callbacks), 16.2.1 (styles and layout), 16.2.6 (resize observers, looping back to 16.2.1 if needed), 19 (intersection observations).',
        'Paint and Commit are not explicitly named steps in the spec, but the explainer uses them as landmarks.',
      ],
      source: `${TIMING}`,
    },
  },
  {
    speaker: 'caret',
    text: 'Mind the two paints. Capital-P Paint is the browser recording what things look like. The `paint` event is the new bell on your canvas.',
    concept: {
      id: 'clock-two-paints',
      title: 'Paint vs the `paint` event',
      kind: 'rule',
      what: 'Paint is the existing step that records the painted output in paint order; `paint` is the new canvas event that lets you redraw.',
      source: TIMING,
    },
  },
  {
    speaker: 'caret',
    text: 'The bell is wired just after Paint, once per update. Before it rings the whole update is locked in, except one carve-out: what you draw on the canvas.',
    concept: {
      id: 'clock-option-c',
      title: 'Option C: after Paint, once',
      kind: 'rule',
      what: 'The selected design: `paint` fires immediately after Paint, once per rendering update, so canvas drawing lands now and DOM edits land next update.',
      figure: pipelineFigure,
      body: [
        'Before `paint` runs, the contents of the rendering update are locked in, except the drawn content of the canvas.',
        'DOM invalidations made inside `paint` apply to the subsequent rendering update, not the current one.',
        'It fires just after the intersection observer steps.',
      ],
      code: "canvas.onpaint = () => {\n  ctx.reset();\n  ctx.drawElementImage(card, 0, 0); // this update\n  card.style.background = 'gold'; // next update\n};",
      source: `${TIMING}, Option C; README.md, 3. The paint event`,
    },
  },
  {
    speaker: 'foe',
    text: 'So late? Ring it earlier, at resize observer time. Let the handler touch anything, and loop until the page settles. I love a good loop.',
  },
  {
    speaker: 'caret',
    text: 'That is Option A. Nothing stops script from editing the DOM, so it must loop for many more reasons than ResizeObserver does, and your canvas code may run several times per update.',
    concept: {
      id: 'clock-option-a',
      title: 'Option A (rejected)',
      kind: 'idea',
      what: 'Fire `paint` at resize observer timing and loop back to 16.2.1 whenever the handler modifies anything, including elements outside the canvas.',
      figure: optionsFigure,
      body: [
        'Looping would be needed for more conditions than ResizeObserver needs, such as background style changes.',
        'At that point Paint has not run yet. One way out is a synchronous Paint of drawable elements, which may be expensive, may run several times, and has unique implementation challenges in Gecko and possibly other engines.',
      ],
      source: `${TIMING}, Option A`,
    },
  },
  {
    speaker: 'caret',
    text: 'The other way out was placeholders: draw a stand-in now, fill it at the next Paint. 2D could limp along with stale `getImageData`. WebGL cannot.',
    concept: {
      id: 'clock-webgl-flush',
      title: 'Why WebGL rules out placeholders',
      kind: 'rule',
      what: 'Many WebGL calls, such as `getError()`, must flush the command buffer, so with placeholders they would deadlock or render inconsistently.',
      body: [
        'Placeholders work for 2D by buffering canvas commands until the next Paint, but `getImageData` would then show blank or stale data.',
        'So `paint` must run when the complete painted display list of each element is already available.',
      ],
      source: `${TIMING}, Option A`,
    },
  },
  {
    speaker: 'foe',
    text: 'Fine. Ring it after Paint, then, and loop anyway.',
  },
  {
    speaker: 'caret',
    text: 'Option B. No partial Paint needed, but every lap re-runs even more of the clockwork. Option C won: one ring, no loops.',
    concept: {
      id: 'clock-option-b',
      title: 'Option B (rejected)',
      kind: 'idea',
      what: 'Fire `paint` right after Paint and loop back to 16.2.1 on modifications: no partial Paint, but even more steps re-run on each lap.',
      body: ['It keeps every downside of looping that Option A has.'],
      source: `${TIMING}, Option B`,
    },
  },
  {
    speaker: 'caret',
    text: 'Notice where resize observers sit: before Paint. Resize the canvas grid there and ask for a paint, and the bell of the same update sees the new size.',
    concept: {
      id: 'clock-resize-first',
      title: 'Resize observers come first',
      kind: 'rule',
      what: 'In the explainer’s list, resize observers (16.2.6) run before Paint and the `paint` event, so a grid resized there is ready when `paint` fires.',
      body: ['This is our reading of the step list, not a separate rule. The README examples size the canvas grid in a `ResizeObserver`, and its OffscreenCanvas example calls `requestPaint()` from there.'],
      code: "new ResizeObserver(([entry]) => {\n  canvas.width = entry.devicePixelContentBoxSize[0].inlineSize;\n  canvas.height = entry.devicePixelContentBoxSize[0].blockSize;\n  canvas.requestPaint();\n}).observe(canvas, { box: 'device-pixel-content-box' });",
      source: `${TIMING}; README.md, Basic Example and OffscreenCanvas Example`,
    },
  },
  {
    speaker: 'caret',
    text: 'When several canvases ring in one update, the innermost goes first, and child frames go before their parent documents.',
    concept: {
      id: 'clock-reverse-order',
      title: 'Reverse order, inside out',
      kind: 'rule',
      what: '`paint` fires in reverse document order (child frames before parents) and in reverse tree order within a document, so descendants paint before ancestors.',
      figure: reverseOrderFigure,
      body: ['A nested canvas redraws first, so its parent canvas composites fresh pixels when it draws the wrapper that contains it.'],
      source: 'README.md, 3. The paint event; Chrome docs, concepts.md (Nested canvases)',
    },
  },
  {
    speaker: 'caret',
    text: 'One road was not taken: shipping snapshots to a worker so it could redraw during threaded scrolling and animation.',
    concept: {
      id: 'clock-worker-road',
      title: 'The worker road not taken',
      kind: 'idea',
      what: 'A rejected design sent drawable snapshots to a worker to redraw on threaded scroll and animation updates; it needed synchronous script on those updates.',
      body: ['That is difficult for architectures that perform threaded scroll updates in a restricted process. Workers can still draw snapshots you post them (Roll 08).'],
      source: 'README.md, Alternatives considered: Supporting threaded effects with worker threads',
    },
  },
  {
    speaker: 'caret',
    text: 'Wind the clock in the lab. Make the Deadlock jam the gears, then watch Option C tick clean.',
  },
];
