/**
 * Every HTML-in-Canvas feature used by Kiosk, and the job it does.
 * Drives the spec chips in section headers and the "Under the hood" table.
 * `check` reports live support in the visitor's browser.
 */
import type { Section } from './site.config';

export interface ApiUse {
  api: string;
  kind: 'attribute' | 'event' | 'method' | 'option' | 'rule' | 'pattern';
  /** Section types where it does its job. */
  where: Section['type'][];
  job: string;
  check?: 'html' | 'ctx2d' | 'webgl' | 'webgpu' | 'worker';
}

export const APIS: ApiUse[] = [
  { api: 'content="drawable"', kind: 'attribute', where: ['hero', 'band', 'toybox', 'programme', 'app', 'voices', 'passes', 'badge'], job: 'Set on every stage canvas so its children are laid out and can be drawn. Feature-detected through its reflection.', check: 'html' },
  { api: 'drawable', kind: 'attribute', where: ['hero', 'band', 'toybox', 'programme', 'app', 'voices', 'passes', 'badge'], job: 'Marks each poster, card, quote and badge as its own paint root.', check: 'html' },
  { api: 'Nested drawables', kind: 'rule', where: ['hero', 'badge'], job: 'The hero’s “Get a pass” button floats in front of its poster in 3D. The badge name gets its own two-colour print.', check: 'html' },
  { api: 'paint event', kind: 'event', where: ['hero', 'band', 'toybox', 'programme', 'app', 'voices', 'passes', 'badge'], job: 'Every canvas redraws from addEventListener("paint"). Typing your badge name repaints it with no extra code.', check: 'html' },
  { api: 'changedElements', kind: 'event', where: ['hero', 'band', 'voices'], job: 'Textures and worker snapshots are re-uploaded only for the elements that changed.', check: 'html' },
  { api: 'requestPaint()', kind: 'method', where: ['hero', 'toybox', 'programme', 'app', 'voices', 'band'], job: 'Drives animation (tilt, physics, the loupe, transitions) and stops as soon as things rest.', check: 'html' },
  { api: 'DOM edits in paint land next frame', kind: 'rule', where: ['programme'], job: 'The loupe marks the row under it from inside paint, and the canvas height follows the timetable a frame later.', check: 'html' },
  { api: 'Reverse tree order (nested canvases)', kind: 'rule', where: ['app'], job: 'The phone screen is a canvas inside a canvas. It paints first, so the outer canvas always draws fresh pixels.', check: 'html' },
  { api: 'drawElementImage(el, dx, dy)', kind: 'method', where: ['programme', 'app'], job: 'Draws the timetable and the phone at their natural size, crisp on any screen.', check: 'ctx2d' },
  { api: 'drawElementImage(el, dx, dy, dw, dh)', kind: 'method', where: ['badge'], job: 'Fits the badge into the preview at any width.', check: 'ctx2d' },
  { api: 'drawElementImage(el, sx, sy, sw, sh, dx, dy)', kind: 'method', where: ['passes'], job: 'Crops each pass to its side of the divider.', check: 'ctx2d' },
  { api: 'drawElementImage(el, sx, sy, sw, sh, dx, dy, dw, dh)', kind: 'method', where: ['programme', 'toybox'], job: 'Magnifies the timetable inside the loupe. Uses negative outsets to keep each card’s hard shadow (ink overflow).', check: 'ctx2d' },
  { api: 'preserveElementGeometry', kind: 'option', where: ['programme', 'passes', 'badge', 'band'], job: 'Decorative copies (the loupe, misprinted plates, repeated tape) never steal clicks from the real element.', check: 'ctx2d' },
  { api: 'Automatic geometry (2D)', kind: 'rule', where: ['toybox', 'app', 'programme'], job: 'Thrown, rotated cards stay clickable and focusable exactly where they land, with no hit-test code.', check: 'ctx2d' },
  { api: 'updateElementGeometry() · canvasTransform', kind: 'method', where: ['hero', 'voices', 'passes'], job: 'A perspective 4×4 matrix keeps the tilted 3D poster’s form usable. A translate places the WebGPU quote.', check: 'html' },
  { api: 'canvasClip', kind: 'option', where: ['passes'], job: 'Only the visible part of each pass takes clicks.', check: 'html' },
  { api: 'preserveHitTestOrder', kind: 'option', where: ['hero'], job: 'The poster is updated after its floating button without covering it in the hit-test stack.', check: 'html' },
  { api: 'getElementTransform()', kind: 'method', where: ['passes'], job: 'Lines the comparison slider up with where the pass was actually drawn.', check: 'html' },
  { api: 'clearElementGeometry()', kind: 'method', where: ['passes', 'voices'], job: 'Un-draws a pass you can’t see and quotes off stage, marking them offscreen for assistive tech.', check: 'html' },
  { api: 'getElementImageDefaultSize()', kind: 'method', where: ['hero', 'voices', 'band'], job: 'Sizes GPU textures and lays out the worker’s repeating tape.', check: 'html' },
  { api: 'texElementSubImage2D()', kind: 'method', where: ['hero'], job: 'Uploads the poster and its button into WebGL textures, pre-allocated with texImage2D(…, null).', check: 'webgl' },
  { api: 'WebGLCopyElementImageConfig', kind: 'option', where: ['hero'], job: 'Source outsets keep the button’s shadow. width/height rasterize it at the right texture size.', check: 'webgl' },
  { api: 'drawElementImageToTexture()', kind: 'method', where: ['voices'], job: 'Copies each quote into a GPUTexture for the shape-wipe shader, using a source rect for the overflowing quote mark.', check: 'webgpu' },
  { api: 'captureElementImage() · ElementImage', kind: 'method', where: ['band'], job: 'Snapshots the tape and transfers it to a worker. The worker close()s the old one.', check: 'worker' },
  { api: 'OffscreenCanvas drawElementImage', kind: 'method', where: ['band'], job: 'The lineup tape scrolls in a worker, off the main thread.', check: 'worker' },
  { api: 'elementgeometryupdate', kind: 'event', where: ['band'], job: 'Tells the page when the worker-drawn tape is in place and clickable.', check: 'worker' },
  { api: 'Focus rings painted · drawFocusIfNeeded()', kind: 'pattern', where: ['toybox', 'hero', 'programme'], job: 'Native focus rings show inside snapshots. Round cards get a ring that follows their shape.', check: 'ctx2d' },
  { api: 'Accessible by default · inert', kind: 'pattern', where: ['voices', 'passes', 'programme'], job: 'Headings, links and forms stay in the accessibility tree. Content that isn’t drawn gets inert, aria-hidden and tabindex=-1 (Chrome 157 ignores inert inside a drawable canvas), or hidden.', check: 'html' },
  { api: 'Read-back-allowed rendering', kind: 'rule', where: ['badge'], job: 'Same-origin fonts and art only, so the badge canvas is never tainted and exports to PNG.', check: 'ctx2d' },
  { api: 'Device-pixel canvas grid', kind: 'pattern', where: ['hero', 'band', 'toybox', 'programme', 'app', 'voices', 'passes', 'badge'], job: 'ResizeObserver on device-pixel-content-box keeps every canvas sharp, and requestPaint() redraws after a resize.', check: 'html' },
  { api: 'Fallback', kind: 'pattern', where: ['hero', 'band', 'toybox', 'programme', 'app', 'voices', 'passes', 'badge'], job: 'Without the API, the same markup stays ordinary HTML with CSS effects. Add ?fallback to the URL to try it.' },
];

/** Short API names shown as chips in a section header. */
export const chipsFor = (type: Section['type']): string[] =>
  APIS.filter((a) => a.where.includes(type) && a.kind !== 'pattern' && !['content="drawable"', 'drawable', 'paint event'].includes(a.api)).map((a) => a.api);
