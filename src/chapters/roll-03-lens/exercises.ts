import { inOrder, type Exercise } from '../shared/exercise';

const RESET = /ctx\.reset\(\s*\)/;
const DRAW_CENTERED = /ctx\.drawElementImage\(\s*card\s*,\s*x\s*,\s*y\s*\)/;

export const exercises: Exercise[] = [
  {
    id: 'lens-observer',
    title: 'Grind to device pixels',
    task: 'Keep the canvas grid equal to the device pixels it covers. Use the device-pixel box when the observer reports it, otherwise round the CSS content size times `devicePixelRatio`. Observe the right box.',
    language: 'js',
    starter: `const observer = new ResizeObserver(([entry]) => {
  const dpc = entry.devicePixelContentBoxSize;
  canvas.width = 300;
  canvas.height = 150;
});
observer.observe(canvas);`,
    solution: `const observer = new ResizeObserver(([entry]) => {
  const dpc = entry.devicePixelContentBoxSize;
  canvas.width = dpc ? dpc[0].inlineSize : Math.round(entry.contentRect.width * devicePixelRatio);
  canvas.height = dpc ? dpc[0].blockSize : Math.round(entry.contentRect.height * devicePixelRatio);
});
observer.observe(canvas, { box: 'device-pixel-content-box' });`,
    checks: [
      { label: 'The grid width comes from the device-pixel box’s inline size', test: /canvas\.width\s*=[^;]*dpc\[0\]\.inlineSize/ },
      { label: 'The grid height comes from its block size', test: /canvas\.height\s*=[^;]*dpc\[0\]\.blockSize/ },
      { label: 'Falls back to the rounded CSS size × devicePixelRatio', test: /Math\.round\(\s*entry\.contentRect\.width\s*\*\s*(window\.)?devicePixelRatio\s*\)/ },
      { label: 'Observes the device-pixel-content-box', test: /observer\.observe\(\s*canvas\s*,\s*\{\s*box\s*:\s*"device-pixel-content-box"\s*\}\s*\)/ },
    ],
    hints: [
      '`dpc` is undefined where the box is not supported. A `dpc ? … : …` expression picks the right source.',
      'Width: `dpc[0].inlineSize`, or `Math.round(entry.contentRect.width * devicePixelRatio)`. Then pass `{ box: "device-pixel-content-box" }` to `observe`.',
    ],
    seenIn: 'dpcb-observer',
  },
  {
    id: 'lens-center',
    title: 'Dead centre',
    task: 'Centre `card` on the canvas in every paint. The card’s size comes from the DOM, so convert it to canvas grid px with `scaleX` and `scaleY` before using it.',
    language: 'js',
    starter: `canvas.onpaint = () => {
  ctx.reset();
  const x = (canvas.width - card.offsetWidth) / 2;
  const y = (canvas.height - card.offsetHeight) / 2;
  ctx.drawElementImage(card, x, y);
};`,
    solution: `canvas.onpaint = () => {
  ctx.reset();
  const width = card.offsetWidth * scaleX;
  const height = card.offsetHeight * scaleY;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;
  ctx.drawElementImage(card, x, y);
};`,
    checks: [
      { label: 'Converts the card’s width to grid px', test: /card\.offsetWidth\s*\*\s*scaleX|scaleX\s*\*\s*card\.offsetWidth/ },
      { label: 'Converts the card’s height to grid px', test: /card\.offsetHeight\s*\*\s*scaleY|scaleY\s*\*\s*card\.offsetHeight/ },
      { label: 'No raw offsetWidth is subtracted from the grid width', test: (code) => !/canvas\.width\s*-\s*card\.offset/.test(code) },
      { label: 'Draws the card at (x, y) after clearing', test: (code) => inOrder(code, RESET, DRAW_CENTERED) },
    ],
    hints: [
      '`offsetWidth` is CSS px and `canvas.width` is grid px. Convert one before mixing them.',
      '`const width = card.offsetWidth * scaleX;` then `const x = (canvas.width - width) / 2;`. Do the same for the height.',
    ],
    seenIn: 'scale-factors',
  },
  {
    id: 'lens-border-box',
    title: 'Draw what you set',
    task: 'This card should be drawn exactly 200 CSS px wide, but its padding makes the drawn box wider. Fix it in CSS without changing the width or the padding.',
    language: 'html',
    starter: `<style>
  #card {
    width: 200px;
    padding: 16px;
  }
</style>`,
    solution: `<style>
  #card {
    box-sizing: border-box;
    width: 200px;
    padding: 16px;
  }
</style>`,
    checks: [
      { label: 'Width and height include padding and border', test: /#card\s*\{[^}]*box-sizing\s*:\s*border-box/ },
      { label: 'The width is still 200px', test: /#card\s*\{[^}]*\bwidth\s*:\s*200px/ },
      { label: 'The padding is still 16px', test: /#card\s*\{[^}]*padding\s*:\s*16px/ },
    ],
    hints: [
      '`drawElementImage` draws the border box. One property decides whether `width` measures the border box.',
      'Add `box-sizing: border-box;` to the `#card` rule.',
    ],
    seenIn: 'border-box',
  },
];
