/**
 * The frame driver caps how often we draw and how often we ask the browser
 * for a paint, without ever dropping a changedElements entry.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFrameDriver, type FrameInfo } from '../src/hic/paint';

/** Just enough of a drawable canvas: requestPaint + paint events. */
class FakeCanvas extends EventTarget {
  requests = 0;
  requestPaint(): void {
    this.requests += 1;
  }
  paint(changed: Element[] = []): void {
    const event = Object.assign(new Event('paint'), { changedElements: changed });
    this.dispatchEvent(event);
  }
}

const el = (id: string) => ({ id }) as unknown as Element;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Simulate a 120 Hz display: a paint event every 8.33 ms for `ms`. */
function run120Hz(canvas: FakeCanvas, ms: number, changedAt: (i: number) => Element[] = () => []) {
  const steps = Math.round(ms / (1000 / 120));
  for (let i = 0; i < steps; i++) {
    vi.advanceTimersByTime(1000 / 120);
    canvas.paint(changedAt(i));
  }
}

describe('createFrameDriver (native)', () => {
  it('draws about 60 times a second on a 120 Hz display', () => {
    const canvas = new FakeCanvas();
    const frames: FrameInfo[] = [];
    const driver = createFrameDriver(canvas as unknown as HTMLCanvasElement, true, (f) => frames.push(f));
    driver.start();
    run120Hz(canvas, 1000);
    expect(frames.length).toBeGreaterThanOrEqual(55);
    expect(frames.length).toBeLessThanOrEqual(65);
    driver.stop();
  });

  it('never loses changedElements from skipped paints', () => {
    const canvas = new FakeCanvas();
    const delivered = new Set<string>();
    const driver = createFrameDriver(canvas as unknown as HTMLCanvasElement, true, ({ changed }) => {
      changed.forEach((e) => delivered.add((e as unknown as { id: string }).id));
    });
    driver.start();
    // A different element changes on every single paint, including skipped ones.
    run120Hz(canvas, 500, (i) => [el(`card-${i}`)]);
    run120Hz(canvas, 50); // let the last skipped change flush
    const expected = Array.from({ length: Math.round(500 / (1000 / 120)) }, (_, i) => `card-${i}`);
    expect([...delivered].sort()).toEqual(expected.sort());
    driver.stop();
  });

  it('throttles requestPaint itself when the cap is lowered', () => {
    const canvas = new FakeCanvas();
    const driver = createFrameDriver(canvas as unknown as HTMLCanvasElement, true, () => {});
    driver.start();
    driver.setMaxFps(30);
    canvas.requests = 0;
    canvas.paint(); // the browser answers the initial request
    // From here the browser only fires paint after a request.
    let paints = 0;
    for (let t = 0; t < 1000; t += 1000 / 120) {
      vi.advanceTimersByTime(1000 / 120);
      if (canvas.requests > paints) {
        paints = canvas.requests;
        canvas.paint();
      }
    }
    expect(canvas.requests).toBeGreaterThanOrEqual(25);
    expect(canvas.requests).toBeLessThanOrEqual(35);
    driver.stop();
  });

  it('stops requesting paints after stop()', () => {
    const canvas = new FakeCanvas();
    const driver = createFrameDriver(canvas as unknown as HTMLCanvasElement, true, () => {});
    driver.start();
    driver.stop();
    const before = canvas.requests;
    run120Hz(canvas, 200);
    vi.advanceTimersByTime(500);
    expect(canvas.requests).toBe(before);
  });
});
