/**
 * Keep the canvas grid on device pixels, as the Chrome docs recommend, and
 * report the grid-px-per-CSS-px ratio (`scaleX`, `scaleY`) every draw needs.
 *
 *  - `canvas.width/height`, drawElementImage dx/dy/dw/dh, getElementImageDefaultSize: grid px
 *  - source rects, canvasTransform, canvasClip, offsetWidth, pointer coords: CSS px
 */
export interface Grid {
  /** Canvas grid size in grid px (device px when supported). */
  width: number;
  height: number;
  /** Canvas content box in CSS px. */
  cssWidth: number;
  cssHeight: number;
  /** Grid px per CSS px. */
  scaleX: number;
  scaleY: number;
}

export interface GridOptions {
  /** Apply the size to the canvas (false for transferred / GPU-managed canvases). */
  apply?: boolean;
  /** Cap the device scale on huge or very dense screens. */
  maxScale?: number;
}

const supportsDeviceBox =
  typeof ResizeObserverEntry !== 'undefined' && 'devicePixelContentBoxSize' in ResizeObserverEntry.prototype;

export function observeGrid(canvas: HTMLCanvasElement, onResize: (grid: Grid) => void, { apply = true, maxScale = 3 }: GridOptions = {}): () => void {
  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const cssWidth = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
    const cssHeight = entry.contentBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
    if (cssWidth <= 0 || cssHeight <= 0) return;
    const dpc = entry.devicePixelContentBoxSize?.[0];
    let width = dpc ? dpc.inlineSize : Math.round(cssWidth * devicePixelRatio);
    let height = dpc ? dpc.blockSize : Math.round(cssHeight * devicePixelRatio);
    // Defensive: some emulated environments report a device box at CSS size while devicePixelRatio > 1.
    if (dpc && width < Math.round(cssWidth * devicePixelRatio) - 2) {
      width = Math.round(cssWidth * devicePixelRatio);
      height = Math.round(cssHeight * devicePixelRatio);
    }
    if (width / cssWidth > maxScale) {
      width = Math.round(cssWidth * maxScale);
      height = Math.round(cssHeight * maxScale);
    }
    width = Math.max(1, width);
    height = Math.max(1, height);
    if (apply && (canvas.width !== width || canvas.height !== height)) {
      // Assigning width/height clears the bitmap...
      canvas.width = width;
      canvas.height = height;
    }
    onResize({ width, height, cssWidth, cssHeight, scaleX: width / cssWidth, scaleY: height / cssHeight });
    // ...so ask for a paint to draw it again.
    canvas.requestPaint?.();
  });
  observer.observe(canvas, supportsDeviceBox ? { box: 'device-pixel-content-box' } : {});
  return () => observer.disconnect();
}
