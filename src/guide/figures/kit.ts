/**
 * The figure kit: a few paper-and-light primitives every guide figure is
 * built from, so twenty figures read as one set.
 *
 *  card()    a sheet of baryta paper with an ink outline: an HTML element
 *  bars()    grey lines of "text" on a card
 *  frame()   a rectangle outline, solid or dashed: boxes, rects, clips
 *  canvasPlate() the canvas: a dark plate with a safelight rim
 *  dot(), wire()  pulses and connections
 *  damp()    frame-rate independent easing toward a target
 */
import {
  AmbientLight, BoxGeometry, BufferGeometry, CanvasTexture, Color, SRGBColorSpace, DirectionalLight, EdgesGeometry, Float32BufferAttribute,
  Group, Line, LineBasicMaterial, LineDashedMaterial, LineSegments, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PlaneGeometry, PointLight, SphereGeometry, Vector3, type ColorRepresentation, type Object3D, type Scene,
} from 'three';

/** The darkroom palette (mirrors src/styles/tokens.css). */
export const C = {
  night: '#1d0f1f',
  deep: '#2a1529',
  plum: '#3a1d36',
  mauve: '#6a3a5c',
  safelight: '#ff5a36',
  amber: '#ffb547',
  tray: '#2ee6c0',
  stain: '#ff4fa3',
  paper: '#eef0ec',
  ink: '#241c18',
  dust: '#d7c3cf',
  bad: '#ff4d4d',
} as const;

export function lights(scene: Scene): void {
  scene.add(new AmbientLight('#fff1e6', 1.5));
  const key = new DirectionalLight('#fff4e0', 2.4);
  key.position.set(3, 4, 6);
  const warm = new PointLight(C.amber, 18, 16);
  warm.position.set(-4, 2, 4);
  const rim = new PointLight(C.tray, 14, 16);
  rim.position.set(4, -2, 3);
  scene.add(key, warm, rim);
}

export interface Card {
  readonly group: Group;
  readonly slab: Mesh<BoxGeometry, MeshStandardMaterial>;
  readonly edge: LineSegments<EdgesGeometry, LineBasicMaterial>;
  readonly width: number;
  readonly height: number;
  setColor(color: ColorRepresentation): void;
  setEdge(color: ColorRepresentation): void;
  setOpacity(opacity: number): void;
}

/** A paper sheet: an HTML element, as the figures draw it. */
export function card(width: number, height: number, color: ColorRepresentation = C.paper, depth = 0.05): Card {
  const slab = new Mesh(
    new BoxGeometry(width, height, depth),
    new MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, transparent: true }),
  );
  const edge = new LineSegments(
    new EdgesGeometry(new PlaneGeometry(width, height)),
    new LineBasicMaterial({ color: C.ink, transparent: true }),
  );
  edge.position.z = depth / 2 + 0.002;
  const group = new Group();
  group.add(slab, edge);
  return {
    group, slab, edge, width, height,
    setColor: (c) => slab.material.color.set(c),
    setEdge: (c) => edge.material.color.set(c),
    setOpacity(opacity) {
      slab.material.opacity = opacity;
      edge.material.opacity = opacity;
      group.traverse((child) => {
        if (child === slab || child === edge) return;
        const m = (child as Mesh).material as MeshBasicMaterial | undefined;
        if (m && 'opacity' in m) {
          m.transparent = true;
          m.opacity = opacity * ((m.userData.baseOpacity as number | undefined) ?? 1);
        }
      });
    },
  };
}

/** Lines of "text" on a card face. Returns the group so it can be hidden. */
export function bars(target: Card, rows = 3, color: ColorRepresentation = '#9a8f96', inset = 0.16): Group {
  const group = new Group();
  const usable = target.height - inset * 2;
  const gap = usable / Math.max(rows, 1);
  for (let i = 0; i < rows; i++) {
    const w = (target.width - inset * 2) * (i === rows - 1 && rows > 1 ? 0.6 : 0.95 - (i % 2) * 0.12);
    const bar = new Mesh(new PlaneGeometry(w, Math.min(0.09, gap * 0.45)), new MeshBasicMaterial({ color, transparent: true }));
    bar.position.set(-target.width / 2 + inset + w / 2, target.height / 2 - inset - gap * (i + 0.5), 0.03);
    group.add(bar);
  }
  target.group.add(group);
  return group;
}

export interface Frame {
  readonly lines: LineSegments<EdgesGeometry, LineBasicMaterial | LineDashedMaterial>;
  /** Resize and move the frame (center x, y; size w, h). */
  set(x: number, y: number, w: number, h: number): void;
}

/** A rectangle outline of unit size, scaled to any rect. */
export function frame(color: ColorRepresentation, dashed = false): Frame {
  const geometry = new EdgesGeometry(new PlaneGeometry(1, 1));
  const material = dashed
    ? new LineDashedMaterial({ color, dashSize: 0.06, gapSize: 0.05, transparent: true })
    : new LineBasicMaterial({ color, transparent: true });
  const lines = new LineSegments(geometry, material);
  if (dashed) lines.computeLineDistances();
  return {
    lines,
    set(x, y, w, h) {
      lines.position.set(x, y, lines.position.z);
      lines.scale.set(Math.max(w, 1e-3), Math.max(h, 1e-3), 1);
    },
  };
}

