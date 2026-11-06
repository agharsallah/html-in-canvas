import { inOrder, type Exercise } from '../shared/exercise';

const RESET = /ctx\.reset\(\s*\)/;
const ROTATE = /ctx\.rotate\(\s*\(?\s*15\s*\*\s*Math\.PI\s*\)?\s*\/\s*180\s*\)/;
const TRANSLATE = /ctx\.translate\(\s*80\s*\*\s*devicePixelRatio\s*,\s*-\s*20\s*\*\s*devicePixelRatio\s*\)/;
const DRAW_TILT = /ctx\.drawElementImage\(\s*draw_element\s*,\s*0\s*,\s*0\s*\)/;
const n = (value: number) => `\\s*${value}\\s*`;
const args = (...values: number[]) => values.map(n).join(',');

export const exercises: Exercise[] = [
  {
    id: 'projector-stub',
    title: 'Tear the stub',
    task: 'Draw only the ticket’s stub: the area 60 CSS px wide and 100 tall that starts 140 CSS px from the ticket’s left edge, at its top. Put it at canvas (240, 50), at its default size.',
    language: 'js',
    starter: `canvas.onpaint = () => {
  ctx.reset();
  // draw only the stub of ticket

};`,
    solution: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(ticket, 140, 0, 60, 100, 240, 50);
};`,
    checks: [
      { label: 'Draws the ticket', test: /ctx\.drawElementImage\(\s*ticket\s*,/ },
      { label: 'Crops to the stub with a source rect (CSS px)', test: new RegExp(`ctx\\.drawElementImage\\(\\s*ticket\\s*,${args(140, 0, 60, 100)},`) },
      { label: 'Places it at (240, 50) without resizing it', test: new RegExp(`ctx\\.drawElementImage\\(\\s*ticket\\s*,${args(140, 0, 60, 100, 240, 50)}\\)`) },
    ],
    hints: [
      'You want the crop-then-position form: four source numbers, then two destination numbers.',
      'The source rect is `sx, sy, sw, sh`: where the stub starts on the ticket and how big it is. Then `dx, dy`.',
    ],
    seenIn: 'source-rect',
  },
  {
    id: 'projector-fill',
    title: 'Fill the screen',
    task: 'Stretch the whole `poster` over the entire canvas, whatever size the canvas grid is.',
    language: 'js',
    starter: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(poster, 0, 0);
};`,
    solution: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(poster, 0, 0, canvas.width, canvas.height);
};`,
    checks: [
      { label: 'Starts at the top-left corner of the canvas', test: /ctx\.drawElementImage\(\s*poster\s*,\s*0\s*,\s*0\s*,/ },
      { label: 'Uses the canvas grid size as the destination size', test: /ctx\.drawElementImage\(\s*poster\s*,\s*0\s*,\s*0\s*,\s*canvas\.width\s*,\s*canvas\.height\s*\)/ },
    ],
    hints: [
      'The position-and-size form takes `dx, dy, dw, dh` after the element.',
      'The canvas grid is `canvas.width` by `canvas.height` grid pixels, the same unit as the destination.',
    ],
    seenIn: 'dest-rect',
  },
  {
    id: 'projector-tilt',
    title: 'Tilt like the demo',
    task: 'Recreate the complex-text demo’s paint: start each paint from a clean context, rotate it by 15 degrees, shift it 80 device px right and 20 up, then draw `draw_element` at the origin.',
    language: 'js',
    starter: `canvas.onpaint = (event) => {
  ctx.drawElementImage(draw_element, 0, 0);
};`,
    solution: `canvas.onpaint = (event) => {
  ctx.reset();
  ctx.rotate((15 * Math.PI) / 180);
  ctx.translate(80 * devicePixelRatio, -20 * devicePixelRatio);
  ctx.drawElementImage(draw_element, 0, 0);
};`,
    checks: [
      { label: 'Clears the context first', test: (code) => inOrder(code, RESET, ROTATE) },
      { label: 'Rotates by 15 degrees, in radians', test: ROTATE },
      { label: 'Shifts by 80 and -20, scaled by devicePixelRatio', test: TRANSLATE },
      { label: 'Draws at the origin after transforming', test: (code) => inOrder(code, ROTATE, DRAW_TILT) && inOrder(code, TRANSLATE, DRAW_TILT) },
    ],
    hints: [
      'Four lines: reset, rotate, translate, draw. Order matters.',
      '`ctx.rotate` takes radians: `(15 * Math.PI) / 180`. `ctx.translate(80 * devicePixelRatio, -20 * devicePixelRatio)`.',
    ],
    seenIn: 'ctx-transforms',
  },
];
