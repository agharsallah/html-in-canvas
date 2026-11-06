/**
 * Roll 09: the lighthouse of voices. A beam sweeps across canvas children
 * standing on the rocks. Each one the beam passes is "read aloud" (it
 * lights up and sends out a ring) unless it is silent.
 *
 *  announced + bounds     solid card, lit by the beam, rings
 *  announced + no geometry  a translucent card floating above the rocks:
 *                         heard, but with no place a magnifier could find
 *  offscreen              sunk low and faint, still heard
 *  stale bounds           an empty outline where it used to be drawn
 *  silent                 dark; the beam passes without a sound
 *  silent but tabbable    dark with a red outline: ghost focus
 */
import {
  AdditiveBlending, AmbientLight, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide,
  EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, TorusGeometry,
} from 'three';
import type { Geometry } from '../chapters/roll-09-lighthouse/rules';
import { labelTexture } from './label-texture';
import { MiniStage } from './mini-stage';

export interface BeaconCard {
  tag: string;
  sub: string;
}

export interface BeaconState {
  announced: boolean;
  geometry: Geometry;
  tabbable: boolean;
  focused?: boolean;
}

export interface LighthouseScene {
  setStates(states: readonly BeaconState[]): void;
  destroy(): void;
}

interface Rig {
  pivot: Group;
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  outline: LineSegments<EdgesGeometry, LineBasicMaterial>;
  angle: number;
  state: BeaconState;
  flash: number;
  lastHeard: number;
}

const RADIUS = 2.7;
const MAX_RINGS = 10;

