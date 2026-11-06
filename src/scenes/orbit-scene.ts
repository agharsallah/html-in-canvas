/**
 * The orbit observatory: a cyanotype globe drawn in white linework, and a
 * satellite whose front face carries an element texture (a live form in
 * the lab, a poster of one in the diorama).
 *
 * Teaching props:
 *  - `setFlat(true)`: the Flat Earth Society squashes the globe into a disc.
 *  - `setOutline('projective')`: the hit region glued to the tilted face
 *    (what a full projective canvasTransform gives the browser).
 *  - `setOutline('flat')`: an unrotated rectangle where the Society insists
 *    the form still is.
 *  - `pulse()`: a beam from below, one texture upload.
 */
import {
  AmbientLight, BoxGeometry, BufferGeometry, CanvasTexture, Color, DirectionalLight, DoubleSide, Float32BufferAttribute, Group,
  LineBasicMaterial, LineDashedMaterial, LineLoop, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, PointLight, SphereGeometry, Vector3, type Texture,
} from 'three';
import { MiniStage } from './mini-stage';

export type OrbitMotion = 'still' | 'sway' | 'spin';
export type OrbitOutline = 'none' | 'projective' | 'flat';

export interface OrbitColors { paper: string; ink: string; accent: string; glow: string; second: string }

export interface OrbitScene {
  readonly stage: MiniStage;
  /** The plane that carries the element texture (centered, in its own XY). */
  readonly face: Mesh;
  /** Face size in world units. */
  readonly plane: { width: number; height: number };
  setMap(texture: Texture | null): void;
  setMotion(motion: OrbitMotion): void;
  setFlat(flat: boolean): void;
  setOutline(kind: OrbitOutline): void;
  pulse(): void;
  /** True when the face's front side points at the camera. */
  facingCamera(): boolean;
  destroy(): void;
}

const PLANE = { width: 1.6, height: 1.0 };

export function createOrbitScene(host: HTMLElement, colors: OrbitColors, layout: 'diorama' | 'lab' = 'diorama'): OrbitScene {
  const stage = new MiniStage(host, {
    label: layout === 'lab' ? 'A satellite carrying the form, in front of a spinning globe' : 'A cyanotype globe with a satellite that carries an HTML form',
    className: 'scene-orbit',
  });
  stage.camera.position.set(0, 0.25, 6.5);
  stage.camera.lookAt(0, 0, 0);
  stage.scene.add(new AmbientLight('#dbe9ff', 1.4));
  const key = new DirectionalLight('#ffffff', 2.4);
  key.position.set(-3, 3, 5);
  const sun = new PointLight(colors.second, 18, 14);
  sun.position.set(3, 2, 2);
  stage.scene.add(key, sun);

  // ---- globe: a Prussian-blue sphere wrapped in white graticule lines
  const globe = new Group();
  globe.position.set(layout === 'lab' ? 1.9 : 1.05, layout === 'lab' ? -0.9 : -0.15, layout === 'lab' ? -2.2 : -0.6);
  const radius = layout === 'lab' ? 1.5 : 1.25;
  globe.add(new Mesh(new SphereGeometry(radius, 48, 32), new MeshStandardMaterial({ color: colors.paper, roughness: 0.85, metalness: 0.05 })));
  globe.add(new LineSegments(graticule(radius * 1.004), new LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.75 })));
  const ring = new LineLoop(circle(radius * 1.55, 96), new LineDashedMaterial({ color: colors.glow, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.6 }));
  ring.computeLineDistances();
  ring.rotation.x = Math.PI / 2.3;
  globe.add(ring);
  stage.scene.add(globe);

  // ---- satellite: body, solar wings, and the face that carries the element
  const satellite = new Group();
  satellite.position.set(layout === 'lab' ? -0.1 : -0.95, layout === 'lab' ? 0.15 : 0.25, layout === 'lab' ? 1.3 : 1.1);
  if (layout === 'diorama') satellite.scale.setScalar(0.85);
  const body = new Mesh(new BoxGeometry(PLANE.width + 0.12, PLANE.height + 0.12, 0.14), new MeshStandardMaterial({ color: '#0d2c57', roughness: 0.6, metalness: 0.4 }));
  const wingTexture = wingGrid(colors);
  for (const side of [-1, 1]) {
    const wing = new Mesh(new PlaneGeometry(0.9, 0.55), new MeshBasicMaterial({ map: wingTexture, side: DoubleSide }));
    wing.position.x = side * (PLANE.width / 2 + 0.6);
    const strut = new Mesh(new BoxGeometry(0.16, 0.03, 0.03), new MeshStandardMaterial({ color: colors.ink }));
    strut.position.x = side * (PLANE.width / 2 + 0.11);
    satellite.add(wing, strut);
  }
  const faceMaterial = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const face = new Mesh(new PlaneGeometry(PLANE.width, PLANE.height), faceMaterial);
  face.position.z = 0.071;
  satellite.add(body, face);
  stage.scene.add(satellite);

  const projective = new LineLoop(rect(PLANE.width + 0.04, PLANE.height + 0.04), new LineBasicMaterial({ color: colors.second }));
  projective.position.z = 0.002;
  face.add(projective);
  const flat = new LineLoop(rect(PLANE.width, PLANE.height), new LineDashedMaterial({ color: colors.accent, dashSize: 0.08, gapSize: 0.06 }));
  flat.computeLineDistances();
  stage.scene.add(flat);

  const beam = new Mesh(new BoxGeometry(0.05, 4, 0.05), new MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: 0, depthWrite: false }));
  stage.scene.add(beam);

  let motion: OrbitMotion = 'sway';
  let outline: OrbitOutline = 'none';
  let flatTarget = 0;
  let flatness = 0;
  let spin = 0;
  let beamLife = 0;
  const tmp = new Vector3();
  const normal = new Vector3();

  const placeOutlines = () => {
    projective.visible = outline === 'projective';
    flat.visible = outline === 'flat';
    satellite.updateMatrixWorld();
    face.getWorldPosition(tmp);
    flat.position.copy(tmp);
    flat.scale.setScalar(satellite.scale.x);
  };

  stage.onFrame((dt, time) => {
    const amp = stage.reducedMotion ? 0.25 : 1;
    globe.rotation.y += dt * 0.12 * amp;
    flatness += (flatTarget - flatness) * Math.min(1, dt * 4);
    globe.scale.set(1 + flatness * 0.25, 1 - flatness * 0.94, 1 + flatness * 0.25);
    globe.rotation.x = flatness * 0.45;

    if (motion === 'spin' && !stage.reducedMotion) spin += dt * 0.7;
    const sway = motion === 'still' ? 0 : Math.sin(time * 0.6) * 0.55 * amp;
    satellite.rotation.y = motion === 'spin' && !stage.reducedMotion ? spin : sway - 0.08;
    satellite.rotation.x = motion === 'still' ? -0.06 : Math.sin(time * 0.43) * 0.16 * amp;
    satellite.rotation.z = motion === 'still' ? 0 : Math.sin(time * 0.3) * 0.05 * amp;

    beamLife = Math.max(0, beamLife - dt * 2.2);
    (beam.material as MeshBasicMaterial).opacity = beamLife * 0.85;
    beam.position.set(satellite.position.x, satellite.position.y - 2.2 + (1 - beamLife) * 0.6, satellite.position.z - 0.1);
    placeOutlines();
  });

  return {
    stage,
    face,
    plane: PLANE,
    setMap(texture) {
      faceMaterial.map = texture;
      faceMaterial.color = new Color(texture ? '#ffffff' : '#9fb7d8');
      faceMaterial.needsUpdate = true;
      stage.invalidate();
    },
    setMotion(next) {
      motion = next;
      stage.invalidate();
    },
    setFlat(on) {
      flatTarget = on ? 1 : 0;
      stage.invalidate();
    },
    setOutline(kind) {
      outline = kind;
      placeOutlines();
      stage.invalidate();
    },
    pulse() {
      beamLife = 1;
      stage.invalidate();
    },
    facingCamera() {
      face.updateWorldMatrix(true, false);
      face.getWorldPosition(tmp);
      normal.set(0, 0, 1).transformDirection(face.matrixWorld);
      return normal.dot(stage.camera.position.clone().sub(tmp)) > 0;
    },
    destroy() {
      wingTexture.dispose();
      stage.destroy();
    },
  };
}

