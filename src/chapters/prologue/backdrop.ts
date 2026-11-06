/**
 * The Smudge: a low-resolution canvas scaled up with `image-rendering:
 * pixelated`, so every "pixel" is a fat, blurry tile. Pixels without meaning.
 *
 * Performance: computes colours straight into one ImageData buffer and
 * blits it, 8 times a second. (Setting `fillStyle` to an HSL string per
 * pixel meant parsing 1,296 colour strings per draw.)
 */
import { prefersReducedMotion } from '../../ui/dom';
import { throttledLoop } from '../../ui/fx/loop';

const W = 48;
const H = 27;

export function smudgeBackdrop(host: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'smudge';
  canvas.width = W;
  canvas.height = H;
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(W, H);
  const px = image.data;

  const draw = (t: number) => {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = Math.sin(x * 0.31 + t * 0.0004) + Math.cos(y * 0.27 - t * 0.0003) + Math.sin((x + y) * 0.13);
        // Pale blue-grey, lightness 85–99%: a cheap stand-in for hsl(215 18% L).
        const l = 0.92 + n * 0.022;
        const i = (y * W + x) * 4;
        px[i] = 255 * (l - 0.035);
        px[i + 1] = 255 * (l - 0.01);
        px[i + 2] = 255 * Math.min(1, l + 0.03);
        px[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  };

  let stop = () => {};
  // The mosaic crawls slowly; 8 fps is indistinguishable.
  if (prefersReducedMotion()) draw(0);
  else stop = throttledLoop(8, draw);
  return () => {
    stop();
    canvas.remove();
  };
}
