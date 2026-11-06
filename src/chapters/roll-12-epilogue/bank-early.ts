/**
 * Boss rush question bank, part 1: the prologue to the mirror maze.
 * Pure data. Every right answer cites the explainer or the Chrome docs.
 */
import type { RushQuestion } from './rules';

export const BANK_EARLY: readonly RushQuestion[] = [
  { id: 'rush-prologue-usecase', roll: 'prologue', source: 'README.md, Use cases',
    prompt: 'Which of these is one of the README’s five use cases?',
    options: [
      { label: 'Exporting HTML content as images or video', correct: true, why: 'Media export is the fifth use case.' },
      { label: 'Reading the pixels of cross-origin images', why: 'Cross-origin content is never painted. That was the vault.' },
      { label: 'Laying out HTML without any DOM', why: 'Drawable content is real DOM, children of the canvas.' },
    ] },
  { id: 'rush-prologue-why', roll: 'prologue', source: 'README.md, Motivation',
    prompt: 'According to the README, where does canvas-based content suffer?',
    options: [
      { label: 'Accessibility, internationalization, performance and quality', correct: true, why: 'That is the README’s own list.' },
      { label: 'Only in performance', why: 'Performance is one of four.' },
      { label: 'Nowhere: canvas text was already fine', why: 'There was no easy way to render complex layouts of text into a canvas.' },
    ] },
  { id: 'rush-fog-default', roll: 'fog', source: 'README.md, 1. The canvas content attribute',
    prompt: 'What is the default value of a canvas’ `content` attribute?',
    options: [
      { label: '`fallback`: children are fallback content', correct: true, why: '`drawable` is the opt-in; `fallback` is the default.' },
      { label: '`drawable`: children are laid out', why: 'That has to be opted into.' },
      { label: '`none`', why: 'There are two values: `fallback` and `drawable`.' },
    ] },
  { id: 'rush-fog-throw', roll: 'fog', source: 'README.md, 4. drawElementImage',
    prompt: 'You call `ctx.drawElementImage(el, 0, 0)` on a canvas child without the `drawable` attribute. What happens?',
    options: [
      { label: 'An exception is thrown', correct: true, why: 'Elements must be `drawable` to be drawn.' },
      { label: 'It draws anyway', why: 'The `drawable` attribute is required for drawing.' },
      { label: 'It silently draws nothing', why: 'It does not fail silently: it throws.' },
    ] },
  { id: 'rush-bells-dom', roll: 'bells', source: 'README.md, 3. The paint event',
    prompt: 'Inside a `paint` handler you change a drawable’s text. When does the new text show in the canvas?',
    options: [
      { label: 'In the next rendering update', correct: true, why: 'DOM changes made in `paint` show up in the subsequent update.' },
      { label: 'In this rendering update', why: 'Only canvas drawing commands land in the current update.' },
      { label: 'Never', why: 'Deferred, not dropped.' },
    ] },
  { id: 'rush-bells-request', roll: 'bells', source: 'README.md, 3. The paint event',
    prompt: 'What does one call to `canvas.requestPaint()` do when nothing has changed?',
    options: [
      { label: 'Fires `paint` once at the next rendering opportunity', correct: true, why: 'It is the canvas analogue of `requestAnimationFrame()`.' },
      { label: 'Fires `paint` every frame until cancelled', why: 'It is one-shot; loops call it again.' },
      { label: 'Nothing, because nothing changed', why: 'It fires even if no descendants changed.' },
    ] },
  { id: 'rush-lens-box', roll: 'lens', source: 'Chrome docs, concepts.md (sizing the canvas grid)',
    prompt: 'Which ResizeObserver box reports the canvas size in exact device pixels?',
    options: [
      { label: '`device-pixel-content-box`', correct: true, why: 'Its `devicePixelContentBoxSize` is in device px.' },
      { label: '`content-box`', why: 'That one reports CSS px.' },
      { label: '`border-box`', why: 'Also CSS px, and includes the border.' },
    ] },
  { id: 'rush-lens-default-size', roll: 'lens', source: 'Chrome docs, concepts.md (units table)',
    prompt: 'In which units does `getElementImageDefaultSize()` report width and height?',
    options: [
      { label: 'Canvas grid pixels', correct: true, why: 'Like `canvas.width` and the 2D destination rect.' },
      { label: 'CSS pixels', why: 'Source rects and transforms are CSS px; the default size is grid px.' },
      { label: 'Device pixels', why: 'Only `devicePixelContentBoxSize` is device px.' },
    ] },
  { id: 'rush-projector-units', roll: 'projector', source: 'Chrome docs, concepts.md (units table)',
    prompt: 'In the 9-argument `drawElementImage`, what are the units of `sx, sy, sw, sh`?',
    options: [
      { label: 'CSS pixels', correct: true, why: 'Source rects are CSS px; destination rects are canvas grid px.' },
      { label: 'Canvas grid pixels', why: 'That is the destination rect.' },
      { label: 'Texture pixels', why: 'Texture px belong to the WebGL and WebGPU uploads.' },
    ] },
  { id: 'rush-projector-border', roll: 'projector', source: 'README.md, 4. drawElementImage',
    prompt: 'Where does `drawElementImage` start rendering an element?',
    options: [
      { label: 'At its border box, before CSS transformations', correct: true, why: 'The element’s own CSS `transform` is not what you draw.' },
      { label: 'At its content box, after CSS transformations', why: 'Border box, and before transforms.' },
      { label: 'Wherever it sits on the page', why: 'It is drawn where you tell the canvas to draw it.' },
    ] },
  { id: 'rush-mirrors-clip', roll: 'mirrors', source: 'README.md, 5. Synchronizing the DOM and drawing',
    prompt: 'You change only `canvasClip` for an element. Does that fire `paint` next update?',
    options: [
      { label: 'No: the clip is used for hit testing, not rendering', correct: true, why: 'Changes to the canvas element clip do not cause `paint`.' },
      { label: 'Yes, always', why: 'It is not used for rendering.' },
      { label: 'Only in WebGL', why: 'The rule is the same everywhere.' },
    ] },
  { id: 'rush-mirrors-auto', roll: 'mirrors', source: 'README.md, 5. Synchronizing the DOM and drawing',
    prompt: 'In a 2D context, what keeps an element’s DOM geometry in sync with where you drew it?',
    options: [
      { label: '`drawElementImage` runs `updateElementGeometry` for you', correct: true, why: 'Unless you pass `{ preserveElementGeometry: true }`.' },
      { label: 'Nothing: 2D never updates geometry', why: 'It does, automatically.' },
      { label: 'Setting `element.style.transform`', why: 'The demos call that the older approach: do not use it.' },
    ] },
];
