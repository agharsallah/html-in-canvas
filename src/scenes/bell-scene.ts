/**
 * Roll 02 diorama: the bronze bell. Every ring is a `paint` event. Rings
 * caused by a real change glow in the accent colour; rings from a bare
 * requestPaint() glow in the second colour, so the two read differently.
 */
import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, Group, LatheGeometry, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PointLight, SphereGeometry, TorusGeometry, Vector2,
} from 'three';
import { MiniStage } from './mini-stage';

export type RingKind = 'change' | 'request';

export interface BellScene {
  ring(kind: RingKind): void;
  destroy(): void;
}

const MAX_RINGS = 14;

export function createBellScene(host: HTMLElement, colors: { accent: string; second: string; glow: string; ink: string }): BellScene {
  const stage = new MiniStage(host, { label: 'A bronze bell that rings once for every paint event', className: 'scene-bell' });
  stage.camera.position.set(0, 0.5, 7.6);
  stage.camera.lookAt(0, 0.75, 0);

  stage.scene.add(new AmbientLight('#fff4e0', 1.6));
  const key = new DirectionalLight('#fff1d6', 3.2);
  key.position.set(2.5, 3, 4);
  const warm = new PointLight(colors.glow, 30, 14);
  warm.position.set(-2.5, 1, 3);
  const rim = new PointLight(colors.second, 24, 12);
  rim.position.set(2.8, -1.2, 1.5);
  stage.scene.add(key, warm, rim);

  const beam = new Mesh(new BoxGeometry(3.6, 0.18, 0.3), new MeshStandardMaterial({ color: colors.ink, roughness: 0.8 }));
  beam.position.y = 1.9;
  stage.scene.add(beam);

  // The bell swings around a pivot at the top.
  const pivot = new Group();
  pivot.position.y = 1.8;
  stage.scene.add(pivot);
  const profile = [
    [0.0, 0.0], [0.28, 0.0], [0.38, -0.1], [0.46, -0.45], [0.55, -0.95],
    [0.72, -1.35], [0.92, -1.62], [0.95, -1.72], [0.8, -1.7], [0.0, -1.55],
  ].map(([x, y]) => new Vector2(x, y));
  const bronze = new MeshStandardMaterial({ color: '#d9a253', metalness: 0.5, roughness: 0.3, emissive: new Color(colors.glow), emissiveIntensity: 0 });
  const bell = new Mesh(new LatheGeometry(profile, 48), bronze);
  bell.position.y = -0.1;
  pivot.add(bell);
  const clapper = new Mesh(new SphereGeometry(0.16, 24, 16), new MeshStandardMaterial({ color: colors.ink, metalness: 0.4, roughness: 0.5 }));
  clapper.position.y = -1.55;
  pivot.add(clapper);

  const rings: Array<{ mesh: Mesh<TorusGeometry, MeshBasicMaterial>; age: number }> = [];
  const ringColors: Record<RingKind, Color> = { change: new Color(colors.accent), request: new Color(colors.second) };
  let angle = 0;
  let velocity = 0;
  let flash = 0;
  let side = 1;

  stage.onFrame((dt) => {
    const motion = stage.reducedMotion ? 0.2 : 1;
    velocity += (-30 * angle - 3.2 * velocity) * dt;
    angle += velocity * dt;
    pivot.rotation.z = angle * motion;
    clapper.position.x = -angle * 0.25 * motion;
    stage.scene.rotation.y = stage.pointer.x * 0.25;
    flash = Math.max(0, flash - dt * 3);
    bronze.emissiveIntensity = flash * 0.6;

    const resting = Math.abs(angle) < 1e-4 && Math.abs(velocity) < 1e-4 && flash === 0 && rings.length === 0;
    if (resting) {
      angle = 0;
      velocity = 0;
      return false; // nothing moved: skip the GPU draw
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i]!;
      ring.age += dt;
      const t = ring.age / 1.6;
      ring.mesh.scale.setScalar(1 + t * 3.2);
      ring.mesh.material.opacity = Math.max(0, 0.9 * (1 - t));
      if (t >= 1) {
        stage.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
        rings.splice(i, 1);
      }
    }
  });

  return {
    ring(kind) {
      side = -side;
      velocity += side * (kind === 'change' ? 2.4 : 1.4);
      flash = 1;
      stage.invalidate();
      if (rings.length >= MAX_RINGS) return;
      const mesh = new Mesh(
        new TorusGeometry(0.95, 0.025, 8, 64),
        new MeshBasicMaterial({ color: ringColors[kind], transparent: true, opacity: 0.9, depthWrite: false }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = 1.8 - 1.8;
      stage.scene.add(mesh);
      rings.push({ mesh, age: 0 });
    },
    destroy: () => stage.destroy(),
  };
}
