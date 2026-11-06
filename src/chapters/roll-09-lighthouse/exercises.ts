import { inOrder, type Exercise } from '../shared/exercise';

const RING = /ctx\.drawFocusIfNeeded\(\s*focusedPath\s*,\s*document\.activeElement\s*\)/;
const LAST_FILL = /ctx\.fill\(\s*path\s*\)/;
const LAST_LABEL = /ctx\.drawElementImage\(\s*label\s*,\s*x\s*,\s*y\s*\)/;
const HIDE_BACK = /hidden\.(inert\s*=\s*true|setAttribute\(\s*"inert"|toggleAttribute\(\s*"inert"\s*(,\s*true\s*)?\))/;
const WAKE_FRONT = /visible\.(inert\s*=\s*false|removeAttribute\(\s*"inert"\s*\)|toggleAttribute\(\s*"inert"\s*,\s*false\s*\))/;

export const exercises: Exercise[] = [
  {
    id: 'lighthouse-pie-roles',
    title: 'Give the chart a voice',
    task: 'A screen reader hears three loose bits of text and Tab skips them all. Describe the canvas as a list called “Pie Chart”, make each label an item of it, and give each label a tab stop.',
    language: 'html',
    starter: `<canvas content="drawable">
  <div drawable class="label">45% Apple</div>
  <div drawable class="label">35% Blackberry</div>
  <div drawable class="label">20% Durian</div>
</canvas>`,
    solution: `<canvas content="drawable" role="list" aria-label="Pie Chart">
  <div drawable class="label" role="listitem" tabindex="0">45% Apple</div>
  <div drawable class="label" role="listitem" tabindex="0">35% Blackberry</div>
  <div drawable class="label" role="listitem" tabindex="0">20% Durian</div>
</canvas>`,
    checks: [
      { label: 'The canvas is announced as a list', test: /<canvas\b[^>]*\brole\s*=\s*"list"/i },
      { label: 'The list is named “Pie Chart”', test: /<canvas\b[^>]*\baria-label\s*=\s*"Pie Chart"/i },
      { label: 'Every label is a list item', test: (code) => (code.match(/<div\b[^>]*\brole\s*=\s*"listitem"/gi) ?? []).length === 3 },
      { label: 'Every label can be reached with Tab', test: (code) => (code.match(/<div\b[^>]*\btabindex\s*=\s*"0"/gi) ?? []).length === 3 },
      { label: 'The labels stay drawable', test: (code) => (code.match(/<div\b[^>]*\sdrawable\b/gi) ?? []).length === 3 },
    ],
    hints: [
      'Two attributes go on `<canvas>`: one says what it is, one names it. Two more go on each label.',
      'The pie chart example uses `role="list" aria-label="…"` on the canvas, and `role="listitem" tabindex="0"` on each label.',
    ],
    seenIn: 'roles-tabindex',
  },
  {
    id: 'lighthouse-focus-ring',
    title: 'Ring the focused wedge',
    task: 'While drawing, remember the wedge path whose label has focus. After every wedge and label is drawn, ring that path for the focused element.',
    language: 'js',
    starter: `canvas.onpaint = () => {
  ctx.reset();
  let focusedPath = null;
  for (const label of canvas.children) {
    const path = wedgeFor(label);
    ctx.fill(path);
    // remember the path if this label has focus

    const [x, y] = labelSpot(label);
    ctx.drawElementImage(label, x, y);
  }
  // ring the focused wedge, on top of everything

};`,
    solution: `canvas.onpaint = () => {
  ctx.reset();
  let focusedPath = null;
  for (const label of canvas.children) {
    const path = wedgeFor(label);
    ctx.fill(path);
    if (document.activeElement === label) focusedPath = path;
    const [x, y] = labelSpot(label);
    ctx.drawElementImage(label, x, y);
  }
  if (focusedPath) ctx.drawFocusIfNeeded(focusedPath, document.activeElement);
};`,
    checks: [
      { label: 'Remembers the path when its label is the focused element', test: /(document\.activeElement\s*===?\s*label|label\s*===?\s*document\.activeElement)[^;]*?focusedPath\s*=\s*path/ },
      { label: 'Rings the remembered path for the focused element', test: RING },
      { label: 'Rings it after the loop, so no wedge or label covers it', test: (code) => inOrder(code, LAST_LABEL, RING) && inOrder(code, LAST_FILL, RING) && /\}\s*(if\s*\(\s*focusedPath\s*\)\s*)?ctx\.drawFocusIfNeeded/.test(code) },
    ],
    hints: [
      'Inside the loop, compare `document.activeElement` with `label`. After the loop, there is a 2D method made for focus rings.',
      '`if (document.activeElement === label) focusedPath = path;` then, after the closing `}` of the loop: `ctx.drawFocusIfNeeded(focusedPath, document.activeElement)`.',
    ],
    seenIn: 'draw-focus',
  },
  {
    id: 'lighthouse-flip-inert',
    title: 'Silence the hidden face',
    task: 'A card flips between two faces drawn into the canvas. Keep both in the DOM, but make the face you can’t see unreachable for keyboards, clicks and screen readers, and wake the visible one.',
    language: 'js',
    starter: `function showFace(front, back, showingFront) {
  const visible = showingFront ? front : back;
  const hidden = showingFront ? back : front;
  // silence the hidden face, wake the visible one

}`,
    solution: `function showFace(front, back, showingFront) {
  const visible = showingFront ? front : back;
  const hidden = showingFront ? back : front;
  hidden.inert = true;
  visible.inert = false;
}`,
    checks: [
      { label: 'The hidden face leaves Tab, clicks and the accessibility tree', test: HIDE_BACK },
      { label: 'The visible face can be reached again', test: WAKE_FRONT },
      { label: 'Both faces stay in the DOM', test: (code) => !/\.remove\(\s*\)|removeChild\(/.test(code) },
    ],
    hints: [
      '`aria-hidden` only silences screen readers: a hidden button could still be tabbed to. One attribute removes all three.',
      'The flip-card demo sets `inert` on the face nobody sees and removes it from the visible one: `hidden.inert = true; visible.inert = false;`.',
    ],
    seenIn: 'hide-stale',
  },
];
