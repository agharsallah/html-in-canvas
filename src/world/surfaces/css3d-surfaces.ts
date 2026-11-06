/**
 * Fallback surfaces: CSS3DRenderer.
 *
 * The element lives in a DOM layer above the WebGL canvas and receives the
 * same camera transform. It reads and clicks like the real thing, but it is
 * always on top of the WebGL scene and can't be touched by shaders. That
 * contrast is exactly what HTML-in-Canvas fixes, and the site says so.
 */
import type { Camera, Scene } from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import type { Viewport } from '../stage';
import type { SurfaceBackend, SurfaceBinding, SurfaceHandle } from './surface';

export class Css3dSurfaces implements SurfaceBackend {
  readonly mode = 'simulated' as const;
  private readonly renderer = new CSS3DRenderer();
  private lastViewport: Viewport = { width: 0, height: 0 };

  constructor(
    private readonly scene: Scene,
    layer: HTMLElement,
  ) {
    const el = this.renderer.domElement;
    el.classList.add('css3d-layer');
    layer.appendChild(el);
  }

  attach(binding: SurfaceBinding): SurfaceHandle {
    const { element, mesh, plane, elementSize } = binding;
    element.removeAttribute('drawable');
    const object = new CSS3DObject(element);
    const scale = plane.width / elementSize.width;
    object.scale.setScalar(scale);
    mesh.add(object);
    element.style.backfaceVisibility = 'hidden';

    return {
      texture: null,
      isReady: () => true,
      setDevelop: (amount) => {
        // A darkroom-ish develop: the image emerges from blank paper.
        element.style.setProperty('--develop', amount.toFixed(3));
      },
      detach: () => {
        mesh.remove(object);
        element.remove();
      },
    };
  }

  prepare(): void {
    /* no snapshots in the fallback: the DOM renders itself */
  }

  finish(camera: Camera, viewport: Viewport): void {
    if (viewport.width !== this.lastViewport.width || viewport.height !== this.lastViewport.height) {
      this.renderer.setSize(viewport.width, viewport.height);
      this.lastViewport = { ...viewport };
    }
    this.renderer.render(this.scene, camera);
  }

  dispose(): void {
    this.renderer.domElement.remove();
  }
}
