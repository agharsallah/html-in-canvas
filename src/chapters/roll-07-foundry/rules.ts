/**
 * The foundry's rules, as pure functions shared by the shader lab, both
 * trial phases and tests/foundry-rules.test.ts.
 *
 * Why shaders must not move what you hit-test: in WebGL and WebGPU the
 * browser hit-tests drawable elements through the canvasTransform you pass
 * to updateElementGeometry (README, 5. Synchronizing the DOM and drawing).
 * A shader that moves pixels away from that geometry makes the picture and
 * the hit region disagree. Colour changes never do.
 *
 * WebGPU recipe (Chrome docs, webgpu.md): format "rgba8unorm", usage
 * TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT, size from
 * Math.ceil(getElementImageDefaultSize()), source rect "all four or none"
 * in CSS px, upload with device.queue.drawElementImageToTexture in `paint`.
 */

// ------------------------------------------------------------ the shader

export interface Effects {
  /** 0..1, colour only. */
  heat: number;
  /** 0..1, colour only. */
  grain: number;
  /** UV ripple amplitude in element CSS px: moves pixels. */
  ripple: number;
  /** Vertex droop in element CSS px: moves pixels. */
  melt: number;
}

/** Below this many CSS px of movement a click still lands on its control. */
export const DRIFT_TOLERANCE = 2;

/** Melt shape per column, 0.1..1. Mirrored exactly in the vertex shader. */
export const meltShape = (u: number, time: number): number => 0.55 + 0.45 * Math.sin(u * 0.045 + time * 0.6);

/** Ripple offset at an element point. Mirrored exactly in the fragment shader. */
export function rippleOffset(u: number, v: number, amp: number, time: number): { x: number; y: number } {
  return { x: amp * Math.sin(v * 0.09 + time * 2.0), y: amp * 0.5 * Math.cos(u * 0.07 + time * 1.7) };
}

/** The most any pixel can move away from the geometry, in CSS px. */
export function maxDrift(e: Effects): number {
  return Math.hypot(e.ripple, e.ripple * 0.5) + e.melt;
}

export const isColourOnly = (e: Effects): boolean => maxDrift(e) <= DRIFT_TOLERANCE;

/**
 * Which element point's content is on screen at geometry point (u, v)?
 * Melt moves each column down by meltShape × melt; ripple then samples
 * the texture at an offset.
 */
export function seenAt(u: number, v: number, e: Effects, time: number): { u: number; v: number } {
  const plane = { u, v: v - e.melt * meltShape(u, time) };
  const r = rippleOffset(plane.u, plane.v, e.ripple, time);
  return { u: plane.u + r.x, v: plane.v + r.y };
}

export interface Box { id: string; x: number; y: number; width: number; height: number }

export function boxAt(boxes: readonly Box[], u: number, v: number): string | null {
  return boxes.find((b) => u >= b.x && u <= b.x + b.width && v >= b.y && v <= b.y + b.height)?.id ?? null;
}

// --------------------------------------------------- trial: safe or melt

export interface EffectCard {
  id: string;
  title: string;
  code: string;
  /** How far drawn content moves from where geometry says it is (CSS px). */
  moves: number;
  /** True when the same movement is also sent through canvasTransform. */
  synced?: boolean;
  why: string;
}

export const breaksHitTesting = (card: Pick<EffectCard, 'moves' | 'synced'>): boolean => card.moves > DRIFT_TOLERANCE && !card.synced;

export const EFFECT_CARDS: readonly EffectCard[] = [
  { id: 'tint', title: 'Heat tint', code: 'color = mix(color, uHeatColor, 0.6);', moves: 0, why: 'Only the colour changes. Every pixel stays where the geometry says.' },
  { id: 'sag', title: 'Molten sag', code: 'pos.y -= 40.0 * sag(uv.x); // vertex shader', moves: 40, why: 'The vertices move 40 px, the geometry does not. Clicks land above the drawn buttons.' },
  { id: 'grain', title: 'Film grain', code: 'color += (hash(uv * 900.0) - 0.5) * 0.2;', moves: 0, why: 'Noise on the colour, not on the position.' },
  { id: 'ripple', title: 'Heat ripple', code: 'uv += 12.0 / size * sin(uv.yx * 40.0 + t);', moves: 12, why: 'Offsetting the texture lookup moves the picture by up to 12 px while the hit region stays put.' },
  { id: 'vignette', title: 'Vignette', code: 'color *= smoothstep(0.9, 0.3, length(uv - 0.5));', moves: 0, why: 'Darkens edges. Position untouched.' },
  { id: 'mirror', title: 'Mirror', code: 'uv.x = 1.0 - uv.x;', moves: 160, why: 'The buttons swap sides on screen but not in the DOM. A click on the left one hits the right one.' },
  { id: 'scale-loose', title: 'Swell, unsynced', code: 'pos.xy *= 1.5; // vertex shader only', moves: 80, why: 'The card grows on screen; the browser still hit-tests the old size.' },
  { id: 'scale-synced', title: 'Swell, synced', code: 'pos.xy *= 1.5; // and the same scale in canvasTransform', moves: 80, synced: true, why: 'It moves pixels, but the canvasTransform you send moves the hit region with them. Geometry and picture agree.' },
  { id: 'glow', title: 'Ember glow', code: 'color += uGlow * smoothstep(0.6, 1.0, lum);', moves: 0, why: 'Brightens light pixels in place.' },
];

