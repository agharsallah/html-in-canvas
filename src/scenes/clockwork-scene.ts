/**
 * Roll 11 scene: the clockwork heart. A brass gear train where each gear is
 * a step of "update the rendering". The `paint` event is the coloured gear;
 * under Option A it slides forward to resize-observer timing.
 *
 *  setActive(step)  the gear for the current step glows and turns.
 *  loop()           a loop-back arc flashes from the paint gear to style.
 *  setJammed(on)    the train seizes and shudders red (the Deadlock).
 */
import {
  AmbientLight, CanvasTexture, Color, DirectionalLight, ExtrudeGeometry, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Path, PlaneGeometry, PointLight, QuadraticBezierCurve3, SRGBColorSpace, Shape,
  TubeGeometry, Vector3,
} from 'three';
import type { OptionId, StepId } from '../chapters/roll-11-clockwork/rules';
import { MiniStage } from './mini-stage';

export interface ClockworkScene {
  setActive(step: StepId | null): void;
  setOption(option: OptionId): void;
  loop(): void;
  setJammed(on: boolean): void;
  destroy(): void;
}

export interface GearLabel {
  id: StepId;
  text: string;
  sub: string;
}

const ORDER: Record<OptionId, StepId[]> = {
  A: ['raf', 'style', 'resize', 'paint-event', 'intersection', 'paint', 'commit'],
  B: ['raf', 'style', 'resize', 'intersection', 'paint', 'paint-event', 'commit'],
  C: ['raf', 'style', 'resize', 'intersection', 'paint', 'paint-event', 'commit'],
};

function gearShape(teeth: number, outer: number, inner: number): Shape {
  const shape = new Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: Array<[number, number]> = [[inner, a], [outer, a + step * 0.12], [outer, a + step * 0.45], [inner, a + step * 0.57]];
    pts.forEach(([r, t], j) => (i === 0 && j === 0 ? shape.moveTo(r * Math.cos(t), r * Math.sin(t)) : shape.lineTo(r * Math.cos(t), r * Math.sin(t))));
  }
  shape.closePath();
  const hole = new Path();
  hole.absarc(0, 0, inner * 0.28, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function labelTex(text: string, sub: string, ink: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = '600 44px "Atkinson Hyperlegible Next", sans-serif';
  const scale = Math.min(1, 370 / ctx.measureText(text).width);
  ctx.font = `600 ${Math.floor(44 * scale)}px "Atkinson Hyperlegible Next", sans-serif`;
  ctx.fillText(text, 192, 56);
  ctx.globalAlpha = 0.7;
  ctx.font = '400 30px "Atkinson Hyperlegible Mono", monospace';
  ctx.fillText(sub, 192, 104);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export function createClockworkScene(host: HTMLElement, labels: GearLabel[], colors: { ink: string; accent: string; second: string; glow: string }): ClockworkScene {
  const stage = new MiniStage(host, { label: 'A brass gear train: one gear per rendering step, with the paint event as the coloured gear', className: 'scene-clockwork' });
  stage.camera.position.set(0, 0.3, 10.5);
  stage.scene.add(new AmbientLight('#fff2dc', 1.5));
  const key = new DirectionalLight('#fff1d6', 3);
  key.position.set(2, 4, 6);
  const warm = new PointLight(colors.glow, 26, 16);
  warm.position.set(-3, 1, 3);
  stage.scene.add(key, warm);

  const shape = gearShape(12, 0.62, 0.5);
  const geometry = new ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
  const jamColor = new Color('#c0392b');
  const gears = labels.map((label) => {
    const base = new Color(label.id === 'paint-event' ? colors.second : '#c8913f');
    const material = new MeshStandardMaterial({ color: base.clone(), metalness: 0.55, roughness: 0.35, emissive: new Color(colors.glow), emissiveIntensity: 0 });
    const mesh = new Mesh(geometry, material);
    const tag = new Mesh(new PlaneGeometry(1.3, 0.43), new MeshBasicMaterial({ map: labelTex(label.text, label.sub, colors.ink), transparent: true }));
    stage.scene.add(mesh, tag);
    return { id: label.id, mesh, tag, material, base, target: new Vector3(), glow: 0, spin: 0 };
  });

  const slot = (i: number) => new Vector3(-3.3 + i * 1.1, i % 2 === 0 ? 0.45 : -0.05, 0);
  let option: OptionId = 'C';
  let active: StepId | null = null;
  let jammed = false;
  let loopFlash = 0;
  let time = 0;

  const loopMaterial = new MeshBasicMaterial({ color: colors.accent, transparent: true, opacity: 0 });
  const loopMesh = new Mesh(new TubeGeometry(new QuadraticBezierCurve3(new Vector3(), new Vector3(), new Vector3()), 8, 0.04, 6), loopMaterial);
  stage.scene.add(loopMesh);

  const layout = () => {
    ORDER[option].forEach((id, i) => gears.find((g) => g.id === id)!.target.copy(slot(i)));
    const from = slot(ORDER[option].indexOf('paint-event'));
    const to = slot(1);
    loopMesh.geometry.dispose();
    loopMesh.geometry = new TubeGeometry(new QuadraticBezierCurve3(from.clone().setY(1.1), new Vector3((from.x + to.x) / 2, 2.6, 0.3), to.clone().setY(1.1)), 32, 0.04, 6);
  };
  layout();
  gears.forEach((g) => g.mesh.position.copy(g.target));

  stage.onFrame((dt) => {
    const motion = stage.reducedMotion ? 0 : 1;
    time += dt;
    let settling = loopFlash > 0;
    stage.scene.rotation.y = stage.pointer.x * 0.15;
    loopFlash = Math.max(0, loopFlash - dt * 0.8);
    loopMaterial.opacity = loopFlash;
    gears.forEach((g, i) => {
      const isActive = g.id === active;
      g.glow += ((isActive ? 1 : 0) - g.glow) * Math.min(1, dt * 6);
      g.material.emissiveIntensity = g.glow * 0.7;
      g.material.color.copy(g.base).lerp(jamColor, jammed && g.id === 'paint-event' ? 0.8 : 0);
      g.spin += dt * (jammed ? 0 : isActive ? 2.4 : 0.5) * motion;
      const pos = g.mesh.position.lerp(g.target, Math.min(1, dt * 3));
      const shake = jammed ? Math.sin(time * 45 + i) * 0.03 * motion : 0;
      if (Math.abs(g.glow - (isActive ? 1 : 0)) > 0.01 || pos.distanceTo(g.target) > 0.002) settling = true;
      g.mesh.position.x = pos.x + shake;
      g.mesh.rotation.z = (i % 2 === 0 ? 1 : -1) * g.spin;
      g.mesh.scale.setScalar(1 + g.glow * 0.08);
      g.tag.position.set(pos.x, pos.y - 0.95, 0.2);
    });
    // Reduced motion: no idle spin, so draw only while something settles.
    return motion === 1 || settling ? undefined : false;
  });

  return {
    setActive(step) {
      active = step;
      stage.invalidate();
    },
    setOption(next) {
      option = next;
      layout();
      stage.invalidate();
    },
    loop() {
      loopFlash = 1;
      stage.invalidate();
    },
    setJammed(on) {
      jammed = on;
      stage.invalidate();
    },
    destroy() {
      gears.forEach((g) => g.tag.material.map?.dispose());
      stage.destroy();
    },
  };
}
