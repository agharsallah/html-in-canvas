/**
 * Trial levels: five mirrors, each a paint handler with one bug that lets
 * Ghost Clicks in. The learner flips chips and choices in the code; the pure
 * rules decide where every click lands.
 */
import { Mesh, PerspectiveCamera, PlaneGeometry } from 'three';
import { elementToCanvasMatrix } from '../../hic/projective-geometry';
import {
  clearElementGeometry, drawElementImage, EMPTY, gridToCss, hitTest, insideQuad, pose, quadOf, runPaints, updateElementGeometry,
  type Call, type Geometry, type Matrix16, type Point, type Size,
} from './rules';

export const BOARD: Size = { width: 480, height: 300 };

export type Config = Record<string, boolean | string>;

export interface Piece {
  id: string;
  label: string;
  size: Size;
  /** Where it is drawn on the board (CSS px), as the learner sees it. */
  drawn: Matrix16;
  /** Purely visual: drawn but never meant to be clicked. */
  scenery?: boolean;
  /** In the DOM with a size, but not drawn this frame (no picture on the board). */
  undrawn?: boolean;
}

/** A spot the learner must click, and the element that must get the click (null = the canvas itself). */
export interface Target { label: string; at: Point; expect: string | null }

export type CodeToken =
  | string
  | { chip: string; label: string }
  | { choice: string; options: Array<{ value: string; label: string }> };

export interface Level {
  id: string;
  title: string;
  brief: string;
  pieces: Piece[];
  targets: Target[];
  code: Array<{ indent?: number; tokens: CodeToken[] }>;
  initial: Config;
  geometry(config: Config): Geometry;
  /** What to say once solved: the rule behind the fix. */
  lesson: string;
}

const sizesOf = (pieces: Piece[]) => Object.fromEntries(pieces.map((p) => [p.id, p.size]));
const center = (m: Matrix16, s: Size): Point => {
  // Centre of an affine-placed box. 3D levels give their own target points.
  const u = s.width / 2;
  const v = s.height / 2;
  return { x: m[0]! * u + m[4]! * v + m[12]!, y: m[1]! * u + m[5]! * v + m[13]! };
};

// 1. preserveElementGeometry left on after the door moved.
const doorDrawn = pose(300, 170, -8);
const doorSize = { width: 132, height: 48 };
const frozenDoor: Level = {
  id: 'door',
  title: 'The frozen door',
  brief: 'The door slid across the canvas, but it still answers at its old spot.',
  pieces: [{ id: 'door', label: 'Open the door', size: doorSize, drawn: doorDrawn }],
  targets: [{ label: 'Open the door', at: center(doorDrawn, doorSize), expect: 'door' }],
  code: [
    { tokens: ['ctx.drawElementImage(door, x, y', { chip: 'preserve', label: '{ preserveElementGeometry: true }' }, ');'] },
    { tokens: [{ chip: 'sync', label: 'canvas.updateElementGeometry(door, { canvasTransform: drawn });' }] },
  ],
  initial: { preserve: true, sync: false },
  geometry: (c) => {
    // Geometry from an earlier frame, when the door stood at the top left.
    const before = drawElementImage(EMPTY, 'door', pose(40, 40));
    const calls: Call[] = [{ kind: 'draw', id: 'door', matrix: doorDrawn, preserveElementGeometry: !!c.preserve }];
    if (c.sync) calls.push({ kind: 'update', id: 'door', options: { canvasTransform: doorDrawn } });
    return runPaints(before, calls);
  },
  lesson: 'In 2D, drawElementImage syncs geometry for you. Opt out with preserveElementGeometry only if you sync by hand.',
};

// 2. Manual sync with grid px instead of CSS px (canvas grid is 2x).
const SCALE = 2;
const leverSize = { width: 120, height: 44 };
const grid = { x: 240, y: 200 };
const leverDrawn = pose(gridToCss(grid.x, SCALE), gridToCss(grid.y, SCALE));
const unitChoice = (c: Config) => (c.units === 'divide' ? 1 / SCALE : c.units === 'multiply' ? SCALE : 1);
const doubledScale: Level = {
  id: 'lever',
  title: 'The doubled scale',
  brief: 'This canvas grid has 2 device pixels per CSS pixel. The lever is drawn at grid (240, 200).',
  pieces: [{ id: 'lever', label: 'Pull the lever', size: leverSize, drawn: leverDrawn }],
  targets: [{ label: 'Pull the lever', at: center(leverDrawn, leverSize), expect: 'lever' }],
  code: [
    { tokens: ['ctx.drawElementImage(lever, x, y, { preserveElementGeometry: true });'] },
    { tokens: ['const m = new DOMMatrix();'] },
    { tokens: ['m.e = ', { choice: 'units', options: [{ value: 'raw', label: 'x' }, { value: 'divide', label: 'x / scaleX' }, { value: 'multiply', label: 'x * scaleX' }] }, '; m.f = (same for y);'] },
    { tokens: ['canvas.updateElementGeometry(lever, { canvasTransform: m });'] },
  ],
  initial: { units: 'raw' },
  geometry: (c) => {
    const k = unitChoice(c);
    return runPaints(EMPTY, [
      { kind: 'draw', id: 'lever', matrix: leverDrawn, preserveElementGeometry: true },
      { kind: 'update', id: 'lever', options: { canvasTransform: pose(grid.x * k, grid.y * k) } },
    ]);
  },
  lesson: 'Draw positions are canvas grid px; canvasTransform is CSS px. Divide by the grid-per-CSS-px scale.',
};

