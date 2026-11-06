/**
 * Trial: predict the bell. Six scenarios about when `paint` fires and what
 * it carries. Every answer cites the explainer.
 */
import type { Beat } from '../shared/chapter';
import { mountChoiceQuiz, type QuizScenario } from '../shared/choice-quiz';

export const SCENARIOS: QuizScenario[] = [
  {
    prompt: 'Nothing on the page changes for ten seconds (no text field has focus), and nobody calls `requestPaint()`. What does the bell do?',
    options: [
      { label: 'Stays quiet', correct: true, why: 'No snapshot changed, so there is no reason to fire. Browsers may fire anyway, but should avoid it. Footnote: a focused text field’s blinking caret is part of the snapshot, so it may keep ringing.' },
      { label: 'Rings every frame, like requestAnimationFrame', why: 'That is what a `requestPaint()` loop does. On its own, `paint` is driven by changes.' },
      { label: 'Rings once per second as a heartbeat', why: 'There is no heartbeat in the spec. Quiet pages stay quiet.' },
    ],
  },
  {
    prompt: 'The user types a letter into an `<input>` inside a drawable `<form>`. What happens at the next rendering update?',
    options: [
      { label: '`paint` fires and `changedElements` includes the form', correct: true, why: 'The form’s snapshot would be drawn differently, so `paint` must fire and list it.' },
      { label: '`paint` fires with an empty `changedElements`', why: 'An empty list is what a bare `requestPaint()` gives you. Here a drawable really changed.' },
      { label: 'Nothing: inputs inside a canvas do not repaint', why: 'They do. The caret and the new letter are part of the snapshot.' },
    ],
  },
  {
    prompt: 'Inside your `paint` handler you set `label.style.color = "red"` on a drawable. When does red appear in the canvas?',
    code: "canvas.onpaint = () => {\n  label.style.color = 'red';\n  ctx.drawElementImage(label, 0, 0);\n};",
    options: [
      { label: 'In the next rendering update', correct: true, why: 'DOM changes in `paint` are locked out of the current update. This update draws the old snapshot; the change lands next time, firing another `paint`.' },
      { label: 'Immediately, in this update', why: 'Only canvas drawing commands land in this update. The DOM was already locked in before `paint` ran.' },
      { label: 'Never, DOM edits are ignored in paint', why: 'They are not ignored, only deferred to the next update.' },
    ],
  },
  {
    prompt: 'You call `canvas.requestPaint()` once, and nothing in the canvas changes. What do you get?',
    options: [
      { label: 'One `paint` at the next rendering opportunity', correct: true, why: 'That is exactly its job, analogous to `requestAnimationFrame()`.' },
      { label: 'A `paint` every frame until you cancel it', why: 'It is one-shot. Loops call it again inside the handler.' },
      { label: 'Nothing, since no drawable changed', why: '`requestPaint()` fires even when no descendants changed.' },
    ],
  },
  {
    prompt: 'A `<div>` outside every canvas changes colour. Does any canvas ring?',
    options: [
      { label: 'No: it is not a drawable descendant of a canvas', correct: true, why: '`paint` tracks the canvas’ own drawable descendants only.' },
      { label: 'Yes, every canvas on the page', why: 'Canvases do not repaint for unrelated DOM.' },
      { label: 'Yes, but only `content="drawable"` canvases', why: 'Even those only care about their own drawable descendants.' },
    ],
  },
  {
    prompt: 'A drawable canvas is nested inside another drawable canvas, and both have changes. Whose `paint` fires first?',
    options: [
      { label: 'The nested (inner) canvas', correct: true, why: '`paint` fires in reverse tree order, so descendants are ready before their ancestors draw them.' },
      { label: 'The outer canvas', why: 'Document order would do that, but `paint` deliberately runs in reverse.' },
      { label: 'Both at once, in parallel', why: 'Events on the main thread run one after another, in reverse tree order.' },
    ],
  },
];

export const trial: Beat = (host, ctx) =>
  mountChoiceQuiz(host, ctx, {
    scenarios: SCENARIOS,
    onPass: (mistakes) => {
      ctx.say(mistakes === 0 ? 'Not a single wrong chime. The Restless Bell falls silent.' : 'You know the bell’s rhythm now.');
      ctx.completeTrial({ mistakes, stamps: mistakes === 0 ? ['quiet-bells'] : [] });
    },
  });