export function createLighthouseScene(host: HTMLElement, cards: readonly BeaconCard[], colors: { paper: string; ink: string; accent: string; glow: string; second: string }): LighthouseScene {
  const stage = new MiniStage(host, { label: 'A lighthouse beam sweeping over canvas children: announced ones light up and ring, silent ones stay dark', className: 'scene-lighthouse', maxFps: 30 });
  stage.camera.position.set(0, 2.6, 7.4);
  stage.camera.lookAt(0, 0.5, 0);
  stage.scene.background = new Color('#163240');
  stage.scene.add(new AmbientLight('#fff4e0', 1.4));
  const key = new DirectionalLight('#ffe9c4', 2.4);
  key.position.set(3, 5, 4);
  stage.scene.add(key);

  const sea = new Mesh(new CylinderGeometry(6, 6, 0.1, 48), new MeshStandardMaterial({ color: colors.accent, roughness: 0.6 }));
  sea.position.y = -0.85;
  stage.scene.add(sea);

  // The tower: striped segments, a lamp room and a roof.
  const tower = new Group();
  for (let i = 0; i < 4; i++) {
    const bottom = 0.5 - i * 0.07;
    const seg = new Mesh(new CylinderGeometry(bottom - 0.07, bottom, 0.6, 32),
      new MeshStandardMaterial({ color: i % 2 ? colors.second : colors.paper, roughness: 0.7 }));
    seg.position.y = -0.5 + i * 0.6;
    tower.add(seg);
  }
  const lamp = new Mesh(new CylinderGeometry(0.26, 0.26, 0.34, 24), new MeshBasicMaterial({ color: colors.glow }));
  lamp.position.y = 2.0;
  const roof = new Mesh(new ConeGeometry(0.36, 0.4, 24), new MeshStandardMaterial({ color: colors.ink }));
  roof.position.y = 2.37;
  tower.add(lamp, roof);
  stage.scene.add(tower);

  // The beam: a long open cone lying on its side, spun around the tower.
  const beamPivot = new Group();
  beamPivot.position.y = 2.0;
  const beamMaterial = new MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: 0.32, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
  const beam = new Mesh(new ConeGeometry(0.9, 5, 32, 1, true), beamMaterial);
  beam.rotation.z = Math.PI / 2; // apex at the lamp, opening along +x
  beam.position.x = 2.5;
  const tilt = new Group();
  tilt.rotation.z = -0.5; // aim down at the rocks
  tilt.add(beam);
  beamPivot.add(tilt);
  stage.scene.add(beamPivot);

  const ink = new Color(colors.ink);
  const accent = new Color(colors.accent);
  const glow = new Color(colors.glow);
  const error = new Color('#d64545');
  const white = new Color('#ffffff');
  const dark = new Color('#3a3f44');

  const span = Math.PI * 0.75;
  const rigs: Rig[] = cards.map((card, i) => {
    const angle = -span / 2 + (span * i) / Math.max(1, cards.length - 1);
    const pivot = new Group();
    pivot.position.set(Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS);
    pivot.rotation.y = angle;
    const mesh = new Mesh(new PlaneGeometry(1.5, 0.6), new MeshBasicMaterial({
      map: labelTexture({ text: card.tag, sub: card.sub, width: 512, height: 204, background: '#fffaf0', ink: colors.ink, accent: colors.accent }),
      transparent: true,
    }));
    const outline = new LineSegments(new EdgesGeometry(new PlaneGeometry(1.62, 0.72)), new LineBasicMaterial({ color: accent, transparent: true }));
    mesh.add(outline);
    pivot.add(mesh);
    stage.scene.add(pivot);
    return { pivot, mesh, outline, angle, state: { announced: true, geometry: 'bounds', tabbable: false }, flash: 0, lastHeard: -10 };
  });

  const rings: Array<{ mesh: Mesh<TorusGeometry, MeshBasicMaterial>; age: number }> = [];
  const voice = (rig: Rig) => {
    if (rings.length >= MAX_RINGS || stage.reducedMotion) return;
    const mesh = new Mesh(new TorusGeometry(0.5, 0.02, 6, 48), new MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.9, depthWrite: false }));
    mesh.position.copy(rig.mesh.getWorldPosition(mesh.position));
    mesh.rotation.y = rig.angle;
    stage.scene.add(mesh);
    rings.push({ mesh, age: 0 });
  };

  let sweep = 0;
  stage.onFrame((dt, time) => {
    const motion = stage.reducedMotion ? 0 : 1;
    // Under reduced motion, changes snap into place instead of easing.
    const k = motion ? Math.min(1, dt * 4) : 1;
    sweep += dt * 0.9 * motion;
    // The beam swings back and forth over the arc of cards.
    const beamAngle = stage.reducedMotion ? 0 : Math.sin(sweep * 0.6) * (span / 2 + 0.2);
    beamPivot.rotation.y = beamAngle - Math.PI / 2;
    stage.scene.rotation.y = stage.pointer.x * 0.15;

    rigs.forEach((rig, i) => {
      const { state, mesh, outline } = rig;
      const lit = motion > 0 && Math.abs(beamAngle - rig.angle) < 0.16;
      if (lit && state.announced && time - rig.lastHeard > 1.2) {
        rig.lastHeard = time;
        rig.flash = 1;
        voice(rig);
      }
      rig.flash = Math.max(0, rig.flash - dt * 1.8);

      const y = state.geometry === 'none' ? 1.05 : state.geometry === 'offscreen' ? -0.55 : 0;
      const bob = state.focused ? Math.sin(time * 4) * 0.05 * motion : 0;
      mesh.position.y += (y + bob - mesh.position.y) * k;
      const scale = state.geometry === 'offscreen' ? 0.7 : 1;
      mesh.scale.setScalar(mesh.scale.x + (scale - mesh.scale.x) * k);

      const opacity = !state.announced ? 0.3
        : state.geometry === 'stale' ? 0.08
          : state.geometry === 'none' ? 0.55
            : state.geometry === 'offscreen' ? 0.45 : 1;
      mesh.material.opacity += (opacity - mesh.material.opacity) * k;
      const tint = state.announced ? white.clone().lerp(glow, rig.flash * 0.6) : dark;
      mesh.material.color.copy(tint);

      const ghostFocus = !state.announced && state.tabbable;
      outline.material.color.copy(ghostFocus ? error : state.focused ? glow : state.announced ? accent : ink);
      outline.material.opacity = ghostFocus ? 0.6 + 0.4 * motion * Math.sin(time * 6 + i) : state.announced || state.focused ? 1 : 0.3;
      outline.scale.setScalar(state.focused ? 1.06 : 1);
    });

    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i]!;
      ring.age += dt;
      const t = ring.age / 1.4;
      ring.mesh.scale.setScalar(1 + t * 2.4);
      ring.mesh.material.opacity = Math.max(0, 0.9 * (1 - t));
      if (t >= 1) {
        stage.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
        rings.splice(i, 1);
      }
    }
    // Under reduced motion nothing moves on its own: draw only on changes.
    return motion > 0;
  });

  return {
    setStates(states) {
      states.forEach((state, i) => {
        const rig = rigs[i];
        if (rig) rig.state = { ...state };
      });
      stage.invalidate();
    },
    destroy() {
      rings.forEach((r) => {
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
      });
      rigs.forEach((r) => r.mesh.material.map?.dispose());
      stage.destroy();
    },
  };
}
