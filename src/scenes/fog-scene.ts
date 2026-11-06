/**
 * Roll 01 diorama: elements adrift in the Fallback fog.
 *
 *  fog       — cards drift deep in the haze, faint and unplaced.
 *  laid-out  — cards glide into a block stack with a dashed layout box.
 *  drawn     — the card steps forward, fully lit: it is on the canvas.
 *  error     — a red outline and a shudder: the draw call threw.
 */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, EdgesGeometry, FogExp2,
  LineDashedMaterial, LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, Points,
  PointsMaterial, Vector3,
} from 'three';
import type { ElementState } from '../chapters/roll-01-fog/rules';
import { labelTexture, softDotTexture } from './label-texture';
import { MiniStage } from './mini-stage';

export interface FogCard {
  tag: string;
  sub: string;
}

export interface FogScene {
  setState(index: number, state: ElementState): void;
  setAll(state: ElementState): void;
  destroy(): void;
}

interface CardRig {
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  outline: LineSegments<EdgesGeometry, LineDashedMaterial>;
  state: ElementState;
  drift: Vector3;
  stack: Vector3;
  shake: number;
}

export function createFogScene(host: HTMLElement, cards: FogCard[], colors: { paper: string; ink: string; accent: string; second: string }): FogScene {
  const stage = new MiniStage(host, { label: 'The canvas children as the browser sees them: in the fog, laid out, or drawn', className: 'scene-fog' });
  stage.camera.position.set(0, 0, 6);
  stage.scene.background = new Color(colors.paper);
  const fog = new FogExp2(colors.paper, 0.2);
  stage.scene.fog = fog;

  const error = new Color('#c0392b');
  const accent = new Color(colors.accent);
  const second = new Color(colors.second);

  const rigs: CardRig[] = cards.map((card, i) => {
    const mesh = new Mesh(
      new PlaneGeometry(2.2, 0.66),
      new MeshBasicMaterial({ map: labelTexture({ text: card.tag, sub: card.sub, width: 640, height: 192, background: '#ffffff', ink: colors.ink, accent: colors.accent }), transparent: true }),
    );
    const outline = new LineSegments(new EdgesGeometry(new PlaneGeometry(2.36, 0.82)), new LineDashedMaterial({ color: accent, dashSize: 0.08, gapSize: 0.06, transparent: true }));
    outline.computeLineDistances();
    mesh.add(outline);
    stage.scene.add(mesh);
    const drift = new Vector3((i - 1) * 1.6 + (Math.random() - 0.5), (Math.random() - 0.5) * 1.6, -2.5 - Math.random() * 2);
    mesh.position.copy(drift);
    return { mesh, outline, state: 'fog', drift, stack: new Vector3(0, (1 - i) * 0.95, 0), shake: 0 };
  });

  // Fog banks: big soft particles that drift slowly.
  const count = 260;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set([(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, -5 + Math.random() * 7], i * 3);
  }
  const fogGeometry = new BufferGeometry();
  fogGeometry.setAttribute('position', new BufferAttribute(positions, 3));
  const banks = new Points(fogGeometry, new PointsMaterial({ map: softDotTexture('#ffffff'), size: 1.6, transparent: true, opacity: 0.35, depthWrite: false, color: colors.paper, blending: AdditiveBlending }));
  stage.scene.add(banks);

  stage.onFrame((dt, time) => {
    const motion = stage.reducedMotion ? 0 : 1;
    banks.rotation.y = Math.sin(time * 0.05) * 0.3 * motion;
    banks.position.x = Math.sin(time * 0.1) * 0.5 * motion;
    const anyOut = rigs.some((r) => r.state !== 'fog');
    fog.density += ((anyOut ? 0.07 : 0.2) - fog.density) * Math.min(1, dt * 2);
    stage.scene.rotation.y = stage.pointer.x * 0.12;

    rigs.forEach((rig, i) => {
      const { mesh, outline } = rig;
      const target = rig.state === 'fog'
        ? rig.drift.clone().add(new Vector3(Math.sin(time * 0.4 + i) * 0.4, Math.cos(time * 0.3 + i * 2) * 0.3, 0).multiplyScalar(motion))
        : rig.stack.clone().setZ(rig.state === 'drawn' ? 0.45 : 0);
      if (rig.shake > 0) {
        target.x += Math.sin(time * 60) * 0.06 * rig.shake;
        rig.shake = Math.max(0, rig.shake - dt * 1.5);
      }
      mesh.position.lerp(target, Math.min(1, dt * 3));
      const tilt = rig.state === 'fog' ? Math.sin(time * 0.5 + i) * 0.4 * motion : 0;
      mesh.rotation.set(tilt * 0.3, tilt, tilt * 0.2);

      const opacity = rig.state === 'drawn' ? 1 : rig.state === 'fog' ? 0.35 : 0.55;
      mesh.material.opacity += (opacity - mesh.material.opacity) * Math.min(1, dt * 4);
      outline.visible = rig.state !== 'fog';
      outline.material.color.copy(rig.state === 'error' ? error : rig.state === 'drawn' ? second : accent);
      outline.material.dashSize = rig.state === 'drawn' ? 10 : 0.08; // solid when drawn
    });
  });

  return {
    setState(index, state) {
      const rig = rigs[index];
      if (!rig) return;
      if (state === 'error' && rig.state !== 'error') rig.shake = 1;
      rig.state = state;
    },
    setAll(state) {
      rigs.forEach((_, i) => this.setState(i, state));
    },
    destroy: () => stage.destroy(),
  };
}
