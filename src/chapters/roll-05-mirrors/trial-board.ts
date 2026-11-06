/**
 * The trial board: one mirror (level) drawn as the learner sees it, plus the
 * ghosts, the hit areas the rules say the DOM holds, once revealed. Pieces
 * are placed with CSS `matrix3d()`, which takes the same 16 numbers as
 * `new DOMMatrix(array)`. The board is 480x300 CSS px, scaled to fit.
 */
import { s } from '../../ui/charts/svg';
import { h } from '../../ui/dom';
import { BOARD, sizesFor, type Config, type Level } from './levels';
import { hitArea, stackRank, type Point } from './rules';

export interface Board {
  readonly el: HTMLElement;
  render(config: Config, revealed: boolean, done: ReadonlySet<number>): void;
  onPoint(cb: (p: Point) => void): void;
  mark(p: Point, ok: boolean): void;
  destroy(): void;
}

export function createBoard(level: Level): Board {
  const pieces = level.pieces.filter((p) => !p.undrawn).map((piece) => h('div', {
    class: 'board-piece', 'data-scenery': String(!!piece.scenery),
    style: `width:${piece.size.width}px;height:${piece.size.height}px;transform:matrix3d(${piece.drawn.join(',')})`,
  }, piece.scenery ? '' : piece.label));
  const floors = level.targets.filter((t) => t.expect === null).map((t) =>
    h('div', { class: 'board-floor', style: `left:${t.at.x}px;top:${t.at.y}px` }, h('span', {}, t.label)));
  const ghosts = s('g', { class: 'board-ghosts' });
  const marks = s('g', {});
  const svg = s('svg', { class: 'board-svg', viewBox: `0 0 ${BOARD.width} ${BOARD.height}` }, ghosts, marks);
  const inner = h('div', { class: 'board' }, ...pieces, ...floors, svg);
  const el = h('div', { class: 'board-frame', role: 'img', 'aria-label': `${level.title}: ${level.brief}` }, inner);
  let scale = 1;
  const points: Array<(p: Point) => void> = [];

  const ro = new ResizeObserver(() => {
    scale = el.clientWidth / BOARD.width || 1;
    inner.style.transform = `scale(${scale})`;
  });
  ro.observe(el);
  el.addEventListener('click', (event) => {
    if (event.detail === 0) return;
    const rect = el.getBoundingClientRect();
    const p = { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
    points.forEach((cb) => cb(p));
  });

  return {
    el,
    render(config, revealed, done) {
      const g = level.geometry(config);
      const sizes = sizesFor(level);
      ghosts.replaceChildren();
      el.dataset.revealed = String(revealed);
      if (revealed) {
        for (const piece of level.pieces) {
          const quad = hitArea(g, piece.id, sizes[piece.id]!);
          if (!quad) continue;
          const rank = stackRank(g, piece.id);
          const corner = quad.reduce((a, b) => (a.x + a.y <= b.x + b.y ? a : b));
          ghosts.append(
            s('polygon', { class: 'board-ghost', 'data-scenery': String(!!piece.scenery), points: quad.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ') }),
            s('g', { transform: `translate(${Math.max(12, corner.x + 12)} ${Math.max(12, corner.y + 12)})`, class: 'board-rank' },
              s('circle', { r: 10 }), s('text', { 'text-anchor': 'middle', y: 4 }, String(rank))));
        }
      }
      pieces.forEach((node, i) => {
        const piece = level.pieces.filter((p) => !p.undrawn)[i]!;
        const index = level.targets.findIndex((t) => t.expect === piece.id);
        node.dataset.done = String(index >= 0 && done.has(index));
      });
      floors.forEach((node) => {
        const index = level.targets.findIndex((t) => t.expect === null);
        node.dataset.done = String(done.has(index));
      });
    },
    onPoint: (cb) => void points.push(cb),
    mark(p, ok) {
      marks.append(s('circle', { class: 'board-mark', 'data-ok': String(ok), cx: p.x, cy: p.y, r: 7 }));
      while (marks.childElementCount > 12) marks.firstElementChild?.remove();
    },
    destroy() {
      ro.disconnect();
      el.remove();
    },
  };
}
