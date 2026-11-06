/**
 * Roll 04 scene: a projector throws a ticket onto a screen. The film gate
 * picks the source rect (texture window, outsets included), the beam lands
 * on the destination rect, and ctx.rotate turns the frame about the
 * screen's top-left corner (the canvas origin). Reels spin while it runs.
 */
import {
  AdditiveBlending, AmbientLight, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Color,
  CylinderGeometry, DirectionalLight, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry,
  SRGBColorSpace, Vector3,
} from 'three';
import { MiniStage } from './mini-stage';

/** Fractions: source of the element (0..1, outsets beyond), destination of the screen. */
export interface ProjectorFrame {
  src: { x: number; y: number; w: number; h: number };
  dest: { x: number; y: number; w: number; h: number };
  rotate: number;
}

export interface ProjectorScene {
  set(frame: ProjectorFrame): void;
  destroy(): void;
}

const MARGIN = 0.1; // texture covers the element plus 10% ink overflow on each side
const SCREEN_W = 4.8;
const SCREEN_H = 2.7;

function ticketTexture(colors: { accent: string; second: string; glow: string; ink: string }): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 360;
  const c = canvas.getContext('2d')!;
  const span = 1 + 2 * MARGIN;
  const px = (f: number) => ((f + MARGIN) / span) * canvas.width;
  const py = (f: number) => ((f + MARGIN) / span) * canvas.height;
  const glow = c.createRadialGradient(300, 180, 60, 300, 180, 330);
  glow.addColorStop(0, colors.glow);
  glow.addColorStop(1, 'rgba(255,210,94,0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#fffaf0';
  c.fillRect(px(0), py(0), px(1) - px(0), py(1) - py(0));
  c.fillStyle = colors.accent;
  c.fillRect(px(0), py(0), px(0.7) - px(0), py(0.4) - py(0));
  c.fillStyle = '#ffffff';
  c.font = '700 40px "Atkinson Hyperlegible Mono", monospace';
  c.fillText('CROOKED REEL', px(0.04), py(0.27));
  c.fillStyle = colors.ink;
  c.font = '400 26px "Atkinson Hyperlegible Next", sans-serif';
  c.fillText('Hall 4 · Row C · Seat 7', px(0.04), py(0.62));
  c.fillStyle = colors.second;
  c.fillRect(px(0.72), py(0.08), px(0.96) - px(0.72), py(0.92) - py(0.08));
  c.strokeStyle = colors.ink;
  c.setLineDash([8, 6]);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(px(0.7), py(0.04));
  c.lineTo(px(0.7), py(0.96));
  c.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  return texture;
}

