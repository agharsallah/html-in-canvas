/**
 * Darkroom props: developer, stop and fixer trays glowing with chemistry,
 * and the conical shades of the safelights.
 */
import { BoxGeometry, ConeGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';

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
      const liquid = new Mesh(
        new PlaneGeometry(1.36, 0.8),
        new MeshStandardMaterial({ color: '#0d0610', emissive: chem.color, emissiveIntensity: 0.32, roughness: 0.08, metalness: 0.7 }),
      );
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

export function createLampShade(): Mesh {
  return new Mesh(
    new ConeGeometry(0.42, 0.45, 24, 1, true),
    new MeshStandardMaterial({ color: '#1a0c18', roughness: 0.5, metalness: 0.6, side: DoubleSide }),
  );
}
