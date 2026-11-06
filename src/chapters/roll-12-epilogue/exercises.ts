import type { Exercise } from '../shared/exercise';

export const exercises: Exercise[] = [
  {
    id: 'epilogue-detect',
    title: 'Ask before you draw',
    task: 'Finish `supportsHtmlInCanvas()`. Return false when there is no `document`. Otherwise make a fresh canvas, set its `content` attribute to `drawable`, and return whether the `content` property now reads `drawable`.',
    language: 'js',
    starter: `export function supportsHtmlInCanvas() {
  // no document: no support

  // make a canvas, set the attribute, check the property
}`,
    solution: `export function supportsHtmlInCanvas() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('content', 'drawable');
  return canvas.content === 'drawable';
}`,
    checks: [
      { label: 'Returns false when document does not exist', test: /if\s*\(\s*typeof\s+document\s*===?\s*"undefined"\s*\)\s*\{?\s*return\s+false/ },
      { label: 'Creates a fresh canvas element', test: /document\.createElement\(\s*"canvas"\s*\)/ },
      { label: 'Sets the content attribute to drawable', test: /\.setAttribute\(\s*"content"\s*,\s*"drawable"\s*\)/ },
      { label: 'Returns whether the content property reflects drawable', test: /return\s+\w+\.content\s*===?\s*"drawable"/ },
    ],
    hints: [
      'Browsers without the API keep `content` as an unknown attribute, so the property does not reflect it.',
      'Use `setAttribute("content", "drawable")`, then `return canvas.content === "drawable"`.',
    ],
    seenIn: 'epilogue-detect',
  },
  {
    id: 'epilogue-probe',
    title: 'Probe the context',
    task: 'The page passed detection, but this WebGL context might still lack the upload method. Upload `card` with `texElementSubImage2D` (target `gl.TEXTURE_2D`, level 0, offset 0, 0) only when the method exists on `gl`; otherwise call `fallback()`.',
    language: 'js',
    starter: `gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, card);`,
    solution: `gl.bindTexture(gl.TEXTURE_2D, texture);
if (typeof gl.texElementSubImage2D === 'function') {
  gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, card);
} else {
  fallback();
}`,
    checks: [
      { label: 'Checks that the WebGL context has the upload method', test: /if\s*\(\s*(typeof\s+gl\.texElementSubImage2D\s*===?\s*"function"|"texElementSubImage2D"\s+in\s+gl|gl\.texElementSubImage2D\s*!==?\s*undefined)\s*\)/ },
      { label: 'Uploads the card when it exists', test: /\{\s*gl\.texElementSubImage2D\(\s*gl\.TEXTURE_2D\s*,\s*0\s*,\s*0\s*,\s*0\s*,\s*card\s*\)\s*;?\s*\}/ },
      { label: 'Calls the fallback otherwise', test: /else\s*\{?\s*fallback\(\s*\)/ },
    ],
    hints: [
      'The official WebGL demo does the same for geometry: it checks `canvas.updateElementGeometry !== undefined` first.',
      'Wrap the call: `if (typeof gl.texElementSubImage2D === "function") { … } else { fallback(); }`.',
    ],
    seenIn: 'epilogue-detect',
  },
  {
    id: 'epilogue-hatch',
    title: 'Open the escape hatch',
    task: 'Start the canvas UI with `startCanvasUI()` only when `supportsHtmlInCanvas()` says yes. Otherwise start the floating HTML overlay with `startOverlayUI()`.',
    language: 'js',
    starter: `import { supportsHtmlInCanvas } from './detect.js';

startCanvasUI();`,
    solution: `import { supportsHtmlInCanvas } from './detect.js';

if (supportsHtmlInCanvas()) {
  startCanvasUI();
} else {
  startOverlayUI();
}`,
    checks: [
      { label: 'Branches on supportsHtmlInCanvas()', test: /if\s*\(\s*supportsHtmlInCanvas\(\s*\)\s*\)/ },
      { label: 'Starts the canvas UI when supported', test: /if\s*\(\s*supportsHtmlInCanvas\(\s*\)\s*\)\s*\{?\s*startCanvasUI\(\s*\)/ },
      { label: 'Starts the overlay otherwise', test: /else\s*\{?\s*startOverlayUI\(\s*\)/ },
    ],
    hints: [
      'One `if` with an `else`.',
      'Floating HTML overlays are one of the fallbacks the Chrome docs list; they keep the form real and accessible.',
    ],
    seenIn: 'epilogue-escape-hatch',
  },
];
