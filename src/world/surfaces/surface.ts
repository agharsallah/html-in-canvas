/**
 * An HTML surface puts a real HTML element onto a 3D plane.
 *
 * Two interchangeable backends:
 *  - NativeSurfaces:  HTML-in-Canvas. The element is a `drawable` child of the
 *                     WebGL canvas, copied into a texture on `paint`, and its
 *                     DOM geometry is synced so clicks land where it's drawn.
 *  - Css3dSurfaces:   fallback. The element is placed in a CSS 3D layer that
 *                     mirrors the camera. Looks similar; it's the "old way".
 *
 * World code only talks to this interface and never branches on mode.
 */
import type { Camera, Mesh, Texture } from 'three';
import type { RenderMode } from '../../core/capabilities';
import type { Size } from '../../hic/projective-geometry';
import type { Viewport } from '../stage';

export interface SurfaceBinding {
  element: HTMLElement;
  /** The plane mesh (centered, in its local XY plane) the element covers. */
  mesh: Mesh;
  /** Plane size in world units. */
  plane: Size;
  /** Element border-box size in CSS px. Must match the CSS of the element. */
  elementSize: Size;
}

export interface SurfaceHandle {
  /** Texture to sample, or null when the element is shown by other means. */
  readonly texture: Texture | null;
  /** True once there is something to show (native: first upload done). */
  isReady(): boolean;
  /** 0 = blank paper, 1 = fully developed. Backends render it their way. */
  setDevelop(amount: number): void;
  detach(): void;
}

export interface SurfaceBackend {
  readonly mode: RenderMode;
  attach(binding: SurfaceBinding): SurfaceHandle;
  /** Before rendering (after the scene moved): refresh visible snapshots that changed. */
  prepare(changed: ReadonlySet<Element>, camera: Camera, viewport: Viewport): void;
  /** After rendering a frame: sync DOM geometry or the CSS layer. */
  finish(camera: Camera, viewport: Viewport): void;
  /** Mark all snapshots stale (e.g. after the render loop was paused). */
  invalidate?(): void;
  dispose(): void;
}
