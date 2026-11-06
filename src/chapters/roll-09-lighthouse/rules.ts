/**
 * The rules of the lighthouse, as pure functions. They drive the lab's
 * "screen reader view", the 3D beam, the trial audit and the unit tests.
 *
 * README.md, Accessibility (R:317, R:319); Chrome docs concepts.md (CC:390-399):
 *  - content="drawable" children are in the accessibility tree like any DOM,
 *    unless hidden with primitives such as aria-hidden="true" or inert.
 *  - A drawable whose geometry was never updated (by drawElementImage, which
 *    does it by default, or by updateElementGeometry) is reported WITHOUT
 *    geometry. Layout-only children are never drawn, so never get geometry.
 *  - clearElementGeometry marks the element offscreen and removes it from
 *    canvas hit testing (CC:249-256).
 *  - Children are not hit testable until they have geometry (R:26).
 *  - When drawing stops without clearing, the old geometry stays: clicks land
 *    where it used to be (CC:224).
 * General HTML (not in docs-llm): aria-hidden hides from assistive tech but
 * leaves focusable elements in the Tab order; inert removes both, and the
 * webGL demo uses inert to decide "which elements are hit tested" (gl:108-110).
 */

/** How a drawable's geometry was last set. */
export type DrawState = 'drawn' | 'stale' | 'cleared' | 'never';
export type Geometry = 'bounds' | 'stale' | 'offscreen' | 'none';

export interface NodeSpec {
  /** Has the drawable attribute (or sits in a drawable subtree). */
  drawable: boolean;
  draw: DrawState;
  inert: boolean;
  ariaHidden: boolean;
  /** Natively focusable or tabindex="0". */
  focusable: boolean;
}

export interface Exposure {
  /** In the accessibility tree, so a screen reader can announce it. */
  announced: boolean;
  geometry: Geometry;
  /** In the sequential focus (Tab) order. */
  tabbable: boolean;
  /** Clicks can reach it. */
  hitTestable: boolean;
  /**
   * Focusable but never given geometry. Whether such an element is keyboard
   * focusable is an open question in the README (#32): shown, never scored.
   */
  focusOpen: boolean;
}

export function geometryOf(node: Pick<NodeSpec, 'drawable' | 'draw'>): Geometry {
  if (!node.drawable) return 'none';
  switch (node.draw) {
    case 'drawn': return 'bounds';
    case 'stale': return 'stale';
    case 'cleared': return 'offscreen';
    case 'never': return 'none';
  }
}

export function expose(node: NodeSpec): Exposure {
  const geometry = geometryOf(node);
  const announced = !node.inert && !node.ariaHidden;
  const tabbable = node.focusable && !node.inert;
  const hitTestable = !node.inert && (geometry === 'bounds' || geometry === 'stale');
  return { announced, geometry, tabbable, hitTestable, focusOpen: tabbable && geometry === 'none' };
}

/** A child inherits hiding and (inside a drawable subtree) geometry from its parent. */
export function inherit(parent: NodeSpec, child: Pick<NodeSpec, 'focusable'> & Partial<NodeSpec>): NodeSpec {
  return {
    drawable: parent.drawable,
    draw: parent.draw,
    inert: parent.inert || !!child.inert,
    ariaHidden: parent.ariaHidden || !!child.ariaHidden,
    focusable: child.focusable,
  };
}

/** Ghost focus: Tab lands on something a screen reader is told to ignore. */
export const isGhostFocus = (e: Exposure): boolean => e.tabbable && !e.announced;

export const GEOMETRY_TEXT: Record<Geometry, string> = {
  bounds: 'bounds',
  stale: 'stale bounds (no longer drawn)',
  offscreen: 'offscreen',
  none: 'no geometry',
};

/** One line, the way the lab's screen reader view describes a node. */
export function describeExposure(e: Exposure): string {
  if (!e.announced) return e.tabbable ? 'silent, yet Tab still lands here' : 'silent';
  const parts = [GEOMETRY_TEXT[e.geometry]];
  if (e.tabbable) parts.push(e.focusOpen ? 'focusable? (open question)' : 'focusable');
  if (e.hitTestable) parts.push('clickable');
  return parts.join(' · ');
}

export interface Tally {
  announced: number;
  tabbable: number;
  bounds: number;
  hitTestable: number;
  total: number;
}

export function tally(list: readonly Exposure[]): Tally {
  return {
    announced: list.filter((e) => e.announced).length,
    tabbable: list.filter((e) => e.tabbable && !e.focusOpen).length,
    bounds: list.filter((e) => e.announced && e.geometry === 'bounds').length,
    hitTestable: list.filter((e) => e.hitTestable).length,
    total: list.length,
  };
}
