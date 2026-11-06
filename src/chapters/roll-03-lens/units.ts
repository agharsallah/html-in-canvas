/**
 * The Unit Ledger: every value from the Chrome docs' units table
 * (concepts.md, "Convert CSS pixels to canvas grid coordinates", CC:313-324),
 * as data. The boss fight classifies each one; tests pin it to the table.
 */
export type Unit = 'css' | 'grid' | 'device' | 'texture';

export const UNIT_LABELS: Record<Unit, string> = {
  css: 'CSS px',
  grid: 'Canvas grid px',
  device: 'Device px',
  texture: 'Texture px',
};

export const UNITS: readonly Unit[] = ['css', 'grid', 'device', 'texture'];

export interface LedgerItem {
  id: string;
  /** The value, as code. */
  code: string;
  /** Where it appears. */
  context: string;
  unit: Unit;
  /** Why, in one sentence. Shown after every answer. */
  why: string;
}

export const LEDGER: readonly LedgerItem[] = [
  { id: 'canvas-width', code: 'canvas.width', context: 'The canvas attribute you set in the ResizeObserver.', unit: 'grid',
    why: '`canvas.width` and `canvas.height` are the canvas grid itself.' },
  { id: 'dx', code: 'dx', context: 'ctx.drawElementImage(el, dx, dy)', unit: 'grid',
    why: 'Destination positions are 2D drawing parameters: canvas grid px.' },
  { id: 'dwidth', code: 'dwidth', context: 'ctx.drawElementImage(el, dx, dy, dwidth, dheight)', unit: 'grid',
    why: 'Destination sizes are canvas grid px too.' },
  { id: 'translate', code: 'x', context: 'ctx.translate(x, y)', unit: 'grid',
    why: 'Every 2D canvas parameter, like `fillRect()` and `translate()`, is in canvas grid px.' },
  { id: 'default-size', code: '.width', context: 'canvas.getElementImageDefaultSize(el).width', unit: 'grid',
    why: 'The default size is reported in canvas grid coordinates.' },
  { id: 'sx', code: 'sx', context: 'ctx.drawElementImage(el, sx, sy, swidth, sheight, dx, dy)', unit: 'css',
    why: 'Source rectangles measure the element, so they are CSS px, even in the same call as grid-px destinations.' },
  { id: 'gpu-source', code: 'sourceWidth', context: 'device.queue.drawElementImageToTexture(source, destination)', unit: 'css',
    why: 'WebGPU source rectangles are CSS px, like every source rect.' },
  { id: 'canvas-transform', code: 'canvasTransform', context: 'canvas.updateElementGeometry(el, { canvasTransform })', unit: 'css',
    why: 'Element geometry (`canvasTransform`, `canvasClip`, `getElementTransform()`) is in CSS px.' },
  { id: 'offset-width', code: 'el.offsetWidth', context: 'A DOM measurement.', unit: 'css',
    why: 'DOM measurements are CSS px. Multiply by `scaleX` before drawing.' },
  { id: 'content-box', code: 'entry.contentBoxSize[0].inlineSize', context: 'A ResizeObserver entry.', unit: 'css',
    why: '`contentBoxSize` is the CSS box. It is not the size to give the grid.' },
  { id: 'device-box', code: 'entry.devicePixelContentBoxSize[0].inlineSize', context: 'A ResizeObserver entry.', unit: 'device',
    why: '`devicePixelContentBoxSize` counts physical pixels: the size a crisp grid needs.' },
  { id: 'tex-width', code: 'width', context: 'gl.texElementSubImage2D(…, el, { width, height })', unit: 'texture',
    why: 'Texture sizes are texture px. By default: the element’s size in grid px, rounded up.' },
];

export interface LedgerAnswer {
  correct: boolean;
  why: string;
}

export function classify(item: LedgerItem, unit: Unit): LedgerAnswer {
  const correct = item.unit === unit;
  return { correct, why: correct ? item.why : `Not ${UNIT_LABELS[unit]}. ${item.why}` };
}
