/**
 * Pure scoring for the clockwork trial.
 *
 * Phase 1: put the rendering-update steps in order (Option C, the selected design).
 * Phase 2: predict where each scenario's effect lands. Every correct answer is
 *          computed by `simulate()` (rules.ts), never typed by hand.
 * Phase 3: name the selected option and the reason the explainer gives.
 */
import { OPTION_C_ORDER, relativeLanding, simulate, type InjectId, type OptionId, type Relative, type StepId } from './rules';

export interface OrderScore {
  solved: boolean;
  /** Per position: is the right step there? */
  placed: boolean[];
  correctCount: number;
}

export function scoreOrder(order: readonly StepId[]): OrderScore {
  const placed = OPTION_C_ORDER.map((id, i) => order[i] === id);
  const correctCount = placed.filter(Boolean).length;
  return { solved: correctCount === OPTION_C_ORDER.length && order.length === OPTION_C_ORDER.length, placed, correctCount };
}

/** A deterministic shuffle that never starts solved (for the starting hand). */
export function shuffledSteps(seed: number): StepId[] {
  const out = [...OPTION_C_ORDER];
  let x = (seed >>> 0) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    x = (x * 1664525 + 1013904223) >>> 0;
    const j = x % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  if (scoreOrder(out).solved) out.reverse();
  return out;
}

/** Move the item at `index` by `delta` places; returns a new array. */
export function moveStep(order: readonly StepId[], index: number, delta: -1 | 1): StepId[] {
  const out = [...order];
  const target = index + delta;
  if (index < 0 || index >= out.length || target < 0 || target >= out.length) return out;
  [out[index], out[target]] = [out[target]!, out[index]!];
  return out;
}

export type PredictAnswer = Relative | 'two-runs' | 'one-run' | 'inner' | 'outer' | 'child-frame' | 'parent-doc';

export interface Prediction {
  id: string;
  prompt: string;
  code?: string;
  options: Array<{ value: PredictAnswer; label: string; why: string }>;
  /** The right answer, derived from the model or from the README rule it encodes. */
  answer: PredictAnswer;
}

const landing = (option: OptionId, id: InjectId, aMode?: 'sync-paint' | 'placeholders'): Relative =>
  relativeLanding(simulate({ option, aMode, inject: [id] }).landings[id]);

const handlerRuns = (option: OptionId, id: InjectId): PredictAnswer =>
  (simulate({ option, inject: [id] }).frames[0]!.handlerRuns >= 2 ? 'two-runs' : 'one-run');

const THIS_NEXT = (thisWhy: string, nextWhy: string) => [
  { value: 'this' as const, label: 'This frame', why: thisWhy },
  { value: 'next' as const, label: 'The next frame', why: nextWhy },
];

export function predictions(): Prediction[] {
  return [
    {
      id: 'raf-edit',
      prompt: 'Option C. A `requestAnimationFrame` callback changes a drawable’s text. Which frame shows the new text?',
      options: THIS_NEXT(
        'rAF callbacks (step 14) run before style, layout and Paint, so the snapshot picks up the edit.',
        'rAF runs at the very start of the update, long before Paint locks anything in.'),
      answer: landing('C', 'raf-edit'),
    },
    {
      id: 'resize',
      prompt: 'Option C. The canvas is resized. Its ResizeObserver resizes the grid and calls `requestPaint()`. When does `paint` see the new size?',
      options: THIS_NEXT(
        'In the explainer’s list, resize observers (16.2.6) come before Paint, so this update’s `paint` already sees the new grid.',
        'Resize observers come before Paint in the same update, so there is no need to wait.'),
      answer: landing('C', 'resize'),
    },
    {
      id: 'draw',
      prompt: 'Option C. Inside `paint`, you call `ctx.drawElementImage(card, 0, 0)`. Which frame shows the drawing?',
      code: "canvas.onpaint = () => {\n  ctx.reset();\n  ctx.drawElementImage(card, 0, 0);\n};",
      options: THIS_NEXT(
        'Canvas drawing commands made in `paint` appear in the current rendering update: the one carve-out.',
        'The drawn content of the canvas is the intentional carve-out: it joins this update.'),
      answer: landing('C', 'draw-in-paint'),
    },
    {
      id: 'dom-edit',
      prompt: 'Option C. Inside `paint`, you set `card.style.background = "gold"`. Which frame shows gold?',
      code: "canvas.onpaint = () => {\n  card.style.background = 'gold';\n  ctx.drawElementImage(card, 0, 0);\n};",
      options: THIS_NEXT(
        'By the time `paint` runs, the update is locked in. DOM invalidations apply to the subsequent update.',
        'DOM changes in `paint` do not show until the subsequent rendering update.'),
      answer: landing('C', 'dom-edit-in-paint'),
    },
    {
      id: 'request',
      prompt: 'Option C. Inside `paint`, you call `canvas.requestPaint()`. When does the next `paint` fire?',
      options: THIS_NEXT(
        'Option C runs `paint` once per rendering update. The request is for the next rendering opportunity.',
        '`requestPaint()` fires `paint` once during the next rendering opportunity.'),
      answer: landing('C', 'request-in-paint'),
    },
    {
      id: 'option-b-loop',
      prompt: 'Imagine Option B instead. Inside `paint`, the handler edits the DOM once. How often does the handler run in that update?',
      options: [
        { value: 'one-run', label: 'Once', why: 'That is Option C. B loops back to 16.2.1 after a modification, so canvas code runs again.' },
        { value: 'two-runs', label: 'More than once', why: 'B loops back to 16.2.1 when `paint` modifies the DOM, so the canvas code may run multiple times per update.' },
      ],
      answer: handlerRuns('B', 'dom-edit-in-paint'),
    },
    {
      id: 'option-a-flush',
      prompt: 'Imagine Option A with placeholders. Inside `paint`, WebGL code calls `gl.getError()`. What happens?',
      options: [
        { value: 'this', label: 'It returns normally this frame', why: '`getError()` needs a flush, but the placeholders are only filled at the next Paint.' },
        { value: 'jam', label: 'Deadlock or inconsistent rendering', why: 'Many WebGL APIs require flushing; with placeholders, calling them results in a deadlock or inconsistent rendering.' },
      ],
      answer: landing('A', 'gl-flush', 'placeholders'),
    },
    {
      id: 'nested',
      prompt: 'A drawable canvas sits inside another drawable canvas, and both changed. Which `paint` fires first?',
      options: [
        { value: 'inner', label: 'The inner (nested) canvas', why: 'Reverse tree order: descendants paint before ancestors, so the parent draws fresh pixels.' },
        { value: 'outer', label: 'The outer canvas', why: 'That is document order. `paint` deliberately fires in reverse tree order.' },
      ],
      answer: 'inner',
    },
    {
      id: 'frames',
      prompt: 'A page and an iframe inside it both have canvases that need a `paint`. Which document goes first?',
      options: [
        { value: 'child-frame', label: 'The child frame', why: '`paint` fires in reverse document order: child frames before their parent documents.' },
        { value: 'parent-doc', label: 'The parent document', why: 'Reverse document order puts child frames first.' },
      ],
      answer: 'child-frame',
    },
  ];
}

export function isCorrect(prediction: Prediction, value: PredictAnswer): boolean {
  return prediction.answer === value;
}

export type OptionReason = 'C-locked' | 'A-earliest' | 'B-no-partial' | 'C-loops';

export const SELECTED: { option: OptionId; reason: OptionReason } = { option: 'C', reason: 'C-locked' };
