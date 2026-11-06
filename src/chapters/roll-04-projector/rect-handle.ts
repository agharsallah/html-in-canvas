/**
 * A draggable, resizable rectangle laid over a container, in the
 * container's CSS px. Pointer: drag the body to move, the corner to resize.
 * Keyboard: arrows move, Shift + arrows resize (2 px per press).
 * An optional rotation turns the rect about the container's origin, the way
 * ctx.rotate turns a drawing about the canvas origin.
 */
import { h } from '../../ui/dom';
import type { Rect } from './rules';

export interface RectHandleOptions {
  label: string;
  className: string;
  rect: Rect;
  /** The region the rect may occupy, in container px. */
  bounds: () => Rect;
  min?: number;
  onChange(rect: Rect): void;
}

export interface RectHandle {
  readonly el: HTMLElement;
  get(): Rect;
  set(rect: Rect): void;
  setEnabled(move: boolean, resize: boolean): void;
  setRotation(deg: number): void;
}

const STEP = 2;

export function createRectHandle({ label, className, rect, bounds, min = 12, onChange }: RectHandleOptions): RectHandle {
  let current = { ...rect };
  let canMove = true;
  let canResize = true;
  let rotation = 0;
  const corner = h('span', { class: 'pj-rh-corner', 'aria-hidden': 'true' });
  const el = h('div', { class: `pj-rh ${className}`, tabindex: '0', role: 'group', 'aria-label': `${label}. Arrow keys move it, Shift and arrow keys resize it.` }, corner);

  const clamp = (r: Rect): Rect => {
    const b = bounds();
    const w = Math.min(b.w, Math.max(min, r.w));
    const hh = Math.min(b.h, Math.max(min, r.h));
    return {
      x: Math.min(b.x + b.w - w, Math.max(b.x, r.x)),
      y: Math.min(b.y + b.h - hh, Math.max(b.y, r.y)),
      w, h: hh,
    };
  };
  const render = () => {
    Object.assign(el.style, { left: `${current.x}px`, top: `${current.y}px`, width: `${current.w}px`, height: `${current.h}px`,
      transformOrigin: `${-current.x}px ${-current.y}px`, transform: rotation ? `rotate(${rotation}deg)` : '' });
    el.dataset.move = String(canMove);
    el.dataset.resize = String(canResize);
  };
  const update = (next: Rect) => {
    current = clamp(next);
    render();
    onChange({ ...current });
  };

  /** Pointer delta in the rect's own (possibly rotated) frame. */
  const local = (dx: number, dy: number) => {
    const a = (-rotation * Math.PI) / 180;
    return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
  };

  el.addEventListener('pointerdown', (event) => {
    const resizing = event.target === corner;
    if (resizing ? !canResize : !canMove) return;
    event.preventDefault();
    el.focus();
    el.setPointerCapture(event.pointerId);
    const start = { x: event.clientX, y: event.clientY, rect: { ...current } };
    const move = (e: PointerEvent) => {
      const d = local(e.clientX - start.x, e.clientY - start.y);
      update(resizing
        ? { ...start.rect, w: start.rect.w + d.x, h: start.rect.h + d.y }
        : { ...start.rect, x: start.rect.x + d.x, y: start.rect.y + d.y });
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });

  el.addEventListener('keydown', (event) => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!dir) return;
    const [dx, dy] = dir as [number, number];
    if (event.shiftKey ? !canResize : !canMove) return;
    event.preventDefault();
    update(event.shiftKey
      ? { ...current, w: current.w + dx * STEP, h: current.h + dy * STEP }
      : { ...current, x: current.x + dx * STEP, y: current.y + dy * STEP });
  });

  render();
  return {
    el,
    get: () => ({ ...current }),
    set(next) {
      current = clamp(next);
      render();
    },
    setEnabled(move, resize) {
      canMove = move;
      canResize = resize;
      el.setAttribute('aria-disabled', String(!move && !resize));
      render();
    },
    setRotation(deg) {
      rotation = deg;
      render();
    },
  };
}
