/**
 * Roll 06 diorama: the globe and the satellite. Each story line changes what
 * the satellite carries: empty allocated storage, an uploaded form, a
 * cropped copy, an upside-down upload, and finally a hit region glued to the
 * tilted face. Foe lines flatten the world.
 */
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { createOrbitScene } from '../../scenes/orbit-scene';
import type { ChapterModule } from '../shared/chapter';
import { story } from './story';

function poster(crop: boolean): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f8ff';
  ctx.fillRect(0, 0, 640, 400);
  ctx.fillStyle = '#123b73';
  ctx.fillRect(0, 0, 640, 84);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px "Bodoni Moda", serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ground control', 30, 44);
  if (crop) {
    ctx.clearRect(0, 96, 640, 304);
  } else {
    ctx.font = '400 26px "Atkinson Hyperlegible Next", sans-serif';
    [['Call sign', 'CYAN-1'], ['Message', 'Hello, round world']].forEach(([label, value], i) => {
      const y = 130 + i * 84;
      ctx.fillStyle = '#123b73';
      ctx.fillText(label!, 30, y);
      ctx.strokeStyle = '#123b73';
      ctx.lineWidth = 3;
      ctx.strokeRect(210, y - 28, 400, 56);
      ctx.fillText(value!, 226, y);
    });
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(30, 300, 190, 64);
    ctx.fillStyle = '#123b73';
    ctx.font = '700 28px "Atkinson Hyperlegible Next", sans-serif';
    ctx.fillText('Transmit', 66, 333);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function emptyStorage(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0d2c57';
  ctx.fillRect(0, 0, 320, 200);
  ctx.strokeStyle = 'rgba(241, 246, 253, 0.45)';
  for (let x = 0; x <= 320; x += 20) ctx.strokeRect(x, 0, 0.01, 200);
  for (let y = 0; y <= 200; y += 20) ctx.strokeRect(0, y, 320, 0.01);
  ctx.fillStyle = '#f1f6fd';
  ctx.font = '600 18px "Atkinson Hyperlegible Mono", monospace';
  ctx.fillText('texImage2D(…, null)', 70, 104);
  return new CanvasTexture(canvas);
}

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createOrbitScene(host, roll.process, 'diorama');
  const full = poster(false);
  const header = poster(true);
  const flipped = full.clone();
  flipped.flipY = false;
  flipped.needsUpdate = true;
  const empty = emptyStorage();
  let timer = 0;
  let firstFoe = -1;

  const show = (texture: Texture | null, pulse = false) => {
    scene.setMap(texture);
    if (pulse) scene.pulse();
  };

  return {
    onLine(index) {
      clearTimeout(timer);
      const line = story[index];
      const id = line?.concept?.id;
      const foe = line?.speaker === 'foe';
      if (foe && firstFoe < 0) firstFoe = index;
      scene.setFlat(foe);
      const geometryTaught = story.slice(0, index + 1).some((l) => l.concept?.id === 'geometry-3d');
      scene.setOutline(foe && index > firstFoe ? 'flat' : geometryTaught ? 'projective' : 'none');
      scene.setMotion(id === 'projective-matrix' ? 'spin' : 'sway');
      if (index < 2) show(null);
      else if (id === 'pre-allocate') show(empty);
      else if (id === 'copy-config') show(header, true);
      else if (id === 'texture-setup') {
        show(flipped, true);
        timer = window.setTimeout(() => show(full, true), 1600);
      } else show(full, id === 'tex-sub-image' || id === 'upload-changed' || id === 'legacy-tex');
    },
    destroy() {
      clearTimeout(timer);
      [full, header, flipped, empty].forEach((t) => t.dispose());
      scene.destroy();
    },
  };
};