export interface Plate {
  readonly group: Group;
  readonly surface: Mesh<PlaneGeometry, MeshStandardMaterial>;
  readonly rim: Frame;
}

/** The canvas: a dark plate with a safelight rim. */
export function canvasPlate(width: number, height: number, rimColor: ColorRepresentation = C.amber): Plate {
  const surface = new Mesh(new PlaneGeometry(width, height), new MeshStandardMaterial({ color: C.deep, roughness: 0.95 }));
  const rim = frame(rimColor);
  rim.set(0, 0, width, height);
  rim.lines.position.z = 0.003;
  const group = new Group();
  group.add(surface, rim.lines);
  return { group, surface, rim };
}

export function dot(radius: number, color: ColorRepresentation): Mesh<SphereGeometry, MeshBasicMaterial> {
  return new Mesh(new SphereGeometry(radius, 20, 14), new MeshBasicMaterial({ color, transparent: true }));
}

export interface Wire {
  readonly line: Line<BufferGeometry, LineBasicMaterial | LineDashedMaterial>;
  set(points: Vector3[]): void;
}

/** A polyline you can re-shape every frame. */
export function wire(color: ColorRepresentation, points: Vector3[] = [new Vector3(), new Vector3()], dashed = false): Wire {
  const geometry = new BufferGeometry();
  const material = dashed
    ? new LineDashedMaterial({ color, dashSize: 0.08, gapSize: 0.06, transparent: true })
    : new LineBasicMaterial({ color, transparent: true });
  const line = new Line(geometry, material);
  const set = (pts: Vector3[]) => {
    geometry.setAttribute('position', new Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
    geometry.computeBoundingSphere();
    if (dashed) line.computeLineDistances();
  };
  set(points);
  return { line, set };
}

/** A quadratic arc from a to b, lifted by `lift` along +y (or `up`). */
export function arc(a: Vector3, b: Vector3, lift: number, segments = 24, up = new Vector3(0, 1, 0)): Vector3[] {
  const mid = a.clone().add(b).multiplyScalar(0.5).addScaledVector(up, lift);
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    return new Vector3()
      .addScaledVector(a, (1 - t) * (1 - t))
      .addScaledVector(mid, 2 * (1 - t) * t)
      .addScaledVector(b, t * t);
  });
}

/** Point at parameter t along a polyline. */
export function along(points: Vector3[], t: number, out = new Vector3()): Vector3 {
  const f = Math.min(Math.max(t, 0), 1) * (points.length - 1);
  const i = Math.min(Math.floor(f), points.length - 2);
  return out.copy(points[i]!).lerp(points[i + 1]!, f - i);
}

/** Exponential smoothing toward a target, independent of frame rate. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function dampVec(current: Vector3, target: Vector3, lambda: number, dt: number): Vector3 {
  return current.lerp(target, 1 - Math.exp(-lambda * dt));
}

export function dampColor(current: Color, target: Color, lambda: number, dt: number): Color {
  return current.lerp(target, 1 - Math.exp(-lambda * dt));
}

/** True while any value is still moving toward its target. */
export function settling(...pairs: Array<[number, number]>): boolean {
  return pairs.some(([a, b]) => Math.abs(a - b) > 1e-3);
}

/** Gentle camera parallax that follows the pointer. */
export function parallax(
  camera: { position: Vector3; lookAt(v: Vector3): void },
  pointer: { x: number; y: number },
  base: Vector3,
  look: Vector3,
  amount = 0.6,
  dt = 1 / 60,
): void {
  const target = base.clone().add(new Vector3(pointer.x * amount, -pointer.y * amount * 0.6, 0));
  dampVec(camera.position, target, 4, dt);
  camera.lookAt(look);
}

/** Smooth 0→1→0 envelope over a loop phase. */
export function pulse(phase: number): number {
  return Math.sin(Math.min(Math.max(phase, 0), 1) * Math.PI);
}

/** Lean a figure's root group toward the pointer. Returns true while moving. */
export function sway(root: { rotation: { x: number; y: number } }, pointer: { x: number; y: number }, dt: number, amount = 0.12): boolean {
  const ty = pointer.x * amount;
  const tx = pointer.y * amount * 0.6;
  root.rotation.y = damp(root.rotation.y, ty, 5, dt);
  root.rotation.x = damp(root.rotation.x, tx, 5, dt);
  return settling([root.rotation.y, ty], [root.rotation.x, tx]);
}

/** A soft glow around a rectangle: box-shadow, as a texture. */
export function glowTexture(color: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.shadowColor = color;
  ctx.shadowBlur = 36;
  ctx.fillStyle = color;
  ctx.fillRect(56, 56, 144, 80);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * A label anchor in an object's local space, so labels follow the figure
 * when it sways. `at(root, 0, 2, 0)` or `at(root, someVector)`.
 */
export function at(space: Object3D, x: number | Vector3, y = 0, z = 0): () => Vector3 {
  const local = x instanceof Vector3 ? x.clone() : new Vector3(x, y, z);
  return () => space.localToWorld(local.clone());
}
