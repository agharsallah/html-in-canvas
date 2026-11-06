/**
 * Roll 10 diorama: the vault. A round steel door with a wheel and bolts,
 * and a photocopied print hanging in front of it. Sensitive lines on the
 * print get black redaction bars; safe lines light up in highlighter.
 * Leak particles (the foe) fly at the print and die on the bars.
 */
import {
  AmbientLight, BoxGeometry, Color, CylinderGeometry, DirectionalLight, Group, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, SphereGeometry, TorusGeometry,
} from 'three';
import { MiniStage } from './mini-stage';

export interface VaultScene {
  /** 0 = door open, 1 = fully locked (wheel turned, bolts out). */
  setLock(t: number): void;
  /** Slam redaction bars onto the sensitive lines. */
  redact(): void;
  /** Light up the lines that are painted on purpose. */
  reveal(): void;
  /** A burst of leak particles that die on the redaction bars. */
  leak(): void;
  destroy(): void;
}

interface Spark { mesh: Mesh<SphereGeometry, MeshBasicMaterial>; vx: number; vy: number; vz: number; age: number }

const LINES: Array<{ y: number; w: number; sensitive: boolean }> = [
  { y: 0.62, w: 1.3, sensitive: false }, { y: 0.36, w: 1.1, sensitive: true }, { y: 0.1, w: 1.25, sensitive: false },
  { y: -0.16, w: 0.9, sensitive: true }, { y: -0.42, w: 1.2, sensitive: true }, { y: -0.68, w: 1.0, sensitive: false },
];

