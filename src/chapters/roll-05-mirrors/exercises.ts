import { inOrder, type Exercise } from '../shared/exercise';

const UPDATE_CARD = /canvas\.updateElementGeometry\(\s*card\s*,\s*\{\s*canvasTransform\s*:\s*transform\s*\}\s*\)/;
const BACKDROP_CALL = /canvas\.updateElementGeometry\(\s*backdrop\s*,\s*\{([^}]*)\}\s*\)/;

export const exercises: Exercise[] = [
  {
    id: 'mirrors-by-hand',
    title: 'Sync it yourself',
    task: 'Draw `card` at (x, y) without letting the browser touch its geometry, then tell the browser where it went. `x` and `y` are canvas grid px; `scaleX` and `scaleY` are grid px per CSS px.',
    language: 'js',
    starter: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(card, x, y);

  const transform = new DOMMatrix();
  // translate to where the card was drawn

  // hand the transform to the browser

};`,
    solution: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(card, x, y, { preserveElementGeometry: true });

  const transform = new DOMMatrix();
  transform.e = x / scaleX;
  transform.f = y / scaleY;
  canvas.updateElementGeometry(card, { canvasTransform: transform });
};`,
    checks: [
      { label: 'Draws the card at (x, y) with automatic geometry turned off', test: /ctx\.drawElementImage\(\s*card\s*,\s*x\s*,\s*y\s*,\s*\{\s*preserveElementGeometry\s*:\s*true\s*\}\s*\)/ },
      { label: 'Translates x into CSS px', test: /transform\.e\s*=\s*x\s*\/\s*scaleX\b/ },
      { label: 'Translates y into CSS px', test: /transform\.f\s*=\s*y\s*\/\s*scaleY\b/ },
      { label: 'Sets the transform as the card’s canvas transform, after building it', test: (code) => UPDATE_CARD.test(code) && inOrder(code, /transform\.f\s*=/, UPDATE_CARD) },
    ],
    hints: [
      'Three changes: an option on the draw call, two matrix fields, and one canvas method.',
      'The option is `{ preserveElementGeometry: true }`. Geometry is CSS px, so divide grid px by the scale. The method is `canvas.updateElementGeometry(card, { canvasTransform: … })`.',
    ],
    seenIn: 'preserve-geometry',
  },
  {
    id: 'mirrors-backdrop',
    title: 'Keep the wall behind',
    task: 'A parallax backdrop has its geometry updated after the buttons, every paint, so it climbs to the top of the hit-test stack and swallows their clicks. Keep its place in the stack, and keep its transform.',
    language: 'js',
    starter: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(backdrop, 0, 0, { preserveElementGeometry: true });
  ctx.drawElementImage(play, 40, 120);
  ctx.drawElementImage(quit, 240, 120);
  canvas.updateElementGeometry(backdrop, { canvasTransform: parallax });
};`,
    solution: `canvas.onpaint = () => {
  ctx.reset();
  ctx.drawElementImage(backdrop, 0, 0, { preserveElementGeometry: true });
  ctx.drawElementImage(play, 40, 120);
  ctx.drawElementImage(quit, 240, 120);
  canvas.updateElementGeometry(backdrop, {
    canvasTransform: parallax,
    preserveHitTestOrder: true,
  });
};`,
    checks: [
      { label: 'Still updates the backdrop with the parallax transform', test: (code) => /canvasTransform\s*:\s*parallax\b/.test(BACKDROP_CALL.exec(code)?.[1] ?? '') },
      { label: 'Leaves the backdrop where it is in the hit-test stack', test: (code) => /preserveHitTestOrder\s*:\s*true\b/.test(BACKDROP_CALL.exec(code)?.[1] ?? '') },
      { label: 'Both buttons are still drawn', test: (code) => /drawElementImage\(\s*play\b/.test(code) && /drawElementImage\(\s*quit\b/.test(code) },
    ],
    hints: [
      'By default every geometry update moves the element to the top of the stack. One option says “leave it where it is”.',
      'Add `preserveHitTestOrder: true` next to `canvasTransform` in the backdrop’s options.',
    ],
    seenIn: 'hit-order',
  },
  {
    id: 'mirrors-webgl',
    title: 'Sync a 3D card, old browsers too',
    task: 'In this WebGL loop, `matrix` holds 16 numbers from `elementToCanvasMatrix()`. Turn it into a `DOMMatrix`. If the browser has `updateElementGeometry`, use it on `card`; otherwise fall back to the older demos’ approach of writing the matrix into the card’s CSS transform.',
    language: 'js',
    starter: `function syncGeometry(matrix) {
  // 1. a DOMMatrix from the 16 numbers

  // 2. the new API, when it exists

  // 3. otherwise the older approach
}`,
    solution: `function syncGeometry(matrix) {
  const transform = new DOMMatrix(matrix);
  if (canvas.updateElementGeometry !== undefined) {
    canvas.updateElementGeometry(card, { canvasTransform: transform });
  } else {
    card.style.transform = transform.toString();
  }
}`,
    checks: [
      { label: 'Builds a DOMMatrix from the 16 numbers', test: /new DOMMatrix\(\s*matrix\s*\)/ },
      { label: 'Checks that updateElementGeometry exists before calling it', test: /if\s*\(\s*(?:canvas\.updateElementGeometry\s*(?:!==?\s*undefined)?|typeof canvas\.updateElementGeometry\s*[!=]==?\s*"function"|"updateElementGeometry" in canvas)\s*\)/ },
      { label: 'Calls updateElementGeometry on card with the canvas transform', test: /canvas\.updateElementGeometry\(\s*card\s*,\s*\{\s*canvasTransform\s*:\s*\w+\s*\}\s*\)/ },
      { label: 'Otherwise writes the matrix into card.style.transform', test: /else\s*\{?\s*card\.style\.transform\s*=\s*\w+\.toString\(\)/ },
    ],
    hints: [
      'Feature-detect with `if (canvas.updateElementGeometry !== undefined)`, then an `else` branch.',
      'The fallback is `card.style.transform = transform.toString();`, exactly what the WebGL demo does (and marks “do not use”).',
    ],
    seenIn: 'legacy-transform',
  },
];
