/**
 * Darkroom props: developer, stop and fixer trays glowing with chemistry,
 * and the conical shades of the safelights.
 */
import {
  BoxGeometry, CanvasTexture, ConeGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace,
} from 'three';

const CHEMISTRY = [
  { name: 'developer', color: '#2ee6c0' },
  { name: 'stop', color: '#ffb547' },
  { name: 'fixer', color: '#ff4fa3' },
];

const trayBody = new MeshStandardMaterial({ color: '#2a1529', roughness: 0.6, metalness: 0.1 });

export function createTrays(start: number, end: number): Group {
  const group = new Group();
  const spacing = 1.75;
  let index = 0;
  // The bench sits in the empty band below the prints, close to the camera,
  // each tray tipped toward the viewer so its chemistry reads as a glow.
  // Start after the first prints: the hero tray owns the left end of the line.
  for (let x = Math.max(start + 3, 6); x < end - 2; x += 9) {
    CHEMISTRY.forEach((chem, i) => {
      const tray = new Mesh(new BoxGeometry(1.5, 0.14, 0.95), trayBody);
      tray.position.set(x + i * spacing - spacing, -1.12, 1.7);
      tray.rotation.x = 0.35;
      const liquid = new Mesh(new PlaneGeometry(1.36, 0.8), liquidMaterial(chem.color));
      liquid.rotation.x = -Math.PI / 2;
      liquid.position.y = 0.075;
      liquid.name = `${chem.name}-${index}`;
      tray.add(liquid);
      group.add(tray);
    });
    index += 1;
  }
  return group;
}

const liquids = new Map<string, MeshBasicMaterial>();

/**
 * Chemistry seen from above: dark liquid lit from within, a few rings from a
 * drip, and a sheen of reflected safelight. Painted once into a small
 * texture per colour, so the trays cost one unlit draw each.
 */
function liquidMaterial(color: string): MeshBasicMaterial {
  const cached = liquids.get(color);
  if (cached) return cached;
  const w = 256;
  const hgt = 150;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hgt;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b0610';
  ctx.fillRect(0, 0, w, hgt);
  const glow = ctx.createRadialGradient(w * 0.45, hgt * 0.55, 4, w * 0.45, hgt * 0.55, w * 0.62);
  glow.addColorStop(0, color);
  glow.addColorStop(0.45, `${color}66`);
  glow.addColorStop(1, '#0b061000');
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, hgt);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  [18, 34, 54, 78].forEach((r, i) => {
    ctx.globalAlpha = 0.5 - i * 0.11;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(w * 0.62, hgt * 0.42, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  const sheen = ctx.createLinearGradient(0, 0, w, hgt);
  sheen.addColorStop(0.15, 'rgba(255,190,160,0)');
  sheen.addColorStop(0.3, 'rgba(255,190,160,0.22)');
  sheen.addColorStop(0.42, 'rgba(255,190,160,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, hgt);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new MeshBasicMaterial({ map: texture });
  liquids.set(color, material);
  return material;
}

export function createLampShade(): Mesh {
  return new Mesh(
    new ConeGeometry(0.42, 0.45, 24, 1, true),
    new MeshStandardMaterial({ color: '#1a0c18', roughness: 0.5, metalness: 0.6, side: DoubleSide }),
  );
}