export function createVaultScene(host: HTMLElement, colors: { paper: string; ink: string; glow: string; second: string }): VaultScene {
  const stage = new MiniStage(host, { label: 'A vault door behind a photocopied print; sensitive lines are blacked out and leak particles bounce off them', className: 'scene-vault' });
  stage.camera.position.set(0, 0.2, 7.2);
  stage.camera.lookAt(0, 0, 0);
  stage.scene.add(new AmbientLight('#ffffff', 1.4));
  const key = new DirectionalLight('#ffffff', 2.6);
  key.position.set(3, 4, 5);
  const rim = new PointLight(colors.second, 20, 12);
  rim.position.set(-3, -1.5, 2);
  stage.scene.add(key, rim);

  // The door, facing the camera.
  const steel = new MeshStandardMaterial({ color: '#8d9096', metalness: 0.85, roughness: 0.35 });
  const door = new Group();
  door.position.set(0.9, 0, -0.6);
  const slab = new Mesh(new CylinderGeometry(1.7, 1.7, 0.35, 64), steel);
  slab.rotation.x = Math.PI / 2;
  door.add(slab);
  const wheel = new Group();
  wheel.position.z = 0.32;
  wheel.add(new Mesh(new TorusGeometry(0.62, 0.06, 12, 48), steel));
  for (let i = 0; i < 3; i++) {
    const spoke = new Mesh(new BoxGeometry(1.24, 0.07, 0.07), steel);
    spoke.rotation.z = (i * Math.PI) / 3;
    wheel.add(spoke);
  }
  door.add(wheel);
  const bolts = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const bolt = new Mesh(new CylinderGeometry(0.09, 0.09, 0.5, 16), steel);
    bolt.rotation.z = angle + Math.PI / 2;
    door.add(bolt);
    return { bolt, angle };
  });
  stage.scene.add(door);

  // The photocopied print in front.
  const print = new Group();
  print.position.set(-1.3, 0, 0.9);
  print.rotation.y = 0.28;
  print.add(new Mesh(new PlaneGeometry(1.8, 2.1), new MeshStandardMaterial({ color: colors.paper, roughness: 0.95 })));
  const lineMat = new MeshBasicMaterial({ color: '#9a9a96' });
  const bars: Array<Mesh<BoxGeometry, MeshBasicMaterial>> = [];
  const glows: Array<Mesh<PlaneGeometry, MeshBasicMaterial>> = [];
  for (const line of LINES) {
    const text = new Mesh(new PlaneGeometry(line.w, 0.08), lineMat);
    text.position.set(-0.75 + line.w / 2, line.y, 0.01);
    print.add(text);
    if (line.sensitive) {
      const bar = new Mesh(new BoxGeometry(line.w + 0.08, 0.17, 0.03), new MeshBasicMaterial({ color: colors.ink }));
      bar.position.set(-0.75 + line.w / 2, line.y, 0.03);
      bar.scale.x = 0.001;
      print.add(bar);
      bars.push(bar);
    } else {
      const glow = new Mesh(new PlaneGeometry(line.w + 0.08, 0.17), new MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: 0 }));
      glow.position.set(-0.75 + line.w / 2, line.y, 0.005);
      print.add(glow);
      glows.push(glow);
    }
  }
  stage.scene.add(print);

  const sparks: Spark[] = [];
  const sparkColor = new Color(colors.second);
  let lock = 0;
  let lockShown = 0;
  let redaction = 0;
  let reveal = 0;
  let redactTarget = 0;
  let revealTarget = 0;

  stage.onFrame((dt, time) => {
    const ease = stage.reducedMotion ? 1 : Math.min(1, dt * 4);
    lockShown += (lock - lockShown) * ease;
    redaction += (redactTarget - redaction) * ease;
    reveal += (revealTarget - reveal) * ease;
    wheel.rotation.z = -lockShown * Math.PI * 1.5;
    for (const { bolt, angle } of bolts) {
      const r = 1.55 + lockShown * 0.35;
      bolt.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
    }
    bars.forEach((bar, i) => (bar.scale.x = Math.max(0.001, Math.min(1, redaction * 1.6 - i * 0.25))));
    glows.forEach((glow) => (glow.material.opacity = 0.55 * reveal * (stage.reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(time * 3))));
    stage.scene.rotation.y = stage.pointer.x * 0.18;
    stage.scene.rotation.x = stage.pointer.y * 0.06;

    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i]!;
      spark.age += dt;
      spark.mesh.position.x += spark.vx * dt;
      spark.mesh.position.y += spark.vy * dt;
      spark.mesh.position.z += spark.vz * dt;
      // Sparks die on the print plane: the bars stop them.
      if (spark.mesh.position.z > 0.85) spark.vz = -Math.abs(spark.vz) * 0.2;
      spark.mesh.material.opacity = Math.max(0, 1 - spark.age / 1.4);
      if (spark.age > 1.4) {
        stage.scene.remove(spark.mesh);
        spark.mesh.geometry.dispose();
        spark.mesh.material.dispose();
        sparks.splice(i, 1);
      }
    }
    const settled = Math.abs(lock - lockShown) < 1e-3 && Math.abs(redactTarget - redaction) < 1e-3
      && Math.abs(revealTarget - reveal) < 1e-3 && sparks.length === 0 && reveal === 0;
    return !settled;
  });

  return {
    setLock(t) {
      lock = Math.max(0, Math.min(1, t));
      stage.invalidate();
    },
    redact() {
      redactTarget = 1;
      stage.invalidate();
    },
    reveal() {
      revealTarget = 1;
      stage.invalidate();
    },
    leak() {
      const count = stage.reducedMotion ? 4 : 16;
      for (let i = 0; i < count && sparks.length < 40; i++) {
        const mesh = new Mesh(new SphereGeometry(0.05, 8, 6), new MeshBasicMaterial({ color: sparkColor, transparent: true }));
        mesh.position.set(0.9 + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, -0.2);
        stage.scene.add(mesh);
        sparks.push({ mesh, vx: -1.6 - Math.random(), vy: (Math.random() - 0.5) * 1.2, vz: 1.2 + Math.random(), age: 0 });
      }
      stage.invalidate();
    },
    destroy: () => stage.destroy(),
  };
}