// 3. A backdrop updated after the buttons climbs to the top of the stack.
const wallSize = { width: 480, height: 300 };
const wallDrawn = pose(0, 0);
const leftSize = { width: 120, height: 48 };
const leftDrawn = pose(70, 126);
const rightDrawn = pose(290, 126);
const greedyWall: Level = {
  id: 'wall',
  title: 'The greedy wall',
  brief: 'A parallax wall is drawn first, but its geometry is updated last, every paint.',
  pieces: [
    { id: 'wall', label: 'Mirror wall', size: wallSize, drawn: wallDrawn, scenery: true },
    { id: 'left', label: 'Go left', size: leftSize, drawn: leftDrawn },
    { id: 'right', label: 'Go right', size: leftSize, drawn: rightDrawn },
  ],
  targets: [
    { label: 'Go left', at: center(leftDrawn, leftSize), expect: 'left' },
    { label: 'Go right', at: center(rightDrawn, leftSize), expect: 'right' },
  ],
  code: [
    { tokens: ['ctx.drawElementImage(wall, 0, 0, { preserveElementGeometry: true });'] },
    { tokens: ['ctx.drawElementImage(left, …', { chip: 'buttonsPreserve', label: ', { preserveElementGeometry: true }' }, ');'] },
    { tokens: ['ctx.drawElementImage(right, …', { chip: 'buttonsPreserve2', label: ', { preserveElementGeometry: true }' }, ');'] },
    { tokens: ['canvas.updateElementGeometry(wall, { canvasTransform: parallax', { chip: 'order', label: ', preserveHitTestOrder: true' }, ' });'] },
  ],
  initial: { buttonsPreserve: false, buttonsPreserve2: false, order: false },
  geometry: (c) => runPaints(EMPTY, [
    { kind: 'draw', id: 'wall', matrix: wallDrawn, preserveElementGeometry: true },
    { kind: 'draw', id: 'left', matrix: leftDrawn, preserveElementGeometry: !!c.buttonsPreserve },
    { kind: 'draw', id: 'right', matrix: rightDrawn, preserveElementGeometry: !!c.buttonsPreserve2 },
    { kind: 'update', id: 'wall', options: { canvasTransform: wallDrawn, preserveHitTestOrder: !!c.order } },
  ]),
  lesson: 'Every geometry update moves an element to the top of the hit-test stack, unless preserveHitTestOrder keeps it where it already is.',
};

// 4. A closed menu is no longer drawn, but its old geometry still catches clicks.
const saveSize = { width: 110, height: 44 };
const saveDrawn = pose(40, 220);
const menuSize = { width: 200, height: 170 };
const closedMenu: Level = {
  id: 'menu',
  title: 'The closed menu',
  brief: 'The menu was open a moment ago, over the right half. Now only Save is drawn. Click Save, then the empty floor.',
  pieces: [
    { id: 'save', label: 'Save', size: saveSize, drawn: saveDrawn },
    { id: 'menu', label: 'Menu', size: menuSize, drawn: pose(260, 60), undrawn: true },
  ],
  targets: [
    { label: 'Save', at: center(saveDrawn, saveSize), expect: 'save' },
    { label: 'The empty floor', at: { x: 360, y: 150 }, expect: null },
  ],
  code: [
    { tokens: ['function closeMenu() {'] },
    { indent: 1, tokens: ['menuOpen = false;'] },
    { indent: 1, tokens: [{ chip: 'erase', label: 'ctx.clearRect(260, 60, 200, 170);' }] },
    { indent: 1, tokens: [{ chip: 'clear', label: 'canvas.clearElementGeometry(menu);' }] },
    { tokens: ['}'] },
    { tokens: ['// paint: ctx.drawElementImage(save, …); if (menuOpen) ctx.drawElementImage(menu, …);'] },
  ],
  initial: { erase: false, clear: false },
  geometry: (c) => {
    let g = drawElementImage(EMPTY, 'menu', pose(260, 60));
    if (c.clear) g = clearElementGeometry(g, 'menu');
    return runPaints(g, [{ kind: 'draw', id: 'save', matrix: saveDrawn }]);
  },
  lesson: 'Erasing pixels changes nothing for the DOM. clearElementGeometry un-draws the element: no hit testing, offscreen for accessibility.',
};

