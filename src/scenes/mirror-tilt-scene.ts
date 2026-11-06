/**
 * Roll 05 lab: the tilted mirror. A card turns in 3D on a WebGL canvas, and a
 * 4x4 projective matrix (src/hic/projective-geometry.ts) tells the DOM where
 * it is. Switch the sync off and the card keeps turning while its hit area
 * freezes, as in the Chrome docs' geometry demo.
 *
 * native:    the card is a real drawable <button> inside the WebGL canvas,
 *            uploaded with texElementSubImage2D, positioned for hit testing
 *            with updateElementGeometry(new DOMMatrix(matrix)). The browser
 *            decides whether your click reaches it.
 * simulated: a painted texture of the card; the same matrices and the pure
 *            rules decide the click.
 */
import { AmbientLight, Color, Mesh, MeshBasicMaterial, PlaneGeometry, type Texture } from 'three';
import { classifyClick, insideQuad, quadOf, type ClickKind, type Matrix16, type Point } from '../chapters/roll-05-mirrors/rules';
import { ElementTexture } from '../hic/element-texture';
import { onPaint } from '../hic/paint';
import { elementToCanvasMatrix } from '../hic/projective-geometry';
import { makeDrawableHost, type DrawableCanvas } from '../hic/types';
import { h } from '../ui/dom';
import { s } from '../ui/charts/svg';
import { labelTexture } from './label-texture';
import { MiniStage } from './mini-stage';

export interface MirrorTiltScene {
  readonly el: HTMLElement;
  readonly native: boolean;
  setSync(on: boolean): void;
  onClick(cb: (kind: ClickKind, point: Point) => void): void;
  destroy(): void;
}

interface Colors { paper: string; accent: string; second: string; ink: string }

const PLANE_W = 2.4;

export function createMirrorTiltScene(host: HTMLElement, colors: Colors, useNative: boolean): MirrorTiltScene {
  const stage = new MiniStage(host, { label: 'A card tilting in 3D, with its hit area outlined', className: 'scene-mirror-tilt' });
  stage.camera.position.set(0, 0, 5.2);
  stage.camera.lookAt(0, 0, 0);
  stage.scene.background = new Color(colors.paper);
  stage.scene.add(new AmbientLight('#ffffff', 1));
  const canvas = stage.canvas as DrawableCanvas;

  let native = false;
  let elementTexture: ElementTexture | null = null;
  let unlisten = () => {};
  let simTexture: Texture | null = null;
  const button = h('button', { type: 'button', class: 'mirror-tilt-target', drawable: true }, 'Polish the mirror');
  if (useNative) {
    makeDrawableHost(canvas);
    canvas.removeAttribute('role');
    canvas.append(button);
    native = typeof canvas.requestPaint === 'function' && typeof canvas.updateElementGeometry === 'function';
  }
  const material = new MeshBasicMaterial({ transparent: true });
  if (native) {
    elementTexture = new ElementTexture(stage.renderer, button);
    material.map = elementTexture.texture;
    unlisten = onPaint(canvas, (changed) => {
      if (changed.includes(button)) elementTexture!.invalidate();
      if (elementTexture!.needsUpload) elementTexture!.upload();
      stage.invalidate();
    });
    canvas.requestPaint();
  } else {
    button.remove();
    simTexture = labelTexture({ text: 'Polish', sub: 'the mirror', width: 480, height: 200, background: '#f6ead2', ink: colors.ink, accent: colors.accent });
    material.map = simTexture;
  }
  const element = native ? { width: button.offsetWidth || 240, height: button.offsetHeight || 100 } : { width: 240, height: 100 };
  const plane = { width: PLANE_W, height: (PLANE_W * element.height) / element.width };
  const mesh = new Mesh(new PlaneGeometry(plane.width, plane.height), material);
  stage.scene.add(mesh);

  const drawnShape = s('polygon', { class: 'tilt-drawn' });
  const hitShape = s('polygon', { class: 'tilt-hit' });
  const overlay = s('svg', { class: 'tilt-overlay', 'aria-hidden': 'true' }, drawnShape, hitShape);
  stage.el.append(overlay);
  const status = h('p', { class: 'tilt-status', 'aria-live': 'polite' }, native ? 'Real hit testing' : 'Simulated: same matrices, no real snapshot');
  stage.el.append(status);

  let sync = true;
  let current: Matrix16 | null = null;
  let synced: Matrix16 | null = null;
  const clickers: Array<(kind: ClickKind, point: Point) => void> = [];
  const box = { x: 0, y: 0, ...element };
  const pts = (q: Point[] | null) => (q ? q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') : '');

  stage.onFrame((_dt, time) => {
    const speed = stage.reducedMotion ? 0.25 : 0.7;
    mesh.rotation.set(-0.12, Math.sin(time * speed) * 0.85, 0.04);
    mesh.updateMatrixWorld(true);
    const rect = stage.canvas.getBoundingClientRect();
    const viewport = { width: rect.width || 1, height: rect.height || 1 };
    current = elementToCanvasMatrix({ objectMatrixWorld: mesh.matrixWorld, camera: stage.camera, plane, element, viewport });
    if (sync) {
      synced = current;
      if (native) canvas.updateElementGeometry!(button, { canvasTransform: new DOMMatrix(current) });
    }
    overlay.setAttribute('viewBox', `0 0 ${viewport.width} ${viewport.height}`);
    drawnShape.setAttribute('points', pts(quadOf(current, box)));
    hitShape.setAttribute('points', pts(synced && quadOf(synced, box)));
    return true;
  });

  stage.el.addEventListener('click', (event) => {
    if (event.detail === 0 || !current) return;
    const rect = stage.canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const drawnQuad = quadOf(current, box);
    const onDrawn = !!drawnQuad && insideQuad(drawnQuad, point);
    const hitQuad = synced && quadOf(synced, box);
    const registered = native ? event.target instanceof Node && button.contains(event.target) : !!hitQuad && insideQuad(hitQuad, point);
    const kind = classifyClick(onDrawn ? 'card' : null, registered ? 'card' : null);
    clickers.forEach((cb) => cb(kind, point));
  });

  return {
    el: stage.el,
    native,
    setSync(on) {
      sync = on;
    },
    onClick: (cb) => void clickers.push(cb),
    destroy() {
      unlisten();
      if (native) canvas.clearElementGeometry?.(button);
      elementTexture?.dispose();
      simTexture?.dispose();
      stage.destroy();
    },
  };
}
