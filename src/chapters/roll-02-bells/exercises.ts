import { inOrder, type Exercise } from '../shared/exercise';

const RESET = /ctx\.reset\(\s*\)/;
const DRAW_FORM = /ctx\.drawElementImage\(\s*form\s*,\s*100\s*,\s*0\s*\)/;

export const exercises: Exercise[] = [
  {
    id: 'bells-handler',
    title: 'Answer the bell',
    task: 'Listen for the canvas’ `paint` event. Each time it fires, clear the canvas and draw `form` 100 pixels from the left, at the top.',
    language: 'js',
    starter: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const form = document.querySelector('form');

// redraw the form on every paint
`,
    solution: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const form = document.querySelector('form');

canvas.addEventListener('paint', () => {
  ctx.reset();
  ctx.drawElementImage(form, 100, 0);
});`,
    checks: [
      { label: 'Listens for the paint event on the canvas', test: /canvas\.(addEventListener\(\s*"paint"|onpaint\s*=)/ },
      { label: 'Clears the canvas', test: RESET },
      { label: 'Draws the form at (100, 0)', test: DRAW_FORM },
      { label: 'Clears before drawing', test: (code) => inOrder(code, RESET, DRAW_FORM) },
    ],
    hints: [
      'Either `canvas.addEventListener("paint", …)` or `canvas.onpaint = …` works.',
      'Inside the handler: `ctx.reset()`, then `ctx.drawElementImage(element, x, y)`.',
    ],
    seenIn: 'paint-event',
  },
  {
    id: 'bells-loop',
    title: 'Keep it ringing',
    task: 'The sparkles must move every frame, even when the poem does not change. Ask for the next paint at the end of each paint and, as the demos do, request an initial paint after setting the handler.',
    language: 'js',
    starter: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(poem, 0, 0);
  drawSparkles();
  // keep the loop going

};
// start the loop
`,
    solution: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(poem, 0, 0);
  drawSparkles();
  canvas.requestPaint();
};
canvas.requestPaint();`,
    checks: [
      { label: 'Asks for the next paint inside the handler', test: /onpaint\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*canvas\.requestPaint\(\s*\)[^}]*\}/ },
      { label: 'Starts the loop with one request after the handler', test: /\}\s*;?\s*canvas\.requestPaint\(\s*\)/ },
    ],
    hints: [
      'It is the same one-line call in both places.',
      '`canvas.requestPaint()` fires `paint` once at the next update. Calling it inside the handler keeps the loop alive.',
    ],
    seenIn: 'request-paint',
  },
  {
    id: 'bells-changed',
    title: 'Only what changed',
    task: 'Uploading a texture is expensive. Only call `updateTexture` when `choice` is in this paint’s list of changed elements. Keep calling `render()` every time.',
    language: 'js',
    starter: `canvas.onpaint = (event) => {
  updateTexture(gl, texture, choice);
  render();
};`,
    solution: `canvas.onpaint = (event) => {
  if (event.changedElements.includes(choice)) {
    updateTexture(gl, texture, choice);
  }
  render();
};`,
    checks: [
      { label: 'Checks whether choice is in event.changedElements', test: /event\.changedElements\)?\.includes\(\s*choice\s*\)/ },
      { label: 'Uploads the texture only inside that check', test: /if\s*\(\s*(Array\.from\(\s*)?event\.changedElements\)?\.includes\(\s*choice\s*\)\s*\)\s*\{?\s*updateTexture\(/ },
      { label: 'Still renders on every paint', test: /\}?\s*render\(\s*\)\s*;?\s*\}\s*;?\s*$/ },
    ],
    hints: [
      'Wrap the upload in an `if`. Leave `render()` outside it.',
      '`event.changedElements` is an array-like list. `.includes(choice)` tells you if `choice` changed.',
    ],
    seenIn: 'changed-elements',
  },
  {
    id: 'bells-coexist',
    title: 'Two bell ringers',
    task: 'Your scene and a charting library both redraw on `paint`, but only the second handler ever runs. Register both as listeners so neither replaces the other.',
    language: 'js',
    starter: `canvas.onpaint = drawScene;
canvas.onpaint = drawChart;`,
    solution: `canvas.addEventListener('paint', drawScene);
canvas.addEventListener('paint', drawChart);`,
    checks: [
      { label: 'drawScene listens for paint', test: /canvas\.addEventListener\(\s*"paint"\s*,\s*drawScene\s*\)/ },
      { label: 'drawChart listens for paint', test: /canvas\.addEventListener\(\s*"paint"\s*,\s*drawChart\s*\)/ },
      { label: 'No longer assigns canvas.onpaint', test: (code) => !/canvas\.onpaint\s*=/.test(code) },
    ],
    hints: [
      '`onpaint` is a single slot: the second assignment throws the first handler away.',
      'Use `canvas.addEventListener("paint", handler)` once per handler.',
    ],
    seenIn: 'onpaint-slot',
  },
];