// 5. A WebGL card tilted in 3D: only the full projective chain lines up.
function tiltedCard(): { matrix: Matrix16; model: Matrix16 } {
  const camera = new PerspectiveCamera(40, BOARD.width / BOARD.height, 0.1, 50);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  const mesh = new Mesh(new PlaneGeometry(2.4, 1.2));
  mesh.rotation.set(-0.15, 0.7, 0.05);
  mesh.updateMatrixWorld(true);
  const matrix = elementToCanvasMatrix({ objectMatrixWorld: mesh.matrixWorld, camera, plane: { width: 2.4, height: 1.2 }, element: { width: 200, height: 100 }, viewport: BOARD });
  mesh.geometry.dispose();
  return { matrix, model: mesh.matrixWorld.toArray() };
}
const tilt = tiltedCard();
const cardSize = { width: 200, height: 100 };
export const TILT_MATRIX = tilt.matrix;
const tiltedMirror: Level = {
  id: 'tilt',
  title: 'The tilted mirror',
  brief: 'A WebGL card, turned in 3D. WebGL can’t tell the browser where the texture went: you must.',
  pieces: [{ id: 'card', label: 'Polish the mirror', size: cardSize, drawn: tilt.matrix }],
  targets: [{ label: 'Polish the mirror', at: projected(tilt.matrix, 100, 50), expect: 'card' }],
  code: [
    { tokens: ['gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, card);'] },
    { tokens: ['renderer.render(scene, camera);'] },
    { tokens: ['canvas.updateElementGeometry(card, { canvasTransform: ', { choice: 'matrix', options: [
      { value: 'none', label: '(never called)' },
      { value: 'model', label: 'new DOMMatrix(mesh.matrixWorld.elements)' },
      { value: 'full', label: 'new DOMMatrix(elementToCanvasMatrix(…))' },
    ] }, ' });'] },
  ],
  initial: { matrix: 'none' },
  geometry: (c) => {
    if (c.matrix === 'none') return EMPTY;
    return updateElementGeometry(EMPTY, 'card', { canvasTransform: c.matrix === 'full' ? tilt.matrix : tilt.model });
  },
  lesson: 'In 3D, pass the whole chain: viewport · projection · view · model · element-to-plane, as one 4x4 DOMMatrix in CSS px.',
};

function projected(m: Matrix16, u: number, v: number): Point {
  const w = m[3]! * u + m[7]! * v + m[15]!;
  return { x: (m[0]! * u + m[4]! * v + m[12]!) / w, y: (m[1]! * u + m[5]! * v + m[13]!) / w };
}

export const LEVELS: readonly Level[] = [frozenDoor, doubledScale, greedyWall, closedMenu, tiltedMirror];

/** Who gets a click at `p` under `config`. */
export function registeredAt(level: Level, config: Config, p: Point): string | null {
  return hitTest(level.geometry(config), sizesOf(level.pieces), p);
}

/** Did this target's click land where the learner saw it? */
export function targetPasses(level: Level, config: Config, target: Target): boolean {
  return registeredAt(level, config, target.at) === target.expect;
}

/** Solved when every target registers as expected. */
export function levelSolved(level: Level, config: Config): boolean {
  return level.targets.every((t) => targetPasses(level, config, t));
}

export function sizesFor(level: Level): Record<string, Size> {
  return sizesOf(level.pieces);
}

/** The topmost drawn, clickable-looking piece under `p` (later drawn = on top), or null. */
export function drawnAt(level: Level, p: Point): string | null {
  for (let i = level.pieces.length - 1; i >= 0; i--) {
    const piece = level.pieces[i]!;
    if (piece.undrawn) continue;
    const quad = quadOf(piece.drawn, { x: 0, y: 0, ...piece.size });
    if (quad && insideQuad(quad, p)) return piece.scenery ? null : piece.id;
  }
  return null;
}

/** The target a click at `p` was aimed at, if any. */
export function targetAt(level: Level, p: Point): number {
  const id = drawnAt(level, p);
  return level.targets.findIndex((t) => (t.expect === null ? Math.hypot(t.at.x - p.x, t.at.y - p.y) < 28 && !id : t.expect === id));
}
