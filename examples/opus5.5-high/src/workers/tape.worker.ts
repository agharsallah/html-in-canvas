/// <reference lib="webworker" />
/**
 * Tape worker. Receives the transferred OffscreenCanvas and ElementImage
 * snapshots; draws two tapes that scroll in opposite directions.
 *
 * Workers have no DOM and no `paint` event: snapshots come from the main thread.
 * Each new ElementImage replaces the old one, which we close().
 */
export {};

interface Tape {
  image: ElementImage | null;
  /** Link centre inside the tape, CSS px. */
  linkX: number;
  width: number;
  height: number;
  offset: number;
}

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let canvas: OffscreenCanvas | null = null;
let scale = 1;
let paused = false;
let visible = true;
let raf = 0;
let last = 0;
let colors = { ink: '#16130f', paper: '#f2ede2' };
const tapes: Tape[] = [0, 1].map(() => ({ image: null, linkX: 0, width: 0, height: 0, offset: 0 }));
/** Pointer x in canvas CSS px, or null: the copy whose link is nearest it gets the geometry. */
let aim: number | null = null;
// Index 0 = facts (behind), 1 = names (front). Speeds in CSS px per second.
const SPEED = [-34, 52];
const ANGLE = [0.05, -0.07];

self.onmessage = (e: MessageEvent) => {
  const m = e.data;
  switch (m.type) {
    case 'init':
      canvas = m.canvas as OffscreenCanvas;
      ctx = canvas.getContext('2d');
      break;
    case 'size':
      if (!canvas) break;
      canvas.width = m.width;
      canvas.height = m.height;
      scale = m.scale;
      for (const tape of tapes) measure(tape);
      break;
    case 'colors':
      colors = { ink: m.ink, paper: m.paper };
      break;
    case 'image': {
      const tape = tapes[m.index as number];
      if (!tape || !canvas) break;
      tape.image?.close();
      tape.image = m.image as ElementImage;
      tape.linkX = m.linkX as number;
      measure(tape);
      break;
    }
    case 'aim':
      aim = m.x as number | null;
      break;
    case 'pause':
      paused = m.paused;
      break;
    case 'visible':
      visible = m.visible;
      break;
  }
  schedule();
  if (paused || !visible) draw(0); // a still frame still needs drawing after resizes and new snapshots
};

/** Default size of the snapshot in this canvas's grid px (OffscreenCanvas has the method too). */
function measure(tape: Tape): void {
  if (!canvas || !tape.image) return;
  const size = canvas.getElementImageDefaultSize(tape.image);
  tape.width = size.width;
  tape.height = size.height;
}

function schedule(): void {
  if (raf || paused || !visible) return;
  raf = requestAnimationFrame(tick);
}

function tick(now: number): void {
  raf = 0;
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  draw(dt);
  if (!paused && visible) schedule();
  else last = 0;
}

function draw(dt: number): void {
  if (!ctx || !canvas) return;
  const W = canvas.width, H = canvas.height;
  ctx.reset();
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, W, H);
  tapes.forEach((tape, i) => {
    if (!tape.image || !tape.width) return;
    tape.offset = (tape.offset + SPEED[i]! * scale * dt) % tape.width;
    const angle = ANGLE[i]!;
    const cx = W / 2, cy = H / 2 + (i === 0 ? H * 0.16 : -H * 0.04);
    ctx!.save();
    ctx!.translate(cx, cy);
    ctx!.rotate(angle);
    // Enough copies to cover the rotated band.
    // Copies overlap by one grid px so no hairline seam shows between them.
    const step = tape.width - 1;
    const span = Math.hypot(W, H) / 2 + step;
    const first = Math.floor((-span - tape.offset) / step);
    const count = Math.ceil((2 * span) / step) + 1;
    // One copy carries the geometry (and so the clickable link): the one whose link is
    // nearest the pointer, or the centre of the band when there is no pointer.
    const target = ((aim == null ? W / 2 : aim * scale) - cx) / Math.cos(angle);
    let primary = 0, best = Infinity;
    for (let k = 0; k < count; k++) {
      const x = (first + k) * step + tape.offset;
      const dist = Math.abs(x + tape.linkX * scale - target);
      if (dist < best) { best = dist; primary = k; }
    }
    for (let k = 0; k < count; k++) {
      const x = Math.round((first + k) * step + tape.offset);
      ctx!.drawElementImage(tape.image, x, -tape.height / 2, { preserveElementGeometry: k !== primary });
    }
    ctx!.restore();
  });
}
