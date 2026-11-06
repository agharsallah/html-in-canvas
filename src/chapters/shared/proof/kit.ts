/**
 * Proof scenes: after an exercise is solved, a small live canvas acts out
 * what the code does, with real HTML drawn by the real API (or the faithful
 * simulation without it). Every scene is built from this kit.
 */
import { detectCapabilities } from '../../../core/capabilities';
import { h } from '../../../ui/dom';
import { createLabCanvas, type LabCanvas } from '../lab-canvas';

export interface SceneKit {
  readonly lab: LabCanvas;
  readonly native: boolean;
  /** Make an element drawable and put it inside the canvas. */
  add<T extends HTMLElement>(el: T): T;
  /**
   * Draw on every paint and keep paints coming at `fps` while the stage is
   * on screen. `t` is seconds since the scene started.
   */
  animate(draw: (t: number, changed: readonly Element[]) => void, fps?: number): void;
  /** One live line of text under the stage. */
  readout(text: string): void;
  /** A colour token of the chapter, for 2D drawing (rings, wedges). */
  color(name: 'paper' | 'ink' | 'accent' | 'second' | 'glow'): string;
  /** Stage size in CSS px. */
  size(): { width: number; height: number };
  /** Register cleanup. */
  onDestroy(fn: () => void): void;
}

export type Scene<P = void> = (kit: SceneKit, params: P) => void;

export interface MountedScene {
  readonly el: HTMLElement;
  destroy(): void;
}

export function mountScene<P>(scene: Scene<P>, params: P, label: string): MountedScene {
  const caps = detectCapabilities();
  const stage = h('div', { class: 'proof-stage' });
  const line = h('p', { class: 'proof-readout', 'aria-live': 'off' });
  const el = h('div', { class: 'proof-body' }, stage, line);
  const lab = createLabCanvas(stage, caps, label, { maxScale: 2 });
  const cleanups: Array<() => void> = [];
  let visible = true;
  let timer = 0;
  const started = performance.now();

  const io = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (visible) lab.requestPaint();
  });
  io.observe(stage);
  cleanups.push(() => io.disconnect());

  const kit: SceneKit = {
    lab,
    native: lab.native,
    add(child) {
      child.setAttribute('drawable', '');
      lab.adopt(child);
      return child;
    },
    animate(draw, fps = 30) {
      cleanups.push(lab.onPaint((changed) => {
        lab.beginFrame();
        draw((performance.now() - started) / 1000, changed);
        clearTimeout(timer);
        if (visible) timer = window.setTimeout(() => lab.requestPaint(), 1000 / fps);
      }));
      lab.requestPaint();
    },
    readout(text) {
      if (line.textContent !== text) line.textContent = text;
    },
    color: (name) => getComputedStyle(stage).getPropertyValue(`--${name}`).trim() || '#888',
    size: () => ({ width: lab.canvas.clientWidth, height: lab.canvas.clientHeight }),
    onDestroy: (fn) => cleanups.push(fn),
  };
  scene(kit, params);

  return {
    el,
    destroy() {
      clearTimeout(timer);
      cleanups.forEach((fn) => fn());
      lab.destroy();
    },
  };
}

/** Ease in and out over [0, 1]. */
export const ease = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
