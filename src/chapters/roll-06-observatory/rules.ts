/**
 * The observatory's rules, as pure functions. The lab, both trial phases and
 * tests/observatory-rules.test.ts share them.
 *
 * Sources (docs-llm):
 *  - Chrome docs, webgl.md: pre-allocate with texImage2D(..., null) once, "or
 *    whenever the element changes size"; upload with texElementSubImage2D in
 *    the paint listener; then draw; then build a CSS-px DOMMatrix and call
 *    updateElementGeometry.
 *  - README.md: 3D contexts must call updateElementGeometry.
 *  - Examples/webGL.html: LINEAR min filter, upload only for changedElements.
 */
import { canvasToElementPoint, projectElementPoint, type Matrix16, type Size } from '../../hic/projective-geometry';

// ------------------------------------------------------------ upload costs

/** Bytes in one RGBA8 texture of w x h texels. */
export const textureBytes = (width: number, height: number): number => Math.ceil(width) * Math.ceil(height) * 4;

export function formatBytes(bytes: number): string {
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} kB`;
  return `${bytes} B`;
}

/** Should this paint upload the element? The webGL.html gating rule. */
export function shouldUpload(opts: { onlyChanged: boolean; changed: boolean; neverUploaded: boolean; sizeChanged: boolean }): boolean {
  return opts.neverUploaded || opts.sizeChanged || !opts.onlyChanged || opts.changed;
}

/** Does this upload need storage (re)allocated first? */
export function needsAllocation(opts: { preallocate: boolean; allocated: boolean; sizeChanged: boolean }): boolean {
  return !opts.preallocate || !opts.allocated || opts.sizeChanged;
}

// ----------------------------------------------------------- hit testing

export type HitMode = 'projective' | 'flat' | 'off';

/**
 * The Flat Earth Society's matrix: scale + translate onto the bounding box of
 * the projected face. Exact for an unrotated card, wrong once it tilts.
 */
export function flatMatrix(m: Matrix16, element: Size): Matrix16 {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [u, v] of [[0, 0], [element.width, 0], [0, element.height], [element.width, element.height]] as const) {
    const p = projectElementPoint(m, u, v);
    xs.push(p.x);
    ys.push(p.y);
  }
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const sx = (Math.max(...xs) - minX) / element.width;
  const sy = (Math.max(...ys) - minY) / element.height;
  // Column-major: a, b, 0, 0 | c, d, 0, 0 | 0, 0, 1, 0 | e, f, 0, 1
  return [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, 1, 0, minX, minY, 0, 1];
}

export interface ControlBox {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HitResult {
  /** Element-space point (CSS px) the click maps to, if any. */
  point: { u: number; v: number } | null;
  /** A control id, 'card' for the element's background, or 'space'. */
  target: string;
}

/** Where does a canvas click land, given the matrix the DOM was told? */
export function hitThrough(m: Matrix16 | null, element: Size, controls: readonly ControlBox[], x: number, y: number): HitResult {
  if (!m) return { point: null, target: 'space' };
  const point = canvasToElementPoint(m, x, y);
  if (!point) return { point: null, target: 'space' };
  // Behind the camera, the inverse still finds a point: reject it.
  if (projectElementPoint(m, point.u, point.v).w <= 0) return { point: null, target: 'space' };
  const { u, v } = point;
  if (u < 0 || v < 0 || u > element.width || v > element.height) return { point, target: 'space' };
  const hit = controls.find((c) => u >= c.x && u <= c.x + c.width && v >= c.y && v <= c.y + c.height);
  return { point, target: hit ? hit.id : 'card' };
}

// ---------------------------------------------------- trial: the pipeline

export type PartId =
  | 'create' | 'bind' | 'filter' | 'allocate'
  | 'gate' | 'upload' | 'draw' | 'geometry'
  | 'decoy-2d' | 'decoy-gpu' | 'decoy-teximage';

export interface Part {
  id: PartId;
  code: string;
  /** Why it is wrong, for decoys. */
  decoy?: string;
}

export const PARTS: readonly Part[] = [
  { id: 'create', code: 'const tex = gl.createTexture();' },
  { id: 'bind', code: 'gl.bindTexture(gl.TEXTURE_2D, tex);' },
  { id: 'filter', code: 'gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);' },
  { id: 'allocate', code: 'gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);' },
  { id: 'gate', code: 'if (event.changedElements.includes(form))' },
  { id: 'upload', code: 'gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, form);' },
  { id: 'draw', code: 'drawScene();' },
  { id: 'geometry', code: 'canvas.updateElementGeometry(form, { canvasTransform });' },
  { id: 'decoy-2d', code: 'ctx.drawElementImage(form, 0, 0);', decoy: '`drawElementImage` belongs to the 2D context. A WebGL context uploads with `texElementSubImage2D`.' },
  { id: 'decoy-gpu', code: 'device.queue.drawElementImageToTexture({ source: form }, { texture: tex });', decoy: '`drawElementImageToTexture` is the WebGPU queue method, not WebGL.' },
  { id: 'decoy-teximage', code: 'gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, form);', decoy: 'Plain `texImage2D` takes images, videos and canvases, not elements. Elements go through `texElementSubImage2D`.' },
];

export const SETUP_ORDER: readonly PartId[] = ['create', 'bind', 'filter', 'allocate'];
export const PAINT_ORDER: readonly PartId[] = ['gate', 'upload', 'draw', 'geometry'];

export interface PipelineBuild {
  setup: PartId[];
  paint: PartId[];
}

export interface PipelineVerdict {
  ok: boolean;
  problems: string[];
}

const before = (list: PartId[], a: PartId, b: PartId) => list.indexOf(a) >= 0 && list.indexOf(b) >= 0 && list.indexOf(a) > list.indexOf(b);

export function checkPipeline({ setup, paint }: PipelineBuild): PipelineVerdict {
  const problems: string[] = [];
  for (const id of [...setup, ...paint]) {
    const decoy = PARTS.find((p) => p.id === id)?.decoy;
    if (decoy) problems.push(decoy);
  }
  if (paint.includes('allocate')) problems.push('Allocating inside `paint` re-allocates GPU memory every time. Allocate once in setup, or when the element changes size.');
  if (paint.includes('create')) problems.push('Creating a texture on every paint leaks a new texture each frame. Create it once.');
  if (setup.includes('upload')) problems.push('Uploading once at setup never updates, and there may be no snapshot yet. Upload from the `paint` event.');
  if (setup.includes('gate') || setup.includes('draw') || setup.includes('geometry')) problems.push('The change check, the draw and the geometry update happen on every paint, not once.');
  if (paint.includes('filter')) problems.push('Filtering is texture state: set it once in setup.');
  if (paint.includes('bind') && (setup.includes('allocate') || setup.includes('filter'))) problems.push('Setup allocates and filters the bound texture, so bind it in setup, before them.');

  for (const id of SETUP_ORDER) if (![...setup, ...paint].includes(id)) problems.push(missing(id));
  for (const id of PAINT_ORDER) if (![...setup, ...paint].includes(id)) problems.push(missing(id));

  if (before(setup, 'create', 'bind')) problems.push('Bind needs a texture: create it first.');
  if (before(setup, 'bind', 'filter') || before(setup, 'bind', 'allocate')) problems.push('Filtering and allocation act on the bound texture: bind first.');
  if (before(paint, 'gate', 'upload')) problems.push('The `changedElements` check must come before the upload it guards.');
  if (before(paint, 'upload', 'draw')) problems.push('Upload before drawing, or this frame samples the stale texture.');
  if (before(paint, 'draw', 'geometry')) problems.push('The docs’ order: upload, draw the scene, then tell the DOM where the element landed.');
  return { ok: problems.length === 0, problems };
}

function missing(id: PartId): string {
  switch (id) {
    case 'create': return 'There is no texture to upload into.';
    case 'bind': return 'Nothing binds the texture, so the calls act on whatever was bound last.';
    case 'filter': return 'Without LINEAR filtering the default minification filter expects mipmaps you never built. The official demo sets LINEAR.';
    case 'allocate': return '`texElementSubImage2D` is a sub-image upload: pre-allocate storage with `texImage2D(..., null)` first.';
    case 'gate': return 'Every paint re-uploads. Check `event.changedElements` first.';
    case 'upload': return 'The snapshot never reaches the texture.';
    case 'draw': return 'The scene is never drawn.';
    case 'geometry': return 'Clicks miss: 3D contexts must call `updateElementGeometry`.';
    default: return '';
  }
}
