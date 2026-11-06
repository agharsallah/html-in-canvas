import { inOrder, type Exercise } from '../shared/exercise';

const TRANSFER = /(\w+)\s*=\s*canvas\.transferControlToOffscreen\(\s*\)/;
const CAPTURE = /(\w+)\s*=\s*canvas\.captureElementImage\(\s*form\s*\)/;
const PAINT = /canvas\.(addEventListener\(\s*"paint"|onpaint\s*=)/;
const esc = (name: string) => name.replace(/[$]/g, '\\$');

/** `worker.postMessage({ key: name }, [name])` for the variable bound by `binding`. */
const postsWithTransfer = (binding: RegExp, key: string) => (code: string) => {
  const name = binding.exec(code)?.[1];
  if (!name) return false;
  const v = esc(name);
  return new RegExp(`worker\\.postMessage\\(\\s*\\{\\s*${key}\\s*:\\s*${v}\\s*\\}\\s*,\\s*\\[\\s*${v}\\s*\\]\\s*\\)`).test(code);
};

const RESET = /ctx\.reset\(\s*\)/;
const WORKER_DRAW = /ctx\.drawElementImage\(\s*e\.data\.form\s*,\s*100\s*,\s*0\s*\)/;
const INCLUDES_FORM = /(Array\.from\(\s*)?\w+\.elements\)?\.includes\(\s*form\s*\)/;
const READ_X = /form\.getBoundingClientRect\(\s*\)\.(x|left)/;

export const exercises: Exercise[] = [
  {
    id: 'railway-ship',
    title: 'Load the train',
    task: 'Hand the canvas to `worker`. Then, on every `paint`, capture `form` as an `ElementImage` and post it to the worker under the key `form`, handing it over rather than copying it.',
    language: 'js',
    starter: `const worker = new Worker('yard.js');
const canvas = document.querySelector('canvas');
const form = document.querySelector('form');

// 1. give the worker the canvas

// 2. on every paint, ship the form's snapshot
`,
    solution: `const worker = new Worker('yard.js');
const canvas = document.querySelector('canvas');
const form = document.querySelector('form');

const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

canvas.onpaint = () => {
  const formImg = canvas.captureElementImage(form);
  worker.postMessage({ form: formImg }, [formImg]);
};`,
    checks: [
      { label: 'Transfers control of the canvas to an OffscreenCanvas', test: TRANSFER },
      { label: 'Posts the OffscreenCanvas to the worker in the transfer list', test: postsWithTransfer(TRANSFER, 'canvas') },
      { label: 'Captures the form inside a paint handler', test: (code) => inOrder(code, PAINT, CAPTURE) },
      { label: 'Posts the captured image under "form", in the transfer list', test: postsWithTransfer(CAPTURE, 'form') },
    ],
    hints: [
      'Two lines hand over the canvas: one makes an `OffscreenCanvas`, one posts it. The second argument of `postMessage` is the transfer list.',
      '`canvas.transferControlToOffscreen()`, then inside `canvas.onpaint`: `canvas.captureElementImage(form)` and `worker.postMessage({ form: img }, [img])`.',
    ],
    seenIn: 'capture-element-image',
  },
  {
    id: 'railway-worker',
    title: 'Work the yard',
    task: 'In the worker: when a message carries a `canvas`, keep its 2D context in `ctx`. When a message carries a `form` image, clear the canvas and draw the image 100 pixels from the left, at the top.',
    language: 'js',
    starter: `let ctx;
self.onmessage = (e) => {
  // a canvas arrived: keep its 2D context

  // an image arrived: clear, then draw it at (100, 0)

};`,
    solution: `let ctx;
self.onmessage = (e) => {
  if (e.data.canvas) {
    ctx = e.data.canvas.getContext('2d');
  }
  if (e.data.form) {
    ctx.reset();
    ctx.drawElementImage(e.data.form, 100, 0);
  }
};`,
    checks: [
      { label: 'Keeps a 2D context only when a canvas arrived', test: /if\s*\(\s*e\.data\.canvas\s*\)\s*\{?\s*ctx\s*=\s*e\.data\.canvas\.getContext\(\s*"2d"\s*\)/ },
      { label: 'Draws only when an image arrived', test: /if\s*\(\s*e\.data\.form\s*\)/ },
      { label: 'Draws the posted ElementImage at (100, 0)', test: WORKER_DRAW },
      { label: 'Clears before drawing', test: (code) => inOrder(code, RESET, WORKER_DRAW) },
    ],
    hints: [
      'Two `if` blocks, one per kind of message. The worker’s context has the same `drawElementImage` as the main thread’s.',
      '`ctx = e.data.canvas.getContext("2d")`, and later `ctx.reset(); ctx.drawElementImage(e.data.form, 100, 0);`.',
    ],
    seenIn: 'worker-draw',
  },
  {
    id: 'railway-geometry',
    title: 'Geometry comes home',
    task: 'When the worker’s geometry updates have been applied, and only if `form` is among the updated elements, write the form’s new left edge (`getBoundingClientRect().x`) into `readout.textContent`.',
    language: 'js',
    starter: `const canvas = document.querySelector('canvas');
const form = document.querySelector('form');
const readout = document.querySelector('output');

// when the worker's geometry has been applied, update the readout
`,
    solution: `const canvas = document.querySelector('canvas');
const form = document.querySelector('form');
const readout = document.querySelector('output');

canvas.addEventListener('elementgeometryupdate', (event) => {
  if (event.elements.includes(form)) {
    readout.textContent = form.getBoundingClientRect().x;
  }
});`,
    checks: [
      { label: 'Listens for elementgeometryupdate on the canvas', test: /canvas\.(addEventListener\(\s*"elementgeometryupdate"|onelementgeometryupdate\s*=)/ },
      { label: 'Checks that form is in the event’s elements', test: INCLUDES_FORM },
      { label: 'Reads the form’s position only after that check', test: (code) => inOrder(code, INCLUDES_FORM, READ_X) },
      { label: 'Writes it into the readout', test: /readout\.textContent\s*=\s*form\.getBoundingClientRect\(\s*\)\.(x|left)/ },
    ],
    hints: [
      'The event fires on the canvas. Its `elements` list says who was updated.',
      '`canvas.addEventListener("elementgeometryupdate", (event) => { if (event.elements.includes(form)) { … } })`.',
    ],
    seenIn: 'geometry-update-event',
  },
];
