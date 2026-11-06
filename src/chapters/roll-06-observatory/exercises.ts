import { inOrder, type Exercise } from '../shared/exercise';

const UPLOAD = /gl\.texElementSubImage2D\(\s*gl\.TEXTURE_2D\s*,\s*0\s*,\s*0\s*,\s*0\s*,\s*form\s*[,)]/;
const GEOMETRY = /canvas\.updateElementGeometry\(\s*form\s*,\s*\{\s*canvasTransform(\s*:\s*\w+)?\s*\}\s*\)/;

export const exercises: Exercise[] = [
  {
    id: 'observatory-allocate',
    title: 'Reserve the storage',
    task: 'Before any upload, allocate empty texture storage exactly the size of the form’s snapshot, rounded up to whole texels, in RGBA8.',
    language: 'js',
    starter: `const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');
const form = document.querySelector('form');
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);

// reserve storage the size of the form's snapshot
`,
    solution: `const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2');
const form = document.querySelector('form');
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);

const { width, height } = canvas.getElementImageDefaultSize(form);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8,
  Math.ceil(width), Math.ceil(height), 0,
  gl.RGBA, gl.UNSIGNED_BYTE, null);`,
    checks: [
      { label: 'Reads the form’s default snapshot size from the canvas', test: /canvas\.getElementImageDefaultSize\(\s*form\s*\)/ },
      { label: 'Allocates with texImage2D and no pixels', test: /gl\.texImage2D\(\s*gl\.TEXTURE_2D[^;]*,\s*null\s*\)/ },
      { label: 'Uses RGBA8 storage', test: /gl\.texImage2D\(\s*gl\.TEXTURE_2D\s*,\s*0\s*,\s*gl\.RGBA8\s*,/ },
      { label: 'Rounds both sizes up', test: (code) => (code.match(/Math\.ceil\(/g) ?? []).length >= 2 },
    ],
    hints: [
      'The canvas can tell you an element’s natural size in grid px. Pass that size to `texImage2D` with `null` instead of pixels.',
      '`canvas.getElementImageDefaultSize(form)` returns `{ width, height }`. Then `gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, Math.ceil(width), Math.ceil(height), 0, gl.RGBA, gl.UNSIGNED_BYTE, null)`.',
    ],
    seenIn: 'pre-allocate',
  },
  {
    id: 'observatory-upload',
    title: 'Only fresh snapshots',
    task: 'In the paint handler, copy the form into `texture` (level 0, offset 0, 0) only when the form is among this paint’s changed elements. Draw the scene on every paint.',
    language: 'js',
    starter: `canvas.onpaint = (event) => {
  // copy the form into the texture, only if it changed

  drawScene();
};`,
    solution: `canvas.onpaint = (event) => {
  if (event.changedElements.includes(form)) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, form);
  }
  drawScene();
};`,
    checks: [
      { label: 'Checks whether the form is in event.changedElements', test: /event\.changedElements\)?\.includes\(\s*form\s*\)/ },
      { label: 'Binds the texture, then uploads the form at level 0, offset 0, 0', test: (code) => inOrder(code, /gl\.bindTexture\(\s*gl\.TEXTURE_2D\s*,\s*texture\s*\)/, UPLOAD) },
      { label: 'Uploads only inside that check', test: /if\s*\(\s*(Array\.from\(\s*)?event\.changedElements\)?\.includes\(\s*form\s*\)\s*\)\s*\{[^}]*gl\.texElementSubImage2D\(/ },
      { label: 'Still draws the scene on every paint', test: /\}\s*drawScene\(\s*\)\s*;?\s*\}\s*;?\s*$/ },
    ],
    hints: [
      'Wrap the bind and the upload in an `if`. Leave `drawScene()` outside it.',
      '`gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, form)` copies the snapshot. Guard it with `event.changedElements.includes(form)`.',
    ],
    seenIn: 'upload-changed',
  },
  {
    id: 'observatory-geometry',
    title: 'Tell the DOM where it landed',
    task: 'The scene draws the form scaled to the canvas, offset 50 CSS px right and 100 down (the guide’s example). After drawing, give the browser that transform so clicks reach the form.',
    language: 'js',
    starter: `canvas.addEventListener('paint', () => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, form);
  drawScene();
  // tell the DOM where the form was drawn
});`,
    solution: `canvas.addEventListener('paint', () => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, form);
  drawScene();
  const canvasTransform = new DOMMatrix();
  canvasTransform.a = canvas.clientWidth / form.offsetWidth;
  canvasTransform.d = canvas.clientHeight / form.offsetHeight;
  canvasTransform.e = 50;
  canvasTransform.f = 100;
  canvas.updateElementGeometry(form, { canvasTransform });
});`,
    checks: [
      { label: 'Builds a DOMMatrix', test: /new DOMMatrix\(\s*\)/ },
      { label: 'Scales x by the canvas width over the form width, in CSS px', test: /\.a\s*=\s*canvas\.clientWidth\s*\/\s*form\.offsetWidth/ },
      { label: 'Scales y by the canvas height over the form height', test: /\.d\s*=\s*canvas\.clientHeight\s*\/\s*form\.offsetHeight/ },
      { label: 'Translates by 50 and 100 CSS px', test: (code) => /\.e\s*=\s*50\b/.test(code) && /\.f\s*=\s*100\b/.test(code) },
      { label: 'Passes it as canvasTransform to updateElementGeometry, after drawing', test: (code) => inOrder(code, /drawScene\(\s*\)/, GEOMETRY) },
    ],
    hints: [
      'Matrix fields `a` and `d` scale, `e` and `f` translate. Everything is in CSS px, so use `clientWidth` and `offsetWidth`.',
      'End with `canvas.updateElementGeometry(form, { canvasTransform })`.',
    ],
    seenIn: 'geometry-3d',
  },
];
