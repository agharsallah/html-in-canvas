/**
 * Figure registry: one 3D figure per concept that has one.
 */
import type { FigureId } from '../content';
import type { FigureSpec } from '../stage/figure';
import { accessibilityFigure, readBackFigure } from './care';
import { inkOverflowFigure, overloadsFigure, unitsFigure } from './drawing';
import { canvasClipFigure, hitOrderFigure, syncGeometryFigure } from './geometry';
import { webglFigure, workersFigure } from './gpu-workers';
import { contentAttrFigure, drawableAttrFigure, nestedFigure } from './markup';
import { changedElementsFigure, nextFrameFigure, paintPipelineFigure, requestPaintFigure, reverseOrderFigure } from './paint';

export { heroFigure } from './hero';

export const FIGURES: Record<FigureId, FigureSpec> = {
  'content-attr': contentAttrFigure,
  'drawable-attr': drawableAttrFigure,
  nested: nestedFigure,
  'paint-pipeline': paintPipelineFigure,
  'changed-elements': changedElementsFigure,
  'request-paint': requestPaintFigure,
  'next-frame': nextFrameFigure,
  'reverse-order': reverseOrderFigure,
  overloads: overloadsFigure,
  'ink-overflow': inkOverflowFigure,
  units: unitsFigure,
  'sync-geometry': syncGeometryFigure,
  'canvas-clip': canvasClipFigure,
  'hit-order': hitOrderFigure,
  webgl: webglFigure,
  workers: workersFigure,
  accessibility: accessibilityFigure,
  'read-back': readBackFigure,
};