export function createProjectorScene(host: HTMLElement, colors: { paper: string; ink: string; accent: string; glow: string; second: string }): ProjectorScene {
  const stage = new MiniStage(host, { label: 'A projector throws the source rect of a ticket onto the destination rect of a screen', className: 'scene-projector' });
  stage.camera.position.set(-0.4, 0.8, 9.2);
  stage.camera.lookAt(0.2, 0.2, 0);
  stage.scene.add(new AmbientLight('#fff1e0', 1.1));
  const key = new DirectionalLight('#ffffff', 1.6);
  key.position.set(-2, 4, 5);
  stage.scene.add(key);

  // The screen: canvas grid, top-left corner is the canvas origin.
  const screenCenter = new Vector3(1.3, 0.55, -1.4);
  const screen = new Mesh(new PlaneGeometry(SCREEN_W, SCREEN_H), new MeshStandardMaterial({ color: '#f4efe6', roughness: 0.95 }));
  screen.position.copy(screenCenter);
  const curtain = new Mesh(new PlaneGeometry(SCREEN_W + 1.2, SCREEN_H + 0.9), new MeshStandardMaterial({ color: colors.accent, roughness: 1 }));
  curtain.position.copy(screenCenter).add(new Vector3(0, 0, -0.05));
  stage.scene.add(curtain, screen);

  const pivot = new Group();
  pivot.position.set(screenCenter.x - SCREEN_W / 2, screenCenter.y + SCREEN_H / 2, screenCenter.z + 0.02);
  stage.scene.add(pivot);
  const texture = ticketTexture(colors);
  const frame = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: texture, transparent: true }));
  pivot.add(frame);

  // The projector, its lens and two reels.
  const body = new Mesh(new BoxGeometry(1.3, 0.8, 0.9), new MeshStandardMaterial({ color: colors.ink, metalness: 0.4, roughness: 0.5 }));
  body.position.set(-2.5, -0.55, 1.9);
  body.rotation.y = 0.5;
  const lensPoint = new Vector3(-1.85, -0.45, 1.45);
  const lens = new Mesh(new CylinderGeometry(0.16, 0.2, 0.4, 24), new MeshStandardMaterial({ color: '#222', metalness: 0.7, roughness: 0.3 }));
  lens.position.copy(lensPoint);
  lens.rotation.set(Math.PI / 2, 0.5, 0);
  const reelMat = new MeshStandardMaterial({ color: '#8a8f96', metalness: 0.8, roughness: 0.35 });
  const reels = [-0.35, 0.35].map((x) => {
    const reel = new Mesh(new CylinderGeometry(0.42, 0.42, 0.08, 6), reelMat);
    reel.rotation.x = Math.PI / 2;
    reel.position.set(x, 0.75, 0);
    body.add(reel);
    return reel;
  });
  stage.scene.add(body, lens);

  // The beam: four triangles from the lens to the frame's corners.
  const beamGeometry = new BufferGeometry();
  const beamPositions = new Float32Array(4 * 3 * 3);
  beamGeometry.setAttribute('position', new BufferAttribute(beamPositions, 3));
  const beam = new Mesh(beamGeometry, new MeshBasicMaterial({ color: new Color(colors.glow), transparent: true, opacity: 0.16, blending: AdditiveBlending, side: DoubleSide, depthWrite: false }));
  stage.scene.add(beam);

  const current: ProjectorFrame = { src: { x: 0, y: 0, w: 1, h: 1 }, dest: { x: 0.25, y: 0.2, w: 0.5, h: 0.6 }, rotate: 0 };
  let target: ProjectorFrame = structuredClone(current);
  let running = 1.5;
  const corner = new Vector3();

  const apply = () => {
    const { src, dest, rotate } = current;
    const span = 1 + 2 * MARGIN;
    texture.repeat.set(src.w / span, src.h / span);
    texture.offset.set((src.x + MARGIN) / span, 1 - (src.y + src.h + MARGIN) / span);
    frame.scale.set(Math.max(0.001, dest.w * SCREEN_W), Math.max(0.001, dest.h * SCREEN_H), 1);
    frame.position.set((dest.x + dest.w / 2) * SCREEN_W, -(dest.y + dest.h / 2) * SCREEN_H, 0);
    pivot.rotation.z = (-rotate * Math.PI) / 180;
    pivot.updateMatrixWorld(true);
    const pts = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]].map(([x, y]) => frame.localToWorld(corner.set(x!, y!, 0)).clone());
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % 4]!;
      beamPositions.set([lensPoint.x, lensPoint.y, lensPoint.z, p.x, p.y, p.z, q.x, q.y, q.z], i * 9);
    });
    beamGeometry.attributes.position!.needsUpdate = true;
    beamGeometry.computeBoundingSphere();
  };
  apply();

  stage.onFrame((dt) => {
    const k = stage.reducedMotion ? 1 : Math.min(1, dt * 6);
    let moving = false;
    const ease = (from: Record<string, number>, to: Record<string, number>) => {
      for (const key of Object.keys(to)) {
        const delta = to[key]! - from[key]!;
        if (Math.abs(delta) > 1e-4) moving = true;
        from[key] = Math.abs(delta) > 1e-4 ? from[key]! + delta * k : to[key]!;
      }
    };
    ease(current.src as unknown as Record<string, number>, target.src as unknown as Record<string, number>);
    ease(current.dest as unknown as Record<string, number>, target.dest as unknown as Record<string, number>);
    const dr = target.rotate - current.rotate;
    current.rotate = Math.abs(dr) > 0.01 ? current.rotate + dr * k : target.rotate;
    if (Math.abs(dr) > 0.01) moving = true;
    running = Math.max(0, running - dt);
    if (!stage.reducedMotion) reels.forEach((reel, i) => (reel.rotation.y += dt * (running > 0 ? 3 : 0) * (i ? -1 : 1)));
    stage.scene.rotation.y = stage.pointer.x * 0.08;
    if (moving) apply();
    return moving || running > 0;
  });

  return {
    set(frame) {
      target = structuredClone(frame);
      running = 1.2;
      stage.invalidate();
    },
    destroy: () => {
      texture.dispose();
      stage.destroy();
    },
  };
}
