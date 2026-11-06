/**
 * The lab's paint handler: draws each top-level node that is set to "Draw"
 * into a fixed slot, with a small lamp beside it. A lamp is lit when its
 * node is announced, dark when silent. With the ring switch on, the lamp of
 * the focused node is ringed with drawFocusIfNeeded(), last, on top of
 * everything (Examples/pie-chart.html).
 */
import type { Drawable2DContext } from '../../hic/types';
import type { LabCanvas } from '../shared/lab-canvas';
import { exposureOfNode, type LabNode } from './lab-nodes';

const LEFT = 48;
const TOP = 14;
const GAP = 12;

export interface PaintOptions {
  ringLamp: boolean;
  colors: { glow: string; ink: string; accent: string };
}

export interface PaintResult {
  /** The node whose lamp got a focus ring this paint, if any. */
  ringed: LabNode | null;
  /** Real exceptions thrown by drawElementImage, per node. */
  errors: Array<{ node: LabNode; error: unknown }>;
}

/** Draw one frame. A node whose draw throws is skipped and reported. */
export function paintHarbour(lab: LabCanvas, nodes: readonly LabNode[], { ringLamp, colors }: PaintOptions): PaintResult {
  lab.beginFrame();
  const ctx = lab.ctx;
  const scale = lab.scale();
  const top = nodes.filter((n) => !n.parent);
  const active = document.activeElement;
  let y = TOP;
  let focusedPath: Path2D | null = null;
  let focusedNode: LabNode | null = null;
  const errors: PaintResult['errors'] = [];

  for (const node of top) {
    const height = Math.max(node.el.offsetHeight, 28);
    if (node.drawable && node.draw === 'drawn') {
      try {
        lab.drawElement(node.el, LEFT, y);
      } catch (error) {
        errors.push({ node, error });
        y += height + GAP;
        continue;
      }
      node.everDrawn = true;
      const lamp = new Path2D();
      lamp.arc(LEFT / 2, y + height / 2, 9, 0, Math.PI * 2);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = exposureOfNode(node).announced ? colors.glow : '#6b6158';
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.5;
      ctx.fill(lamp);
      ctx.stroke(lamp);
      ctx.resetTransform();
      if (active && (active === node.el || node.el.contains(active))) {
        focusedPath = lamp;
        focusedNode = node;
      }
    }
    y += height + GAP;
  }

  if (!ringLamp || !focusedPath || !active) return { ringed: null, errors };
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (lab.native) {
    (ctx as Drawable2DContext).drawFocusIfNeeded(focusedPath, active);
  } else {
    // Simulated: the element is not a canvas descendant here, so the real
    // drawFocusIfNeeded() would do nothing. Stroke the same path instead.
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.accent;
    ctx.stroke(focusedPath);
  }
  ctx.resetTransform();
  return { ringed: focusedNode, errors };
}

/** Bounds relative to the canvas, read back from the DOM (CSS px). */
export function rectText(el: HTMLElement, canvas: HTMLElement): string {
  const r = el.getBoundingClientRect();
  const c = canvas.getBoundingClientRect();
  return `${Math.round(r.left - c.left)}, ${Math.round(r.top - c.top)} ${Math.round(r.width)}×${Math.round(r.height)}`;
}