// ---------------------------------------------- trial: the WebGPU order

export const USAGE_FLAGS = ['TEXTURE_BINDING', 'COPY_DST', 'RENDER_ATTACHMENT', 'COPY_SRC', 'STORAGE_BINDING'] as const;
export type UsageFlag = (typeof USAGE_FLAGS)[number];
export const REQUIRED_FLAGS: readonly UsageFlag[] = ['TEXTURE_BINDING', 'COPY_DST', 'RENDER_ATTACHMENT'];

export type GpuFormat = 'rgba8unorm' | 'depth24plus' | 'r8unorm';
export type SizeFrom = 'default-ceil' | 'default-raw' | 'offset-css';
export type Crop = 'none' | 'header-four' | 'header-two';
export type GpuCall = 'drawElementImageToTexture' | 'copyElementImageToTexture' | 'texElementSubImage2D';
export type When = 'paint' | 'load';

export interface GpuConfig {
  usage: UsageFlag[];
  format: GpuFormat;
  size: SizeFrom;
  crop: Crop;
  call: GpuCall;
  when: When;
}

export interface GpuOrder {
  id: string;
  title: string;
  brief: string;
  crop: Exclude<Crop, 'header-two'>;
}

export const ORDERS: readonly GpuOrder[] = [
  { id: 'readout', title: 'Order 1: the readout', brief: 'Cast the whole readout element into a texture the shader can sample, crisp at the screen’s resolution.', crop: 'none' },
  { id: 'header', title: 'Order 2: the header strip', brief: 'Same texture recipe, but copy only the header strip of the card (a source sub-rectangle).', crop: 'header-four' },
];

export function checkGpuConfig(order: GpuOrder, c: GpuConfig): string[] {
  const problems: string[] = [];
  const has = (f: UsageFlag) => c.usage.includes(f);
  if (!has('TEXTURE_BINDING')) problems.push('Without `TEXTURE_BINDING` the shader cannot sample the texture.');
  if (!has('COPY_DST')) problems.push('Without `COPY_DST` the texture cannot receive the copied snapshot.');
  if (!has('RENDER_ATTACHMENT')) problems.push('The guide’s recipe includes `RENDER_ATTACHMENT`: the element is rasterised into the texture.');
  const extra = c.usage.filter((f) => !REQUIRED_FLAGS.includes(f));
  if (extra.length) problems.push(`The guide’s recipe does not ask for ${extra.map((f) => `\`${f}\``).join(' or ')}. Keep usage to what the pipeline needs.`);
  if (c.format === 'depth24plus') problems.push('A depth format cannot hold a colour snapshot. The guide uses `rgba8unorm`.');
  if (c.format === 'r8unorm') problems.push('One channel loses colour. The guide uses `rgba8unorm`.');
  if (c.size === 'offset-css') problems.push('`offsetWidth` is CSS px, but texture sizes are texture px. Use the default size (grid px), rounded up.');
  if (c.size === 'default-raw') problems.push('Texture sizes are whole texels: round the default size up with `Math.ceil`.');
  if (c.crop === 'header-two') problems.push('Source rectangle fields come all four or none: `sourceX`, `sourceY`, `sourceWidth`, `sourceHeight`.');
  else if (c.crop !== order.crop) problems.push(order.crop === 'none' ? 'This order wants the whole element: leave the source rectangle out.' : 'This order wants only the header: give a source rectangle, all four fields, in CSS px.');
  if (c.call === 'copyElementImageToTexture') problems.push('`copyElementImageToTexture` is the legacy name from early builds. Use `drawElementImageToTexture` and keep the old name only as a fallback.');
  if (c.call === 'texElementSubImage2D') problems.push('`texElementSubImage2D` is WebGL. A WebGPU queue uses `drawElementImageToTexture`.');
  if (c.when === 'load') problems.push('Upload inside the `paint` event: there is no snapshot before the first rendering update, and a one-off copy never refreshes.');
  return problems;
}
