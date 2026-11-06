/**
 * The optics of the lens grinder, as pure functions. The lab, the trial and
 * the unit tests all use them, so the game can't drift from the docs.
 *
 * Chrome docs, concepts.md "Sizing and units":
 *  - CSS px lay out; device px = CSS px × devicePixelRatio; the canvas grid
 *    (`width`/`height` attributes) is separate from both.
 *  - Every conversion that doesn't line up adds a round of blending. Crisp
 *    means: the canvas grid equals the device pixels the canvas covers.
 *  - scaleX = canvas.width / cssContentWidth, scaleY likewise.
 *  - drawElementImage draws the border box, so use box-sizing: border-box.
 */
export interface Size {
  width: number;
  height: number;
}

/** The standard canvas default grid (Chrome docs, concepts.md, CC:274, CC:282). */
export const DEFAULT_GRID: Size = { width: 300, height: 150 };

/** Device pixels a CSS box covers (what devicePixelContentBoxSize reports, up to snapping). */
export function devicePixels(css: Size, dpr: number): Size {
  return { width: Math.round(css.width * dpr), height: Math.round(css.height * dpr) };
}

/**
 * The grid the docs' ResizeObserver assigns: the device-pixel box when the
 * browser reports it, else Math.round(contentRect × devicePixelRatio).
 */
export function observedGrid(contentRect: Size, dpr: number, devicePixelContentBox?: Size): Size {
  return devicePixelContentBox ? { ...devicePixelContentBox } : devicePixels(contentRect, dpr);
}

export type GridPreset = 'default' | 'css' | 'device' | 'custom';

/** The grid each lab preset gives. `grind` is grid px per CSS px for 'custom'. */
export function presetGrid(preset: GridPreset, css: Size, device: Size, grind = 1): Size {
  switch (preset) {
    case 'default': return { ...DEFAULT_GRID };
    case 'css': return { width: Math.round(css.width), height: Math.round(css.height) };
    case 'device': return { ...device };
    case 'custom': return { width: Math.max(1, Math.round(css.width * grind)), height: Math.max(1, Math.round(css.height * grind)) };
  }
}

/** Canvas grid px per CSS px (CC:347-348). */
export function scaleFactors(grid: Size, cssContent: Size): { scaleX: number; scaleY: number } {
  return { scaleX: grid.width / cssContent.width, scaleY: grid.height / cssContent.height };
}

export type Verdict = 'crisp' | 'soft' | 'blurry';

export interface SizingReport {
  css: Size;
  grid: Size;
  device: Size;
  scaleX: number;
  scaleY: number;
  /** CSS px covered by one canvas px (horizontal). */
  cssPerGrid: number;
  /** Device px covered by one canvas px (horizontal). */
  devicePerGrid: number;
  /** True when the grid must be resampled onto the device grid. */
  resampled: boolean;
  /** Rounds of anti-aliasing an edge goes through: 1 if crisp, else 2. */
  blends: 1 | 2;
  /** Horizontal and vertical scales differ: the print is squashed. */
  stretched: boolean;
  /** 0–100. Exactly 100 only when the grid equals the device pixels. */
  sharpness: number;
  verdict: Verdict;
}

/**
 * How sharp HTML drawn into this canvas will look.
 *
 * The score is our own teaching scale, not a browser metric: detail lost to
 * a coarse grid (grid/device per axis), a 15% penalty for the second blend
 * of any resampling, and 20% more if the two axes scale differently.
 */
export function analyzeSizing(css: Size, grid: Size, device: Size): SizingReport {
  const { scaleX, scaleY } = scaleFactors(grid, css);
  const resampled = grid.width !== device.width || grid.height !== device.height;
  const stretched = Math.abs(scaleX / scaleY - 1) > 0.01;
  const detail = Math.sqrt(Math.min(1, grid.width / device.width) * Math.min(1, grid.height / device.height));
  const sharpness = resampled ? Math.round(100 * detail * 0.85 * (stretched ? 0.8 : 1)) : 100;
  return {
    css, grid, device, scaleX, scaleY,
    cssPerGrid: css.width / grid.width,
    devicePerGrid: device.width / grid.width,
    resampled,
    blends: resampled ? 2 : 1,
    stretched,
    sharpness,
    verdict: sharpness === 100 ? 'crisp' : sharpness >= 70 ? 'soft' : 'blurry',
  };
}

/** Centre an element, the docs' way (CC:364-376). All outputs in canvas grid px. */
export function centerElement(grid: Size, scale: { scaleX: number; scaleY: number }, offset: Size): Size & { x: number; y: number } {
  const width = offset.width * scale.scaleX;
  const height = offset.height * scale.scaleY;
  return { width, height, x: (grid.width - width) / 2, y: (grid.height - height) / 2 };
}

/**
 * Model of getElementImageDefaultSize(): the border box in canvas grid px.
 * The docs give the unit (grid px) and centre with offsetWidth × scaleX
 * (CC:369); the exact conversion is an open question, so this is a model.
 */
export function defaultDrawSize(offset: Size, scale: { scaleX: number; scaleY: number }): Size {
  return { width: offset.width * scale.scaleX, height: offset.height * scale.scaleY };
}

export interface BoxStyle {
  width: number;
  padding: number;
  border: number;
  boxSizing: 'content-box' | 'border-box';
}

/** offsetWidth of a box: the border box that drawElementImage draws (CC:379-388). */
export function borderBoxWidth({ width, padding, border, boxSizing }: BoxStyle): number {
  return boxSizing === 'border-box' ? width : width + 2 * padding + 2 * border;
}
