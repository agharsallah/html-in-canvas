/**
 * The trial's canvas UI, "the tide board", and its audit. Pure data and
 * functions: the trial view and the unit tests share them.
 *
 * It is built from the official patterns:
 *  - pie-chart.html: canvas role="list" + aria-label, drawable labels with
 *    role="listitem" tabindex="0", drawFocusIfNeeded() drawn last.
 *  - webGL.html: views nobody can see are made inert.
 *  - webgpu-jelly-slider: the real <input type="range"> is drawable and
 *    invisible (opacity: 0), the drawn readout is inert.
 *  - README Accessibility: no geometry when drawn with preserveElementGeometry
 *    and never given updateElementGeometry().
 */
import { expose, type DrawState, type Exposure } from './rules';

export type BoardNodeId = 'dawn' | 'noon' | 'dusk' | 'yesterday' | 'slider' | 'readout';
/** What the element is for, which decides what "accessible" means for it. */
export type Intent = 'interactive' | 'retired' | 'duplicate';

export interface BoardNode {
  id: BoardNodeId;
  /** How a screen reader names it. */
  name: string;
  markup: string;
  intent: Intent;
  /** Natively focusable (or contains a focusable element). */
  nativeFocusable: boolean;
  /** Offers a tabindex="0" chip. */
  tabindexChip: boolean;
  /** Still drawn each paint, or a view that stopped being drawn. */
  draw: Exclude<DrawState, 'cleared' | 'never'>;
}

export const BOARD: readonly BoardNode[] = [
  { id: 'dawn', name: 'Dawn 45%, list item', markup: '<div drawable role="listitem"', intent: 'interactive', nativeFocusable: false, tabindexChip: true, draw: 'drawn' },
  { id: 'noon', name: 'Noon 35%, list item', markup: '<div drawable role="listitem"', intent: 'interactive', nativeFocusable: false, tabindexChip: true, draw: 'drawn' },
  { id: 'dusk', name: 'Dusk 20%, list item', markup: '<div drawable role="listitem"', intent: 'interactive', nativeFocusable: false, tabindexChip: true, draw: 'drawn' },
  { id: 'yesterday', name: 'Yesterday’s tides, with a Replay button', markup: '<section drawable', intent: 'retired', nativeFocusable: true, tabindexChip: false, draw: 'stale' },
  { id: 'slider', name: 'Tide height, slider, 70%', markup: '<input drawable type="range" style="opacity: 0"', intent: 'interactive', nativeFocusable: true, tabindexChip: false, draw: 'drawn' },
  { id: 'readout', name: '70%', markup: '<div drawable id="readout"', intent: 'duplicate', nativeFocusable: false, tabindexChip: false, draw: 'drawn' },
];

export interface NodeAttrs {
  tabindex: boolean;
  inert: boolean;
  ariaHidden: boolean;
}

export interface BoardConfig {
  canvasRole: boolean;
  canvasLabel: boolean;
  nodes: Record<BoardNodeId, NodeAttrs>;
  /** Dusk is drawn with { preserveElementGeometry: true }. */
  duskPreserve: boolean;
  /** drawFocusIfNeeded() runs after every wedge is filled. */
  ringLast: boolean;
}

/** The board as the learner finds it: seven bugs and one healthy label. */
export function brokenBoard(): BoardConfig {
  return {
    canvasRole: true,
    canvasLabel: false,
    nodes: {
      dawn: { tabindex: true, inert: false, ariaHidden: false },
      noon: { tabindex: false, inert: false, ariaHidden: false },
      dusk: { tabindex: true, inert: false, ariaHidden: false },
      yesterday: { tabindex: false, inert: false, ariaHidden: true },
      slider: { tabindex: false, inert: true, ariaHidden: false },
      readout: { tabindex: false, inert: false, ariaHidden: false },
    },
    duskPreserve: true,
    ringLast: false,
  };
}

export function exposureOf(config: BoardConfig, node: BoardNode): Exposure {
  const attrs = config.nodes[node.id];
  const never = node.id === 'dusk' && config.duskPreserve;
  return expose({
    drawable: true,
    draw: never ? 'never' : node.draw,
    inert: attrs.inert,
    ariaHidden: attrs.ariaHidden,
    focusable: node.nativeFocusable || (node.tabindexChip && attrs.tabindex),
  });
}

export interface Finding {
  /** Which element (or 'canvas' / 'paint') the symptom belongs to. */
  target: BoardNodeId | 'canvas' | 'paint';
  /** What a user experiences. Symptoms, never the fix. */
  symptom: string;
}

function nodeFindings(node: BoardNode, e: Exposure): Finding[] {
  const out: Finding[] = [];
  const f = (symptom: string) => out.push({ target: node.id, symptom });
  if (node.intent === 'interactive') {
    if (!e.announced) f(`${node.name}: a screen reader never hears it, though everyone else can see it.`);
    if (e.announced && !e.tabbable) f(`${node.name}: keyboard users can’t reach it with Tab.`);
    if (e.announced && e.geometry !== 'bounds') f(`${node.name}: reported without geometry, so a magnifier filters it out and clicks miss it.`);
  } else if (node.intent === 'retired') {
    if (e.announced) f(`${node.name}: no longer drawn, but a screen reader still reads it out.`);
    if (e.tabbable) f(`${node.name}: Tab lands on an invisible Replay button.`);
    if (e.hitTestable) f(`${node.name}: clicks where it used to be still press the invisible Replay button.`);
  } else if (e.announced) {
    f(`${node.name}: the value is read twice, once by the slider and again by the drawn readout.`);
  }
  return out;
}

export function auditBoard(config: BoardConfig): Finding[] {
  const findings: Finding[] = [];
  if (!config.canvasRole) findings.push({ target: 'canvas', symptom: 'The labels are announced as loose text, not as items of one list.' });
  if (!config.canvasLabel) findings.push({ target: 'canvas', symptom: 'The list has no name: “list, 3 items” of what?' });
  for (const node of BOARD) findings.push(...nodeFindings(node, exposureOf(config, node)));
  if (!config.ringLast) findings.push({ target: 'paint', symptom: 'Tabbing to a label rings its wedge, but the next wedges are painted over the ring.' });
  return findings;
}

/** Distinct elements that still have at least one symptom. */
export function bugCount(config: BoardConfig): number {
  return new Set(auditBoard(config).map((f) => f.target)).size;
}
