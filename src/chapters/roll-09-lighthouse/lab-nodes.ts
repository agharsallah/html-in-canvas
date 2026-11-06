/**
 * The lab's canvas children ("the harbour card") and their controls.
 * Every chip writes the real attribute on the real element: in native mode
 * the browser's accessibility tree changes; in simulated mode the elements
 * are real DOM in the sim layer, so inert and aria-hidden act for real too.
 */
import { createSegmented, type Segmented } from '../../ui/components/segmented';
import { createToggle, type Toggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import { expose, inherit, type DrawState, type Exposure, type NodeSpec } from './rules';

export type DrawChoice = Exclude<DrawState, 'never'>;
export type LabNodeId = 'title' | 'horn' | 'tide' | 'notice' | 'dismiss' | 'log';

export interface LabNode {
  id: LabNodeId;
  role: string;
  name: string;
  el: HTMLElement;
  /** The element you click or Tab to (the Dismiss button lives in the notice). */
  parent?: LabNode;
  drawable: boolean;
  draw: DrawChoice;
  /** Has it ever been drawn (or given geometry)? */
  everDrawn: boolean;
  inert: boolean;
  ariaHidden: boolean;
  focusable: boolean;
}

export interface NodeHooks {
  /** Called after any control changes a node. */
  changed(node: LabNode): void;
  /** Called when a node is set to "Stop + clear" or loses drawable. */
  clearGeometry(node: LabNode): void;
}

export function specOf(node: LabNode): NodeSpec {
  const own: NodeSpec = {
    drawable: node.drawable,
    draw: node.draw === 'stale' && !node.everDrawn ? 'never' : node.draw === 'drawn' && !node.drawable ? 'never' : node.draw,
    inert: node.inert,
    ariaHidden: node.ariaHidden,
    focusable: node.focusable,
  };
  return node.parent ? inherit(specOf(node.parent), { focusable: node.focusable }) : own;
}

export const exposureOfNode = (node: LabNode): Exposure => expose(specOf(node));

export function createLabNodes(): LabNode[] {
  const make = (id: LabNodeId, role: string, name: string, el: HTMLElement, drawable: boolean, focusable: boolean): LabNode => {
    el.classList.add('lh-child');
    el.dataset.node = id;
    el.toggleAttribute('drawable', drawable);
    return { id, role, name, el, drawable, draw: 'drawn', everDrawn: false, inert: false, ariaHidden: false, focusable };
  };
  const dismissEl = h('button', { type: 'button', class: 'lh-dismiss' }, 'Dismiss');
  const notice = make('notice', 'region', 'Old notice', h('section', { 'aria-label': 'Old notice' },
    h('p', {}, 'Storm warning (yesterday)'), dismissEl), true, false);
  const dismiss: LabNode = { id: 'dismiss', role: 'button', name: 'Dismiss', el: dismissEl, parent: notice, drawable: true, draw: 'drawn', everDrawn: false, inert: false, ariaHidden: false, focusable: true };
  return [
    make('title', 'heading', 'Harbour lights', h('h3', {}, 'Harbour lights'), true, false),
    make('horn', 'button', 'Sound the foghorn', h('button', { type: 'button' }, 'Sound the foghorn'), true, true),
    make('tide', 'paragraph', 'High tide at 06:40', h('p', {}, 'High tide at 06:40'), true, false),
    notice,
    dismiss,
    make('log', 'paragraph', 'Keeper’s log: all quiet', h('p', {}, 'Keeper’s log: all quiet'), false, false),
  ];
}

export interface NodeControls {
  el: HTMLElement;
  draw: Segmented<DrawChoice>;
  drawable: Toggle;
}

/** One row of chips and a draw selector for a top-level node. */
export function createNodeControls(node: LabNode, hooks: NodeHooks): NodeControls {
  const tag = node.el.tagName.toLowerCase();
  const drawable = createToggle({ kind: 'chip', label: 'drawable', checked: node.drawable, onChange: (on) => {
    if (!on && node.everDrawn) hooks.clearGeometry(node);
    node.drawable = on;
    node.el.toggleAttribute('drawable', on);
    hooks.changed(node);
  } });
  const inert = createToggle({ kind: 'chip', label: 'inert', onChange: (on) => {
    node.inert = on;
    node.el.inert = on;
    hooks.changed(node);
  } });
  const hidden = createToggle({ kind: 'chip', label: 'aria-hidden="true"', onChange: (on) => {
    node.ariaHidden = on;
    if (on) node.el.setAttribute('aria-hidden', 'true');
    else node.el.removeAttribute('aria-hidden');
    hooks.changed(node);
  } });
  const draw = createSegmented<DrawChoice>({
    label: `How the paint handler treats the ${tag}`,
    value: node.draw,
    options: [
      { value: 'drawn', label: 'Draw' },
      { value: 'stale', label: 'Stop' },
      { value: 'cleared', label: 'Stop + clear' },
    ],
    onChange: (value) => {
      node.draw = value;
      if (value === 'cleared') hooks.clearGeometry(node);
      hooks.changed(node);
    },
  });
  const el = h('div', { class: 'lh-row', role: 'group', 'aria-label': `<${tag}> ${node.name}` },
    h('p', { class: 'lh-row-name' }, h('code', {}, `<${tag}>`), ' ', node.name),
    h('div', { class: 'lh-row-chips' }, drawable.el, inert.el, hidden.el),
    draw.el);
  return { el, draw, drawable };
}
