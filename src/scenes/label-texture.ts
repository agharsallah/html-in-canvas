/**
 * Small text textures for 3D props (element tags on fog cards, etc.).
 */
import { CanvasTexture, SRGBColorSpace } from 'three';

export interface LabelOptions {
  text: string;
  sub?: string;
  width?: number;
  height?: number;
  background: string;
  ink: string;
  accent: string;
}

export function labelTexture({ text, sub, width = 512, height = 320, background, ink, accent }: LabelOptions): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 18);
  ctx.fillStyle = ink;
  ctx.font = '600 92px "Atkinson Hyperlegible Mono", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 36, height / 2 - (sub ? 18 : 0));
  if (sub) {
    ctx.globalAlpha = 0.7;
    ctx.font = '400 40px "Atkinson Hyperlegible Next", sans-serif';
    ctx.fillText(sub, 38, height / 2 + 66);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A soft round sprite for particles (fog, dust, sparks). */
export function softDotTexture(color = '#ffffff'): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}
