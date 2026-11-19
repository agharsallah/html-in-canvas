/**
 * The paint loop every live section shares.
 *
 *  - Listens with addEventListener('paint'): `onpaint` is a single slot that a
 *    library could overwrite, so we never use it.
 *  - The browser fires `paint` by itself whenever a drawable's snapshot changes
 *    (text, style, layout, focus). That alone covers static posters.
 *  - While something moves, the draw callback returns `true` and we call
 *    `requestPaint()` from inside the handler: the canvas's requestAnimationFrame.
 *    Off-screen sections stop requesting, so idle cost is zero.
 */
export interface Frame {
  /** Seconds since the previous frame (clamped). */
  dt: number;
  /** Seconds since the loop was created. */
  time: number;
  /** Drawables whose snapshot changed in this rendering update. */
  changed: readonly Element[];
}

export class PaintLoop {
  private last = 0;
  private readonly born = performance.now();
  private visible = true;
  private wantsMore = false;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly draw: (frame: Frame) => boolean,
  ) {
    canvas.addEventListener('paint', (event) => this.onPaint(event));
    new IntersectionObserver(([entry]) => {
      this.visible = !!entry?.isIntersecting;
      if (this.visible && this.wantsMore) this.kick();
    }, { rootMargin: '120px' }).observe(canvas);
  }

  /** Ask for a frame now (e.g. after input). */
  kick(): void {
    this.canvas.requestPaint();
  }

  private onPaint(event: CanvasPaintEvent): void {
    const now = performance.now();
    const dt = this.last ? Math.min((now - this.last) / 1000, 1 / 20) : 1 / 60;
    this.last = now;
    this.wantsMore = this.draw({ dt, time: (now - this.born) / 1000, changed: event.changedElements ?? [] });
    if (this.wantsMore && this.visible) this.canvas.requestPaint();
    else this.last = 0;
  }
}
