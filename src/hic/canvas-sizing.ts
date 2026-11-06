/**
 * Keeps a canvas' drawing buffer ("canvas grid") matched to device pixels.
 *
 * The Chrome docs and the four single-file examples use `ResizeObserver` with the
 * `device-pixel-content-box` box: it reports the exact number of physical
 * pixels the canvas covers, so HTML drawn with `drawElementImage` stays crisp.
 * (The WebGPU jelly slider is the exception: it observes the default box.)
 */

export interface CanvasSize {
  /** Size of the canvas grid in device pixels. */
  device: { width: number; height: number };
  /** Size of the canvas box in CSS pixels. */
  css: { width: number; height: number };
  /** device / css. Usually devicePixelRatio, clamped by `maxScale`. */
  scale: number;
}

export interface SizingOptions {
  /** Cap the device scale to keep large/hi-dpi screens affordable. */
  maxScale?: number;
  /** When false the caller applies the size (e.g. a WebGL renderer). */
  applyToCanvas?: boolean;
}

export function measureEntry(entry: ResizeObserverEntry, maxScale = Infinity): CanvasSize {
  const cssBox = entry.contentBoxSize?.[0];
  const cssWidth = cssBox ? cssBox.inlineSize : entry.contentRect.width;
  const cssHeight = cssBox ? cssBox.blockSize : entry.contentRect.height;

  const deviceBox = entry.devicePixelContentBoxSize?.[0];
  let width = deviceBox ? deviceBox.inlineSize : Math.round(cssWidth * devicePixelRatio);
  let height = deviceBox ? deviceBox.blockSize : Math.round(cssHeight * devicePixelRatio);

  const scale = cssWidth > 0 ? width / cssWidth : 1;
  if (scale > maxScale) {
    width = Math.round(cssWidth * maxScale);
    height = Math.round(cssHeight * maxScale);
  }

  return {
    device: { width: Math.max(1, width), height: Math.max(1, height) },
    css: { width: cssWidth, height: cssHeight },
    scale: Math.min(scale, maxScale),
  };
}

/**
 * Observe a canvas and keep its grid in sync. Returns a disconnect function.
 */
export function observeCanvasSize(
  canvas: HTMLCanvasElement,
  onResize: (size: CanvasSize) => void,
  { maxScale = Infinity, applyToCanvas = true }: SizingOptions = {},
): () => void {
  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const size = measureEntry(entry, maxScale);
    if (applyToCanvas) {
      canvas.width = size.device.width;
      canvas.height = size.device.height;
    }
    onResize(size);
  });

  try {
    observer.observe(canvas, { box: 'device-pixel-content-box' });
  } catch {
    // Safari: the box option is unsupported; contentRect * dpr is close enough.
    observer.observe(canvas);
  }
  return () => observer.disconnect();
}
