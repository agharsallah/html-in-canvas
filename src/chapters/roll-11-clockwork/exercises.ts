import { inOrder, type Exercise } from '../shared/exercise';

const PAINT_ON = (canvas: string) => `${canvas}\\.(?:addEventListener\\(\\s*"paint"\\s*,|onpaint\\s*=)`;
const SIZE_W = /canvas\.width\s*=\s*\w+(\[0\])?\.devicePixelContentBoxSize\[0\]\.inlineSize/;
const SIZE_H = /canvas\.height\s*=\s*\w+(\[0\])?\.devicePixelContentBoxSize\[0\]\.blockSize/;
const REQUEST = /canvas\.requestPaint\(\s*\)/;

export const exercises: Exercise[] = [
  {
    id: 'clockwork-ticker',
    title: 'Tick without a request',
    task: 'On every paint, clear the canvas and draw `ticker` at the top-left, then set `ticker.textContent` to the next `count`. Do not call `requestPaint()`: your DOM edit lands in the next update, and that change fires the next `paint` by itself.',
    language: 'js',
    starter: `let count = 0;
canvas.onpaint = () => {
  // draw the ticker, then advance its text

};`,
    solution: `let count = 0;
canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(ticker, 0, 0);
  count += 1;
  ticker.textContent = count;
};`,
    checks: [
      { label: 'Handles the canvas paint event', test: new RegExp(PAINT_ON('canvas')) },
      { label: 'Clears, then draws ticker at (0, 0)', test: (code) => inOrder(code, /ctx\.(reset|clearRect)\(/, /ctx\.drawElementImage\(\s*ticker\s*,\s*0\s*,\s*0\s*\)/) },
      { label: 'Advances the count', test: /(\+\+\s*count|count\s*\+\+|count\s*\+=\s*1|count\s*=\s*count\s*\+\s*1)/ },
      { label: 'Writes the count into the ticker’s text', test: /ticker\.textContent\s*=\s*[^;]*count/ },
      { label: 'Leaves requestPaint() out: the DOM edit drives the next paint', test: (code) => !/requestPaint/.test(code) },
    ],
    hints: [
      'Draw first with what this update locked in, then edit the DOM. The edit shows up next update.',
      '`ctx.reset(); ctx.drawElementImage(ticker, 0, 0);` then `ticker.textContent = ++count;`',
    ],
    seenIn: 'clock-option-c',
  },
  {
    id: 'clockwork-resize',
    title: 'Resize before the bell',
    task: 'Resize observers run before Paint. In the observer, set the canvas grid to the device-pixel content box size, then ask for a paint. Observe the canvas with the device-pixel content box.',
    language: 'js',
    starter: `new ResizeObserver(([entry]) => {
  // size the grid, then ask for a paint

}).observe(canvas);`,
    solution: `new ResizeObserver(([entry]) => {
  canvas.width = entry.devicePixelContentBoxSize[0].inlineSize;
  canvas.height = entry.devicePixelContentBoxSize[0].blockSize;
  canvas.requestPaint();
}).observe(canvas, { box: 'device-pixel-content-box' });`,
    checks: [
      { label: 'Sets the grid width from the device-pixel inline size', test: SIZE_W },
      { label: 'Sets the grid height from the device-pixel block size', test: SIZE_H },
      { label: 'Asks for a paint after resizing', test: (code) => inOrder(code, SIZE_W, REQUEST) && inOrder(code, SIZE_H, REQUEST) },
      { label: 'Observes the device-pixel content box', test: /\.observe\(\s*canvas\s*,\s*\{\s*box\s*:\s*"device-pixel-content-box"\s*\}\s*\)/ },
    ],
    hints: [
      '`entry.devicePixelContentBoxSize[0]` has `inlineSize` (width) and `blockSize` (height).',
      'End the callback with `canvas.requestPaint()`, and pass `{ box: "device-pixel-content-box" }` to `observe`.',
    ],
    seenIn: 'clock-resize-first',
  },
  {
    id: 'clockwork-nested',
    title: 'Inside out',
    task: 'Give each canvas its own paint listener. The nested canvas clears itself and draws `nestedElement` at (10, 10). The parent clears itself and draws `wrapperElement` at (50, 50). You do not order them: the browser fires the nested one first.',
    language: 'js',
    starter: `nestedCanvas.addEventListener('paint', () => {
  // redraw the inner badge
});
parentCanvas.addEventListener('paint', () => {
  // composite the wrapper, fresh nested canvas included
});`,
    solution: `nestedCanvas.addEventListener('paint', () => {
  nestedCtx.clearRect(0, 0, nestedCanvas.width, nestedCanvas.height);
  nestedCtx.drawElementImage(nestedElement, 10, 10);
});
parentCanvas.addEventListener('paint', () => {
  parentCtx.clearRect(0, 0, parentCanvas.width, parentCanvas.height);
  parentCtx.drawElementImage(wrapperElement, 50, 50);
});`,
    checks: [
      { label: 'The nested canvas draws nestedElement at (10, 10) in its paint', test: new RegExp(`${PAINT_ON('nestedCanvas')}[^}]*nestedCtx\\.drawElementImage\\(\\s*nestedElement\\s*,\\s*10\\s*,\\s*10\\s*\\)`) },
      { label: 'The parent draws wrapperElement at (50, 50) in its paint', test: new RegExp(`${PAINT_ON('parentCanvas')}[^}]*parentCtx\\.drawElementImage\\(\\s*wrapperElement\\s*,\\s*50\\s*,\\s*50\\s*\\)`) },
      { label: 'Each canvas clears before drawing', test: (code) => inOrder(code, /nestedCtx\.(clearRect|reset)\(/, /nestedCtx\.drawElementImage/) && inOrder(code, /parentCtx\.(clearRect|reset)\(/, /parentCtx\.drawElementImage/) },
      { label: 'Each canvas draws only its own child', test: (code) => !/parentCtx\.drawElementImage\(\s*nestedElement/.test(code) && !/nestedCtx\.drawElementImage\(\s*wrapperElement/.test(code) },
    ],
    hints: [
      'Two listeners, two contexts. Each context draws the element that lives inside its own canvas.',
      '`nestedCtx.drawElementImage(nestedElement, 10, 10)` and `parentCtx.drawElementImage(wrapperElement, 50, 50)`, each after a `clearRect`.',
    ],
    seenIn: 'clock-reverse-order',
  },
];