function graticule(r: number): BufferGeometry {
  const points: number[] = [];
  const seg = 48;
  for (let lat = -60; lat <= 60; lat += 30) {
    const phi = (lat * Math.PI) / 180;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2, b = ((i + 1) / seg) * Math.PI * 2;
      points.push(r * Math.cos(phi) * Math.cos(a), r * Math.sin(phi), r * Math.cos(phi) * Math.sin(a));
      points.push(r * Math.cos(phi) * Math.cos(b), r * Math.sin(phi), r * Math.cos(phi) * Math.sin(b));
    }
  }
  for (let lon = 0; lon < 180; lon += 30) {
    const theta = (lon * Math.PI) / 180;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2, b = ((i + 1) / seg) * Math.PI * 2;
      points.push(r * Math.cos(a) * Math.cos(theta), r * Math.sin(a), r * Math.cos(a) * Math.sin(theta));
      points.push(r * Math.cos(b) * Math.cos(theta), r * Math.sin(b), r * Math.cos(b) * Math.sin(theta));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  return geometry;
}

function circle(r: number, seg: number): BufferGeometry {
  const points: number[] = [];
  for (let i = 0; i < seg; i++) points.push(r * Math.cos((i / seg) * Math.PI * 2), r * Math.sin((i / seg) * Math.PI * 2), 0);
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points, 3));
}

function rect(w: number, h: number): BufferGeometry {
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute([-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0], 3));
}

function wingGrid(colors: OrbitColors): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#123b73';
  ctx.fillRect(0, 0, 128, 80);
  ctx.strokeStyle = colors.ink;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  for (let x = 0; x <= 128; x += 21.3) ctx.strokeRect(x, 0, 0.01, 80);
  for (let y = 0; y <= 80; y += 26.6) ctx.strokeRect(0, y, 128, 0.01);
  ctx.strokeRect(1, 1, 126, 78);
  return new CanvasTexture(canvas);
}
