/**
 * Progressive enhancement: every section ships as plain HTML inside a
 * `<div class="stage">`. When the browser supports HTML-in-Canvas, the div is
 * swapped for `<canvas content="drawable">` and its children move into it.
 *
 * Why not author `<canvas content="drawable">` directly? Without the API (or
 * without JavaScript) canvas children are fallback content and stay invisible.
 * A div keeps the content readable everywhere, and indexable.
 */
const COPY = /^(class|style|role|aria-.*|data-.*|id)$/;

export function upgradeStage(stage: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  for (const attr of Array.from(stage.attributes)) {
    if (COPY.test(attr.name)) canvas.setAttribute(attr.name, attr.value);
  }
  // The current attribute, plus the legacy name early builds used.
  canvas.setAttribute('content', 'drawable');
  canvas.setAttribute('layoutsubtree', '');
  canvas.classList.add('is-live');
  // Children keep their `drawable` attributes from the markup.
  while (stage.firstChild) canvas.append(stage.firstChild);
  stage.replaceWith(canvas);
  return canvas;
}

/** Finds a stage by its data-stage name inside a section root. */
export function stageIn(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-stage="${name}"]`);
}
