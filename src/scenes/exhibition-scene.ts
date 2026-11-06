/**
 * The exhibition: a cover-flow of holographic foil cards floating in a dark
 * gallery. The focused card faces you; the rest fan out to the sides. Card
 * faces are textures supplied by the caller: element snapshots in native
 * mode, canvas-drawn twins otherwise. The shader only changes colour.
 */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Mesh, PlaneGeometry, Points, PointsMaterial, type Texture,
} from 'three';
import { createFoilMaterial, setFoilMap, type FoilMaterial } from './foil-material';
import { MiniStage } from './mini-stage';

export interface ExhibitionScene {
  readonly stage: MiniStage;
  readonly count: number;
  setTexture(index: number, texture: Texture | null, developed: boolean): void;
  turnTo(index: number): void;
  setFoil(on: boolean): void;
  /** Spin speed of the foil bands (1 = calm). */
  setShimmer(speed: number): void;
  destroy(): void;
}

export interface ExhibitionOptions {
  count: number;
  label: string;
  colors: { accent: string; second: string; glow: string };
  className?: string;
}

const CARD_W = 1.4;
const CARD_H = 2;

export function createExhibitionScene(host: HTMLElement, { count, label, colors, className = 'scene-exhibition' }: ExhibitionOptions): ExhibitionScene {
  const stage = new MiniStage(host, { label, className });
  stage.camera.position.set(0, 0.05, 4.3);
  stage.camera.lookAt(0, 0, 0);

  const geometry = new PlaneGeometry(CARD_W, CARD_H);
  const cards = Array.from({ length: count }, () => {
    const material: FoilMaterial = createFoilMaterial(colors.second, colors.glow);
    const mesh = new Mesh(geometry, material);
    stage.scene.add(mesh);
    return { mesh, material, developed: true };
  });

  // Dust in the projector beam: a few hundred additive points.
  const dustCount = stage.reducedMotion ? 80 : 260;
  const positions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = -1 - Math.random() * 4;
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute('position', new BufferAttribute(positions, 3));
  const dust = new Points(dustGeo, new PointsMaterial({ color: colors.glow, size: 0.03, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false }));
  stage.scene.add(dust);

  let target = 0;
  let shown = 0;
  let foil = 1;
  let foilShown = 1;
  let shimmer = 1;
  let clock = 0;
  let phase = 0;

  const layout = () => {
    cards.forEach(({ mesh, material, developed }, i) => {
      const d = i - shown;
      const side = Math.sign(d);
      const near = Math.min(1, Math.abs(d));
      mesh.position.set(d * 0.55 + side * near * 0.9, Math.sin(clock * 0.8 + i) * 0.04, -Math.abs(d) * 0.55);
      mesh.rotation.y = -side * near * 0.75;
      mesh.visible = Math.abs(d) < 5.5;
      material.uniforms.foil.value = developed ? foilShown : 0;
      material.uniforms.dim.value = (developed ? 1 : 0.55) * (1 - Math.min(0.6, Math.abs(d) * 0.12));
      material.uniforms.time.value = phase;
      mesh.renderOrder = -Math.abs(Math.round(d));
    });
  };

  stage.onFrame((dt) => {
    const motion = stage.reducedMotion ? 0 : 1;
    clock += dt * motion;
    phase += dt * motion * shimmer;
    const ease = stage.reducedMotion ? 1 : Math.min(1, dt * 6);
    shown += (target - shown) * ease;
    foilShown += (foil - foilShown) * ease;
    if (Math.abs(target - shown) < 1e-3) shown = target;
    dust.rotation.y += dt * 0.02 * motion;
    stage.scene.rotation.y = stage.pointer.x * 0.12;
    stage.scene.rotation.x = stage.pointer.y * 0.05;
    layout();
    return motion > 0 || shown !== target;
  });

  return {
    stage,
    count,
    setTexture(index, texture, developed) {
      const card = cards[index];
      if (!card) return;
      setFoilMap(card.material, texture);
      card.developed = developed;
      stage.invalidate();
    },
    turnTo(index) {
      target = Math.max(0, Math.min(count - 1, index));
      stage.invalidate();
    },
    setFoil(on) {
      foil = on ? 1 : 0;
      stage.invalidate();
    },
    setShimmer(speed) {
      shimmer = speed;
      stage.invalidate();
    },
    destroy() {
      geometry.dispose();
      stage.destroy();
    },
  };
}
