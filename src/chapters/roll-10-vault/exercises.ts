import { inOrder, type Exercise } from '../shared/exercise';

const DRAW_CARD = /ctx\.drawElementImage\(\s*card\s*,\s*0\s*,\s*0\s*\)/;
const PAINT = /canvas\.(addEventListener\(\s*"paint"|onpaint\s*=)/;

export const exercises: Exercise[] = [
  {
    id: 'vault-readback',
    title: 'Read it back',
    task: 'On every paint, clear the canvas and draw `card` at the top-left corner. Then read every pixel of the canvas into `pixels`. Read-back is allowed, because nothing sensitive was painted.',
    language: 'js',
    starter: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const card = document.querySelector('#card');
let pixels;

canvas.onpaint = () => {
  ctx.reset();
  // draw the card, then read the whole canvas back
};`,
    solution: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const card = document.querySelector('#card');
let pixels;

canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(card, 0, 0);
  pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
};`,
    checks: [
      { label: 'Redraws on the paint event', test: PAINT },
      { label: 'Draws the card at (0, 0)', test: DRAW_CARD },
      { label: 'Reads the whole canvas into pixels', test: /pixels\s*=\s*ctx\.getImageData\(\s*0\s*,\s*0\s*,\s*canvas\.width\s*,\s*canvas\.height\s*\)/ },
      { label: 'Reads after drawing', test: (code) => inOrder(code, DRAW_CARD, /getImageData\(/) },
    ],
    hints: [
      'Two lines inside the handler: one draws, one reads.',
      '`ctx.getImageData(x, y, width, height)` returns the pixels of a rectangle. Use the canvas’ own `width` and `height`.',
    ],
    seenIn: 'vault-read-back',
  },
  {
    id: 'vault-theme',
    title: 'Bring your own colours',
    task: 'The card uses system colours, which never reach a snapshot. Choose the colours yourself: when `(prefers-color-scheme: dark)` matches, use background `#111` and text `#eee`; otherwise `#fff` and `#111`. No system colour names may remain.',
    language: 'js',
    starter: `const card = document.querySelector('#card');

card.style.background = 'Canvas';
card.style.color = 'CanvasText';
canvas.requestPaint();`,
    solution: `const card = document.querySelector('#card');
const dark = matchMedia('(prefers-color-scheme: dark)').matches;

card.style.background = dark ? '#111' : '#fff';
card.style.color = dark ? '#eee' : '#111';
canvas.requestPaint();`,
    checks: [
      { label: 'No system colours (Canvas, CanvasText) are used', test: (code) => !/"Canvas(Text)?"/.test(code) },
      { label: 'Asks whether the user prefers a dark colour scheme', test: /matchMedia\(\s*"\(prefers-color-scheme: ?dark\)"\s*\)\.matches/ },
      { label: 'Picks #111 or #fff for the background', test: /card\.style\.background(Color)?\s*=\s*[^;]*"#111"[^;]*"#fff"|card\.style\.background(Color)?\s*=\s*[^;]*"#fff"[^;]*"#111"/ },
      { label: 'Picks #eee or #111 for the text', test: /card\.style\.color\s*=\s*[^;]*"#eee"[^;]*"#111"|card\.style\.color\s*=\s*[^;]*"#111"[^;]*"#eee"/ },
    ],
    hints: [
      'Script can already read the colour scheme with a media query, so colours you choose from it are safe to paint. The WebGPU jelly demo does the same.',
      '`const dark = matchMedia("(prefers-color-scheme: dark)").matches;` then a ternary for each style.',
    ],
    seenIn: 'vault-never-painted',
  },
  {
    id: 'vault-export',
    title: 'Send the print out',
    task: 'After drawing `card` in the paint handler, export the canvas as a PNG by handing the `save` function to the canvas’ blob export.',
    language: 'js',
    starter: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(card, 0, 0);
  // export the canvas as a PNG
};`,
    solution: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(card, 0, 0);
  canvas.toBlob(save, 'image/png');
};`,
    checks: [
      { label: 'Exports the canvas as a PNG blob', test: /canvas\.toBlob\(\s*save\s*,\s*"image\/png"\s*\)/ },
      { label: 'Exports after drawing', test: (code) => inOrder(code, DRAW_CARD, /toBlob\(/) },
    ],
    hints: [
      'Ordinary canvas export works because the snapshot is read-back-safe.',
      '`canvas.toBlob(callback, type)` calls `callback` with the encoded image.',
    ],
    seenIn: 'vault-media-export',
  },
];
