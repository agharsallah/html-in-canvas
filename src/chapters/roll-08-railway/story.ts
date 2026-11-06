import { railRoundTripFigure } from '../../ui/charts/rail-figures';
import type { StoryLine } from '../shared/chapter';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'Behind the darkroom runs a narrow railway. At one end stands the main thread, where the DOM lives. At the other, the worker yard, where nobody can touch the DOM.',
  },
  {
    speaker: 'caret',
    text: 'A worker can draw for us, but first it needs paper. We hand it the canvas itself.',
    concept: {
      id: 'transfer-offscreen',
      title: '`canvas.transferControlToOffscreen()`',
      kind: 'method',
      what: 'Turns a `<canvas>` into an `OffscreenCanvas` you can post to a worker, which then draws for it.',
      body: [
        'The explainer’s worker example creates the worker, transfers control of the drawable canvas, and posts the `OffscreenCanvas` in the transfer list.',
        'The worker later sizes the grid from values the main thread posts from a `ResizeObserver`, then the main thread calls `requestPaint()`.',
      ],
      code: "const offscreen = canvas.transferControlToOffscreen();\nworker.postMessage({ canvas: offscreen }, [offscreen]);",
      source: 'README.md, OffscreenCanvas Example',
    },
  },
  {
    speaker: 'caret',
    text: 'The worker can’t hear the bell, though. `paint` only rings on the main thread.',
    concept: {
      id: 'paint-main-only',
      title: '`paint` stays on the main thread',
      kind: 'rule',
      what: '`CanvasPaintEvent` is exposed on `Window` only, so a worker never receives `paint`: the main thread listens and ships the snapshots.',
      body: ['On worker threads there is no synchronous access to DOM APIs.'],
      source: 'README.md, IDL (CanvasPaintEvent); 5. Synchronizing the DOM and drawing',
    },
  },
  {
    speaker: 'caret',
    text: 'So the main thread does the capturing. Inside `paint`, ask for the element’s latest snapshot as an object you can ship.',
    concept: {
      id: 'capture-element-image',
      title: '`canvas.captureElementImage(element)`',
      kind: 'method',
      what: 'Returns an `ElementImage`: a reference to the most recent snapshot of a drawable element.',
      body: [
        'Every drawing and geometry method that takes an element also accepts an `ElementImage`: `drawElementImage`, `texElementSubImage2D`, `drawElementImageToTexture`, `updateElementGeometry`, `clearElementGeometry` and `getElementImageDefaultSize`.',
      ],
      code: 'canvas.onpaint = () => {\n  const formImg = canvas.captureElementImage(form);\n  // …ship it\n};',
      source: 'README.md, 4. drawElementImage; IDL',
    },
  },
  {
    speaker: 'caret',
    text: 'Load it on the train. Post it to the worker and list it in the transfer list.',
    concept: {
      id: 'element-image-transfer',
      title: 'Transferable `ElementImage`',
      kind: 'idea',
      what: '`ElementImage` is `Transferable` and exposed in both windows and workers, so it can travel to a worker in `postMessage`.',
      body: ['Listing it in the transfer list hands it over instead of copying it, as with any transferable object.'],
      code: 'worker.postMessage({ form: formImg }, [formImg]);',
      source: 'README.md, IDL (ElementImage); OffscreenCanvas Example',
    },
  },
  {
    speaker: 'caret',
    text: 'At the yard, the worker’s 2D context draws the image exactly like an element.',
    concept: {
      id: 'worker-draw',
      title: 'Drawing in a worker',
      kind: 'method',
      what: '`OffscreenCanvasRenderingContext2D` has `drawElementImage` too; in a worker you pass it the `ElementImage` you received.',
      code: "self.onmessage = (e) => {\n  if (e.data.canvas) ctx = e.data.canvas.getContext('2d');\n  if (e.data.form) {\n    ctx.reset();\n    ctx.drawElementImage(e.data.form, 100, 0);\n  }\n};",
      source: 'README.md, IDL (OffscreenCanvasRenderingContext2D); OffscreenCanvas Example',
    },
  },
  {
    speaker: 'foe',
    text: 'Toot toot! I am the Late Train. Every crate I carry was photographed frames ago, and I never empty my wagons.',
  },
  {
    speaker: 'caret',
    text: 'He hoards cargo. An `ElementImage` has a `close()` method. The explainer doesn’t say what it frees, so we treat closing as tidying up the yard.',
    concept: {
      id: 'element-image-close',
      title: '`elementImage.close()`',
      kind: 'method',
      what: '`ElementImage` has one method, `close()`, which returns nothing.',
      body: [
        'The explainer lists `close()` in the IDL but does not describe what it does, or what happens if you draw a closed image.',
        'Our reading, by analogy with other closable images: call it once you no longer need the image, and never use the image afterwards. That is a habit, not spec text.',
      ],
      code: 'ctx.drawElementImage(img, 100, 0);\nimg.close(); // done with it',
      source: 'README.md, IDL (ElementImage)',
    },
  },
  {
    speaker: 'caret',
    text: 'Now the way home. Drawing moves the form on the canvas, so its DOM geometry must follow. A worker can’t touch elements, so it works through the image.',
    concept: {
      id: 'worker-geometry',
      title: 'Geometry from a worker',
      kind: 'rule',
      what: '`OffscreenCanvas` has `updateElementGeometry`, `clearElementGeometry` and `getElementImageDefaultSize`; called from a worker, they take an `ElementImage`, never an element.',
      body: [
        'A 2D `drawElementImage` updates the element’s geometry automatically, unless you pass `{ preserveElementGeometry: true }`. That is why the explainer’s worker only draws, and the form still ends up 100px to the right.',
      ],
      source: 'README.md, IDL (OffscreenCanvas); 5. Synchronizing the DOM and drawing',
    },
  },
  {
    speaker: 'caret',
    text: 'Those updates don’t trickle home one by one. They are batched and applied in one go, like an observer.',
    concept: {
      id: 'geometry-batch',
      title: 'Batched geometry updates',
      kind: 'idea',
      what: 'Geometry updates for an `OffscreenCanvas` join a pending queue; a microtask batches them, and from a worker that batch is posted to the main thread as a task.',
      body: [
        'Main-thread `OffscreenCanvas` updates are batched by a microtask too.',
        'When the updates complete on the main thread, the elements apply their geometry synchronously, atomically, with no other task in between.',
      ],
      figure: railRoundTripFigure,
      source: 'README.md, 5. Synchronizing the DOM and drawing',
    },
  },
  {
    speaker: 'caret',
    text: 'When the batch lands, the canvas announces it.',
    concept: {
      id: 'geometry-update-event',
      title: '`elementgeometryupdate`',
      kind: 'event',
      what: 'Fires on the `HTMLCanvasElement` once batched `OffscreenCanvas` geometry updates are applied; `event.elements` lists the updated elements.',
      body: ['An element that no longer exists when the event fires is left out of the list. The event class is `ElementGeometryUpdateEvent`.'],
      code: "canvas.onelementgeometryupdate = (event) => {\n  if (event.elements.includes(form)) {\n    // form.getBoundingClientRect() now includes the x of 100\n  }\n};",
      source: 'README.md, IDL; 5. Synchronizing the DOM and drawing; OffscreenCanvas Example',
    },
  },
  {
    speaker: 'caret',
    text: 'Until it fires, the DOM still holds the old geometry. And the worker always draws a snapshot from a paint that has already passed. Plan for the delay.',
    concept: {
      id: 'stale-snapshot',
      title: 'Snapshots in transit',
      kind: 'idea',
      what: 'An `ElementImage` is the snapshot from the paint that captured it; a busy worker draws it later, and the DOM only learns the new geometry when `elementgeometryupdate` fires.',
      body: [
        'How late is up to you: how often you capture, how long the worker takes, and whether it draws every image or only the newest. The lab measures it.',
      ],
      source: 'README.md, 4. drawElementImage; 5. Synchronizing the DOM and drawing (timing model: ours)',
    },
  },
  {
    speaker: 'narrator',
    text: 'The signal turns green. Time to run the railway, and make the Late Train keep time.',
  },
];
