/**
 * Negatives: collectible cards, one per API primitive or key idea.
 * They live in the Album. A negative is earned by finishing a frame of a
 * roll, or by finding a secret.
 */
import type { RollId } from './rolls';
import type { FrameId } from '../game/state';

export type Rarity = 'common' | 'rare' | 'legendary' | 'secret';
export type NegativeKind = 'attribute' | 'event' | 'method' | 'object' | 'idea';

export interface Negative {
  id: string;
  name: string;
  kind: NegativeKind;
  rarity: Rarity;
  roll: RollId;
  /** Frame that awards it; absent for secrets awarded by code. */
  frame?: FrameId;
  /** One line, plain language, on the back of the card. */
  text: string;
  /** Optional signature or snippet. */
  code?: string;
}

export const NEGATIVES: readonly Negative[] = [
  // Prologue
  { id: 'why', name: 'Why HTML-in-Canvas', kind: 'idea', rarity: 'common', roll: 'prologue', frame: 'story',
    text: 'Canvas text has no layout, no accessibility and no i18n. Real HTML brings all three.' },
  { id: 'use-cases', name: 'Five use cases', kind: 'idea', rarity: 'rare', roll: 'prologue', frame: 'trial',
    text: 'Styled content, accessibility, effects on HTML, HTML in 3D, and media export.' },

  // Roll 1: content + drawable
  { id: 'content-attr', name: 'content="drawable"', kind: 'attribute', rarity: 'rare', roll: 'fog', frame: 'story',
    text: 'Opts canvas children into layout. The default, "fallback", keeps them as fallback content.',
    code: '<canvas content="drawable">' },
  { id: 'drawable-attr', name: 'drawable', kind: 'attribute', rarity: 'rare', roll: 'fog', frame: 'lab',
    text: 'Marks a child as drawable. Implies isolation: isolate and makes it a containing block.',
    code: '<div drawable>…</div>' },
  { id: 'nested-drawables', name: 'Nested drawables', kind: 'idea', rarity: 'rare', roll: 'fog', frame: 'trial',
    text: 'A drawable subtree stops at drawable descendants. Draw those separately.' },

  // Roll 2: paint
  { id: 'paint-event', name: 'paint', kind: 'event', rarity: 'legendary', roll: 'bells', frame: 'story',
    text: 'Fires once per rendering update, after Paint, when a drawable would look different.',
    code: "canvas.addEventListener('paint', draw)" },
  { id: 'changed-elements', name: 'changedElements', kind: 'object', rarity: 'common', roll: 'bells', frame: 'lab',
    text: 'The list of drawable descendants whose snapshot changed this update.' },
  { id: 'request-paint', name: 'requestPaint()', kind: 'method', rarity: 'rare', roll: 'bells', frame: 'trial',
    text: 'Asks for one paint event next update even if nothing changed. The canvas rAF.',
    code: 'canvas.requestPaint()' },

  // Later rolls (sealed chapters still list their cards so the Album shows the full set)
  { id: 'draw-element-image', name: 'drawElementImage()', kind: 'method', rarity: 'legendary', roll: 'projector', frame: 'story',
    text: "Draws an element's last snapshot into a 2D canvas, from its border box.",
    code: 'ctx.drawElementImage(el, dx, dy)' },
  { id: 'source-rect', name: 'Source rect', kind: 'idea', rarity: 'common', roll: 'projector', frame: 'trial',
    text: 'sx, sy, sw, sh crop the snapshot or reach into ink overflow.' },
  { id: 'nested-canvases', name: 'Nested canvases', kind: 'idea', rarity: 'rare', roll: 'projector', frame: 'lab',
    text: 'A drawable canvas inside another paints first, so the outer one draws its fresh pixels.' },
  { id: 'ink-overflow', name: 'Past the border box', kind: 'idea', rarity: 'secret', roll: 'projector',
    text: 'You pushed a source rect outside the border box, where ink overflow such as a glow lives.' },
  { id: 'device-pixel-box', name: 'device-pixel-content-box', kind: 'idea', rarity: 'rare', roll: 'lens', frame: 'lab',
    text: 'ResizeObserver box that reports exact device pixels, so the canvas grid stays sharp.' },
  { id: 'default-size', name: 'getElementImageDefaultSize()', kind: 'method', rarity: 'common', roll: 'lens', frame: 'trial',
    text: "An element's natural size in canvas grid coordinates." },
  { id: 'units-table', name: 'The units table', kind: 'idea', rarity: 'rare', roll: 'lens', frame: 'story',
    text: 'Grid px for canvas sizes and drawing; CSS px for source rects, geometry and the DOM; device px for devicePixelContentBoxSize.' },
  { id: 'secret-zoom-lens', name: 'The zoom lens', kind: 'idea', rarity: 'secret', roll: 'lens',
    text: 'You zoomed the page mid-lab: devicePixelRatio changed and the ResizeObserver reported new device pixels.' },
  { id: 'update-geometry', name: 'updateElementGeometry()', kind: 'method', rarity: 'legendary', roll: 'mirrors', frame: 'story',
    text: 'Tells the DOM where an element was drawn so hit testing and a11y line up.' },
  { id: 'canvas-clip', name: 'canvasClip', kind: 'object', rarity: 'common', roll: 'mirrors', frame: 'lab',
    text: 'Limits hit testing to the part of the element you actually drew.' },
  { id: 'preserve-geometry', name: 'preserveElementGeometry', kind: 'object', rarity: 'rare', roll: 'mirrors', frame: 'trial',
    text: 'Stops drawElementImage from moving the DOM geometry for you.' },
  { id: 'clear-geometry', name: 'clearElementGeometry()', kind: 'method', rarity: 'common', roll: 'mirrors', frame: 'practice',
    text: 'Un-draws an element without removing it: no hit testing, offscreen for accessibility.',
    code: 'canvas.clearElementGeometry(el)' },
  { id: 'hit-test-order', name: 'preserveHitTestOrder', kind: 'object', rarity: 'rare', roll: 'mirrors', frame: 'trial',
    text: 'Every geometry update lifts an element to the top of the hit-test stack, unless it is already in it and this is true.' },
  { id: 'tex-element', name: 'texElementSubImage2D()', kind: 'method', rarity: 'legendary', roll: 'observatory', frame: 'story',
    text: "Copies an element's snapshot into a WebGL texture." },
  { id: 'webgl-config', name: 'WebGLCopyElementImageConfig', kind: 'object', rarity: 'rare', roll: 'observatory', frame: 'lab',
    text: 'sx, sy, swidth, sheight crop the source in CSS px; width and height size the copy in texture px.' },
  { id: 'projective-hit', name: '3D hit testing', kind: 'idea', rarity: 'rare', roll: 'observatory', frame: 'trial',
    text: '3D contexts must call updateElementGeometry; a tilted card needs the whole projective matrix.' },
  { id: 'gpu-texture', name: 'drawElementImageToTexture()', kind: 'method', rarity: 'legendary', roll: 'foundry', frame: 'story',
    text: 'The WebGPU queue method that copies an element into a GPU texture.' },
  { id: 'usage-flags', name: 'Texture usage flags', kind: 'idea', rarity: 'common', roll: 'foundry', frame: 'lab',
    text: 'The Chrome guide creates the texture with TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT, format rgba8unorm.' },
  { id: 'colour-only', name: 'Colour-only shaders', kind: 'idea', rarity: 'rare', roll: 'foundry', frame: 'trial',
    text: 'Shaders may change colour freely. Moving pixels away from the geometry you sent makes clicks miss.' },
  { id: 'element-image', name: 'ElementImage', kind: 'object', rarity: 'rare', roll: 'railway', frame: 'story',
    text: 'A transferable reference to a snapshot, from captureElementImage(), for drawing in a worker. It has close(); the README does not say what closing frees.' },
  { id: 'geometry-update-event', name: 'elementgeometryupdate', kind: 'event', rarity: 'rare', roll: 'railway', frame: 'trial',
    text: 'Fires on the canvas when batched worker geometry updates have been applied.' },
  { id: 'capture-element-image', name: 'captureElementImage()', kind: 'method', rarity: 'common', roll: 'railway', frame: 'lab',
    text: 'Captures the latest snapshot of a drawable as an ElementImage. Call it in paint, then post it to a worker.',
    code: 'worker.postMessage({ form: img }, [img])' },
  { id: 'a11y-tree', name: 'Accessible by default', kind: 'idea', rarity: 'rare', roll: 'lighthouse', frame: 'story',
    text: 'Drawable content is in the accessibility tree, like any DOM.' },
  { id: 'focus-ring', name: 'drawFocusIfNeeded()', kind: 'method', rarity: 'common', roll: 'lighthouse', frame: 'trial',
    text: 'Draws a focus ring for a focused element on a path you choose.' },
  { id: 'inert', name: 'inert', kind: 'attribute', rarity: 'common', roll: 'lighthouse', frame: 'lab',
    text: 'Silences a view you no longer draw: out of the accessibility tree, the Tab order and hit testing.',
    code: 'backFace.inert = true' },
  { id: 'secret-ghost-focus', name: 'Ghost focus', kind: 'idea', rarity: 'secret', roll: 'lighthouse',
    text: 'You tabbed onto a node that aria-hidden had silenced. aria-hidden hides from screen readers, not from the keyboard.' },
  { id: 'read-back', name: 'Read-back-allowed', kind: 'idea', rarity: 'legendary', roll: 'vault', frame: 'story',
    text: 'Snapshots leave out cross-origin data, visited links, spelling marks, and system colors and themes (how that squares with forced-colors is still an open question).' },
  { id: 'never-painted', name: 'Never painted', kind: 'idea', rarity: 'rare', roll: 'vault', frame: 'lab',
    text: 'Cross-origin content, visited links, spelling marks, autofill previews, system colours, captions and IME pop-ups stay out of every snapshot.' },
  { id: 'fully-active', name: 'Fully active only', kind: 'idea', rarity: 'common', roll: 'vault', frame: 'trial',
    text: 'The API only works in fully active documents, adds no persistent state, and behaves the same in private browsing.' },
  { id: 'option-c', name: 'Option C', kind: 'idea', rarity: 'rare', roll: 'clockwork', frame: 'trial',
    text: 'paint fires once, right after Paint. DOM changes inside it land next update.' },
  { id: 'update-rendering', name: 'Update the rendering', kind: 'idea', rarity: 'common', roll: 'clockwork', frame: 'story',
    text: 'rAF callbacks, style and layout, resize observers, intersection observations, Paint, the paint event, commit.' },
  { id: 'webgl-flush', name: 'No placeholders', kind: 'idea', rarity: 'rare', roll: 'clockwork', frame: 'lab',
    text: 'WebGL calls like getError() must flush, so paint runs only once the complete display list exists.' },
  { id: 'auto-updating', name: 'Auto-updating canvas', kind: 'idea', rarity: 'rare', roll: 'epilogue', frame: 'story',
    text: 'A future mode that replays canvas commands on threaded scroll and animation.' },
  { id: 'escape-hatch', name: 'Escape hatch', kind: 'idea', rarity: 'rare', roll: 'epilogue', frame: 'lab',
    text: 'Detect support first. Without it: an alternative UI, HTML overlays, three-html-render, html2canvas or dom-to-image.' },
  { id: 'library-support', name: 'Library support', kind: 'idea', rarity: 'common', roll: 'epilogue', frame: 'trial',
    text: 'three.js, PlayCanvas, Babylon.js, PixiJS and CanvasUI have added experimental HTML-in-Canvas support.' },

  // Secrets: awarded by code, not by frames
  { id: 'secret-caret', name: "Caret's blink", kind: 'idea', rarity: 'secret', roll: 'prologue',
    text: 'Caret blink rate is not sensitive. That is why Caret can blink in a snapshot.' },
  { id: 'secret-keyboard', name: 'Tab walker', kind: 'idea', rarity: 'secret', roll: 'fog',
    text: 'You reached a print with the keyboard. Focus works inside a canvas.' },
  { id: 'secret-mirror', name: 'The mirror’s edge', kind: 'idea', rarity: 'secret', roll: 'mirrors',
    text: 'You stopped syncing a turning 3D card and clicked where it used to be. It answered: geometry, not pixels, decides.' },
  { id: 'secret-same-origin', name: 'Same-origin window', kind: 'idea', rarity: 'secret', roll: 'vault',
    text: 'You spied on a same-origin frame and it developed. Only cross-origin content inside a frame is blacked out.' },
  { id: 'secret-full-turn', name: 'Full turn', kind: 'idea', rarity: 'secret', roll: 'epilogue',
    text: 'You walked all the way around your exhibition. Every negative you develop joins the reel.' },
  { id: 'secret-deadlock', name: 'The Deadlock', kind: 'idea', rarity: 'secret', roll: 'clockwork',
    text: 'You jammed Option A: a flush waiting on Paint, inside a handler that Paint was waiting on.' },
  { id: 'secret-express', name: 'The express', kind: 'idea', rarity: 'secret', roll: 'railway',
    text: 'Every frame captured, a slow worker, and still on time: draw the newest image and close the rest.' },
  { id: 'secret-far-side', name: 'The far side', kind: 'idea', rarity: 'secret', roll: 'observatory',
    text: 'You clicked the satellite while its form faced away. Inert, it let the click fall through to the canvas.' },
  { id: 'secret-melted-miss', name: 'Melted miss', kind: 'idea', rarity: 'secret', roll: 'foundry',
    text: 'You clicked a melted button where you saw it, and missed. The shader moved the pixels, not the geometry.' },
];

export function negativesFor(roll: RollId, frame: FrameId): Negative[] {
  return NEGATIVES.filter((n) => n.roll === roll && n.frame === frame);
}

export function getNegative(id: string): Negative | undefined {
  return NEGATIVES.find((n) => n.id === id);
}
