import type { StoryLine } from '../shared/chapter';
import { primitivesFigure, replayFigure } from './figures';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'The last roll has no end. It loops through the projector, every frame you developed shimmering like foil.',
  },
  {
    speaker: 'caret',
    text: 'Look how far we came. Five primitives, and you have used every one.',
    concept: {
      id: 'epilogue-recap',
      title: 'Five primitives',
      kind: 'idea',
      what: 'HTML-in-Canvas is five pieces: the `content` attribute, the `drawable` attribute, the `paint` event, `drawElementImage` with its WebGL and WebGPU siblings, and `updateElementGeometry` to sync the DOM.',
      figure: primitivesFigure,
      body: [
        'Layout and drawing: `content="drawable"` and `drawable`. Rendering events: `paint` and `requestPaint()`. Drawing: `drawElementImage`, `texElementSubImage2D`, `drawElementImageToTexture`, plus `captureElementImage` for workers. Canvas-to-DOM sync: `updateElementGeometry`.',
        'Around them: snapshots that never leak secrets, and content that stays in the accessibility tree.',
      ],
      source: 'README.md, Proposed solution',
    },
  },
  {
    speaker: 'foe',
    text: 'I am the future. I am not written yet. And your canvas cannot keep up with a page that scrolls on another thread.',
  },
  {
    speaker: 'caret',
    text: 'Not yet. But the authors are considering a canvas that keeps up without waiting for script.',
    concept: {
      id: 'epilogue-auto-updating',
      title: 'Auto-updating canvas',
      kind: 'idea',
      what: 'A future mode being considered: `drawElementImage` records a placeholder for the latest rendering, and the canvas replays its retained commands after every scroll or animation update.',
      figure: replayFigure,
      body: [
        'The canvas re-rasterizes with placeholders that already include threaded scrolling and animation, without blocking on script.',
        'The README calls it viable for 2D contexts, and possibly for WebGPU with small API additions. It is a consideration, not a shipped feature.',
      ],
      source: 'README.md, Future considerations: auto-updating canvas',
    },
  },
  {
    speaker: 'caret',
    text: 'That is the prize: effects that move with native scrolling, independent of the main thread.',
    concept: {
      id: 'epilogue-threaded',
      title: 'Threaded effects',
      kind: 'idea',
      what: 'Visual effects inside a canvas that stay perfectly in sync with native scrolling and animations, even when the main thread is busy.',
      body: ['Browsers run scrolling and some animations off the main thread. Canvas drawing in `paint` is script on the main thread, so the auto-updating mode is how the proposal hopes to close the gap.'],
      source: 'README.md, Future considerations',
    },
  },
  {
    speaker: 'caret',
    text: 'They tried another road first. Ship the snapshots to a worker and let it redraw on every scroll.',
    concept: {
      id: 'epilogue-worker-design',
      title: 'The road not taken',
      kind: 'idea',
      what: 'A rejected design sent drawable snapshots to a worker, which would redraw them into an `OffscreenCanvas` in response to threaded scrolling and animations.',
      body: ['It needs script to run synchronously on scroll and animation updates, which is difficult for architectures that perform threaded scroll updates in a restricted process.'],
      source: 'README.md, Alternatives considered: worker threads',
    },
  },
  {
    speaker: 'foe',
    text: 'And the browsers that never learned your trick? They will see blank paper.',
  },
  {
    speaker: 'caret',
    text: 'Only if you forget to ask. Detect first, the way the Chrome docs do, and probe the exact method each context will call.',
    concept: {
      id: 'epilogue-detect',
      title: 'Feature detection',
      kind: 'method',
      what: 'Set `content="drawable"` on a fresh canvas and check that the property reflects it; then check the method your context needs before calling it.',
      code: "export function supportsHtmlInCanvas() {\n  if (typeof document === 'undefined') return false;\n  const canvas = document.createElement('canvas');\n  canvas.setAttribute('content', 'drawable');\n  return canvas.content === 'drawable';\n}",
      body: [
        'The official demos probe per call too: the WebGL card checks `canvas.updateElementGeometry !== undefined` before using it, and falls back to an older approach otherwise.',
        'This site does the same per context: `drawElementImage` for 2D, `texElementSubImage2D` for WebGL, `drawElementImageToTexture` for WebGPU.',
      ],
      source: 'Chrome docs, concepts.md (Fallback strategies); Examples/webGL.html',
    },
  },
  {
    speaker: 'caret',
    text: 'And when the answer is no, take the escape hatch.',
    concept: {
      id: 'epilogue-escape-hatch',
      title: 'The escape hatch',
      kind: 'rule',
      what: 'Without support, fall back to an alternative UI, floating HTML overlays, the three-html-render library, html2canvas, or dom-to-image, depending on your goal.',
      body: [
        'The API shipped in Chrome 157 and might not be supported in all browsers.',
        'Pick by need: overlays keep real, interactive DOM; html2canvas and dom-to-image make pictures of DOM; this site itself falls back to CSS 3D transforms for its darkroom.',
      ],
      source: 'Chrome docs, concepts.md (Fallback strategies)',
    },
  },
  {
    speaker: 'caret',
    text: 'You will not always write the plumbing yourself. Libraries are joining in.',
    concept: {
      id: 'epilogue-libraries',
      title: 'Library support',
      kind: 'idea',
      what: 'three.js, PlayCanvas, Babylon.js, PixiJS and CanvasUI have added experimental HTML-in-Canvas support.',
      body: [
        'three.js: `new THREE.HTMLTexture(uiElement)`. Babylon.js: `new BABYLON.HtmlTexture(name, uiElement, scene)`. PlayCanvas: `htmlTexture.setSource(el)` in a one-time `paint` listener, then `canvas.requestPaint()`.',
        'PixiJS shipped `HTMLSource` from `pixi.js/html-source` in v8.19.0; the element is appended as a direct child of the Pixi canvas. Its snippet passes two arguments to `getElementTransform`, while the README’s IDL takes one. CanvasUI is an open source component library built on the API.',
      ],
      code: "const sprite = Sprite.from(\n  new HTMLSource({ resource: form, autoUpdate: true }),\n);",
      source: 'Chrome docs, index.md (Library and framework support)',
    },
  },
  {
    speaker: 'caret',
    text: 'The explainer itself is still being written, and you can help write it.',
    concept: {
      id: 'epilogue-status',
      title: 'Status and community',
      kind: 'idea',
      what: 'The README is a living explainer, continuously updated from feedback; feedback goes to the WICG GitHub issue tracker.',
      body: [
        'Authors: Philip Rogers, Stephen Chenney, Chris Harrelson, Philip Jägenstedt, Stefan Zager, Khushal Sagar, Vladimir Levin and Fernando Serboncini.',
        'Chrome’s docs link a community demo collection, and “Modern Web Guidance” packages implementation instructions for coding agents.',
      ],
      source: 'README.md, Status; Authors. Chrome docs, index.md',
    },
  },
  {
    speaker: 'caret',
    text: 'One more pass through every roll, then your exhibition opens. The reel goes on.',
  },
];
