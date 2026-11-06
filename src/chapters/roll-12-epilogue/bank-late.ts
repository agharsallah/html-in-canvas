/**
 * Boss rush question bank, part 2: the observatory to the endless reel.
 */
import type { RushQuestion } from './rules';

export const BANK_LATE: readonly RushQuestion[] = [
  { id: 'rush-observatory-geometry', roll: 'observatory', source: 'README.md, 5. Synchronizing the DOM and drawing',
    prompt: 'Why must WebGL and WebGPU code call `updateElementGeometry` itself?',
    options: [
      { label: 'The canvas API cannot know how a texture maps back to the canvas’ CSS coordinates', correct: true, why: 'Only 2D drawing knows where the element landed.' },
      { label: 'Because 3D contexts are slower', why: 'It is about knowledge, not speed.' },
      { label: 'They do not need to', why: '3D contexts must call it.' },
    ] },
  { id: 'rush-observatory-alloc', roll: 'observatory', source: 'Chrome docs, webgl.md',
    prompt: 'Why allocate the texture before calling `texElementSubImage2D`?',
    options: [
      { label: 'So uploads are fast sub-image updates, without GPU memory re-allocations', correct: true, why: 'Allocate once, or whenever the element changes size.' },
      { label: 'The element would be cross-origin otherwise', why: 'Allocation has nothing to do with origins.' },
      { label: 'To make the texture read-only', why: 'It is about avoiding re-allocation.' },
    ] },
  { id: 'rush-foundry-name', roll: 'foundry', source: 'README.md, IDL changes; Chrome docs, webgpu.md',
    prompt: 'Which call copies an element into a WebGPU texture?',
    options: [
      { label: '`device.queue.drawElementImageToTexture(source, destination)`', correct: true, why: 'It lives on the GPU queue.' },
      { label: '`gl.texElementSubImage2D(...)`', why: 'That is WebGL.' },
      { label: '`ctx.drawElementImage(...)`', why: 'That is 2D.' },
    ] },
  { id: 'rush-foundry-why', roll: 'foundry', source: 'README.md, Use cases',
    prompt: 'Why run shaders over HTML at all?',
    options: [
      { label: 'CSS offers a limited set of effects, and people want general shaders', correct: true, why: 'Composing HTML elements with effects is a named use case.' },
      { label: 'Shaders make text accessible', why: 'Accessibility comes from the DOM, not the shader.' },
      { label: 'Browsers cannot render HTML without them', why: 'They can; this is about effects.' },
    ] },
  { id: 'rush-railway-paint', roll: 'railway', source: 'README.md, IDL changes (CanvasPaintEvent)',
    prompt: 'Can a worker listen for the `paint` event?',
    options: [
      { label: 'No: it is exposed on Window, so the main thread captures and posts snapshots', correct: true, why: '`CanvasPaintEvent` is `[Exposed=Window]`.' },
      { label: 'Yes, on its OffscreenCanvas', why: 'The event is not exposed in workers.' },
      { label: 'Only with requestPaint()', why: 'Still not exposed in workers.' },
    ] },
  { id: 'rush-railway-send', roll: 'railway', source: 'README.md, 4. drawElementImage',
    prompt: 'What do you transfer to a worker so it can draw an element?',
    options: [
      { label: 'An `ElementImage` from `captureElementImage()`', correct: true, why: 'These can be transferred and drawn to an OffscreenCanvas.' },
      { label: 'The element itself', why: 'Workers cannot touch the DOM.' },
      { label: 'Its `outerHTML`', why: 'A worker cannot lay out HTML.' },
    ] },
  { id: 'rush-lighthouse-nogeo', roll: 'lighthouse', source: 'README.md, Accessibility',
    prompt: 'A drawable was never drawn and never given geometry. How is it exposed to accessibility?',
    options: [
      { label: 'In the accessibility tree, without geometry information', correct: true, why: 'Semantics stay; assistive tech can filter content without geometry.' },
      { label: 'Not at all', why: 'It is still in the tree, like regular DOM.' },
      { label: 'At the canvas’ top-left corner', why: 'It is reported without geometry, not at a made-up position.' },
    ] },
  { id: 'rush-lighthouse-stale', roll: 'lighthouse', source: 'README.md, Accessibility',
    prompt: 'A view inside the canvas is no longer drawn. What should you do with it?',
    options: [
      { label: 'Remove it from the DOM, or hide it with primitives like `aria-hidden="true"`', correct: true, why: 'Unused canvas descendants should not linger in the accessibility tree.' },
      { label: 'Nothing: undrawn content is invisible to everyone', why: 'It is still exposed to assistive technology.' },
      { label: 'Draw it at zero size', why: 'Hide or remove it instead.' },
    ] },
  { id: 'rush-vault-visited', roll: 'vault', source: 'README.md, Read-back-allowed rendering',
    prompt: 'A script reads back the pixels of a drawn visited link. What does it learn?',
    options: [
      { label: 'Nothing about history: visited styling is never painted', correct: true, why: 'Visited link information is sensitive.' },
      { label: 'Which links were visited', why: 'That would be a leak, which the rule forbids.' },
      { label: 'It throws: the canvas is tainted', why: 'There is no tainting; read-back is allowed because secrets are left out.' },
    ] },
  { id: 'rush-vault-caret', roll: 'vault', source: 'README.md, Read-back-allowed rendering; questionnaire Q1',
    prompt: 'Is the caret’s blink rate painted into snapshots?',
    options: [
      { label: 'Yes: it is not considered sensitive', correct: true, why: 'It is revealed on purpose, for interactivity.' },
      { label: 'No: it reveals OS settings', why: 'The docs call it not sensitive.' },
      { label: 'Only in private browsing', why: 'Private mode behaves the same.' },
    ] },
  { id: 'rush-clockwork-option', roll: 'clockwork', source: 'README.md, Alternatives considered: paint event timing',
    prompt: 'Which `paint` timing design was selected?',
    options: [
      { label: 'Option C: fire `paint` once, right after Paint', correct: true, why: 'The rendering update is locked in, except the canvas’ drawn content.' },
      { label: 'Option A: at resize observer timing, looping', why: 'Rejected: loops, and placeholders deadlock WebGL.' },
      { label: 'Option B: after Paint, looping back', why: 'Rejected: the same looping downsides.' },
    ] },
  { id: 'rush-clockwork-deadlock', roll: 'clockwork', source: 'README.md, Option A',
    prompt: 'Why would recording placeholders (Option A) fail for WebGL?',
    options: [
      { label: 'Many WebGL APIs like `getError()` must flush, causing deadlock or inconsistent rendering', correct: true, why: 'So `paint` runs when the painted display list already exists.' },
      { label: 'WebGL cannot draw text', why: 'The issue is flushing, not text.' },
      { label: 'Placeholders leak visited links', why: 'This is about timing, not privacy.' },
    ] },
  { id: 'rush-epilogue-replay', roll: 'epilogue', source: 'README.md, Future considerations',
    prompt: 'In the auto-updating canvas being considered, what happens on a threaded scroll?',
    options: [
      { label: 'The canvas replays its retained commands with updated placeholders, without blocking on script', correct: true, why: 'That keeps effects in sync with native scrolling, off the main thread.' },
      { label: 'A `paint` event fires on a worker', why: 'That was the rejected worker design.' },
      { label: 'Nothing: canvases cannot follow scrolling', why: 'That is the gap the future mode aims to close.' },
    ] },
  { id: 'rush-epilogue-worker', roll: 'epilogue', source: 'README.md, Alternatives considered: worker threads',
    prompt: 'Why was sending snapshots to a worker for threaded effects not chosen?',
    options: [
      { label: 'It needs script to run synchronously on scroll and animation updates', correct: true, why: 'Hard for architectures that scroll on a thread in a restricted process.' },
      { label: 'Workers cannot draw to an OffscreenCanvas', why: 'They can; the problem is synchronous script on scroll.' },
      { label: 'It leaked cross-origin data', why: 'The reason given is architectural, not privacy.' },
    ] },
];
