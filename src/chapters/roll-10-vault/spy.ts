/**
 * The spy: what a script could learn by reading the canvas back.
 *
 * Native mode runs a real probe for the visited link: `getImageData()` over
 * the link's box in the drawn snapshot, counting pixels close to the
 * visited purple versus the unvisited blue. Everything else is answered by
 * the rules in rules.ts and labelled as modelled.
 */
import { itemById, spyReads } from './rules';

export const VISITED_RGB: readonly [number, number, number] = [155, 31, 209];
export const UNVISITED_RGB: readonly [number, number, number] = [29, 91, 216];

export interface PixelTally {
  visited: number;
  unvisited: number;
}

const dist = (data: Uint8ClampedArray, i: number, [r, g, b]: readonly [number, number, number]) =>
  Math.hypot(data[i]! - r, data[i + 1]! - g, data[i + 2]! - b);

/** Count RGBA pixels that look like visited-purple or unvisited-blue ink. */
export function tallyLinkPixels(data: Uint8ClampedArray, threshold = 90): PixelTally {
  const tally: PixelTally = { visited: 0, unvisited: 0 };
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const toVisited = dist(data, i, VISITED_RGB);
    const toUnvisited = dist(data, i, UNVISITED_RGB);
    if (Math.min(toVisited, toUnvisited) > threshold) continue;
    if (toVisited < toUnvisited) tally.visited += 1;
    else tally.unvisited += 1;
  }
  return tally;
}

export interface SpyReport {
  item: string;
  readable: boolean;
  text: string;
  /** True when the answer came from real read-back, not the model. */
  measured: boolean;
  /** Native probe found nothing to measure yet. */
  inconclusive?: boolean;
}

/** Read the link's pixels from a real drawn snapshot. */
export function probeVisitedNative(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; width: number; height: number }): SpyReport {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const w = Math.max(1, Math.min(ctx.canvas.width - x, Math.ceil(rect.width)));
  const hgt = Math.max(1, Math.min(ctx.canvas.height - y, Math.ceil(rect.height)));
  const tally = tallyLinkPixels(ctx.getImageData(x, y, w, hgt).data);
  const readable = tally.visited > tally.unvisited;
  if (!tally.visited && !tally.unvisited) {
    return { item: 'visited', readable: false, measured: true, inconclusive: true, text: 'getImageData found no link ink yet: the first snapshot is still developing. Try again in a moment.' };
  }
  return {
    item: 'visited',
    readable,
    measured: true,
    text: `getImageData over the link: ${tally.unvisited} blue px, ${tally.visited} purple px. ${readable ? 'It looks visited: that would be a leak!' : 'It reads as unvisited. Your history stays private.'}`,
  };
}

/** The modelled answer for any specimen. */
export function modelReport(item: string, redaction: boolean): SpyReport {
  const readable = spyReads(item, redaction) === 'readable';
  const rule = itemById(item);
  const verdict = rule?.status === 'painted'
    ? 'The spy can read it, by design: it is not sensitive.'
    : readable ? 'LEAK: with the photocopier off, the spy reads it.' : 'Blacked out. The spy reads nothing.';
  return { item, readable, measured: false, text: verdict };
}
