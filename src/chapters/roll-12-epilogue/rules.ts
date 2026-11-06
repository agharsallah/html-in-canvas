/**
 * The endless reel's rules, as pure functions: the boss rush, the escape
 * hatch decisions, and feature detection. Tests live in
 * tests/epilogue-rules.test.ts.
 *
 * Fallbacks: Chrome docs, concepts.md "Fallback strategies" (CC:424-443).
 * Detection: the same page's `supportsHtmlInCanvas()`; the demos also probe
 * the method they will call (Examples/webGL.html checks
 * `canvas.updateElementGeometry !== undefined`).
 */
import type { RollId } from '../../story/rolls';

// ---------------------------------------------------------------- boss rush

export interface RushOption {
  label: string;
  correct?: boolean;
  why: string;
}

export interface RushQuestion {
  id: string;
  roll: RollId;
  prompt: string;
  options: RushOption[];
  source: string;
}

export const LIVES = 3;

export type RushStatus = 'playing' | 'won' | 'lost';

export interface Rush {
  order: readonly string[];
  index: number;
  lives: number;
  mistakes: number;
  status: RushStatus;
}

/** One question per roll, in journey order, chosen at random among that roll's questions. */
export function pickRush(bank: readonly RushQuestion[], rolls: readonly RollId[], random: () => number = Math.random): string[] {
  return rolls.flatMap((roll) => {
    const pool = bank.filter((q) => q.roll === roll);
    if (!pool.length) return [];
    return [pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!.id];
  });
}

export function startRush(order: readonly string[]): Rush {
  return { order, index: 0, lives: LIVES, mistakes: 0, status: order.length ? 'playing' : 'won' };
}

/** A right answer moves on; a wrong one costs a life and stays on the question. */
export function answerRush(rush: Rush, correct: boolean): Rush {
  if (rush.status !== 'playing') return rush;
  if (correct) {
    const index = rush.index + 1;
    return { ...rush, index, status: index >= rush.order.length ? 'won' : 'playing' };
  }
  const lives = rush.lives - 1;
  return { ...rush, lives, mistakes: rush.mistakes + 1, status: lives <= 0 ? 'lost' : 'playing' };
}

export function isCorrect(question: RushQuestion, optionIndex: number): boolean {
  return question.options[optionIndex]?.correct === true;
}

// ---------------------------------------------------------------- escape hatch

export type HatchOption = 'native' | 'alt-ui' | 'overlay' | 'three-html-render' | 'html2canvas' | 'dom-to-image' | 'css3d';

export const HATCH_LABELS: Record<HatchOption, string> = {
  native: 'Use HTML-in-Canvas itself',
  'alt-ui': 'An alternative UI',
  overlay: 'Floating HTML overlays',
  'three-html-render': 'The three-html-render library',
  html2canvas: 'html2canvas',
  'dom-to-image': 'dom-to-image',
  css3d: 'CSS 3D transforms (this site’s own fallback)',
};

export interface HatchScenario {
  id: string;
  situation: string;
  accept: readonly HatchOption[];
  why: string;
}

export const HATCH_SCENARIOS: readonly HatchScenario[] = [
  { id: 'supported', situation: '`supportsHtmlInCanvas()` returns true and you draw a form into a 2D canvas.', accept: ['native'],
    why: 'Detection passed, so no escape hatch is needed: draw it for real.' },
  { id: 'export', situation: 'No support. You only need to save a styled HTML certificate as a PNG.', accept: ['html2canvas', 'dom-to-image'],
    why: 'A static image is the whole goal, so a DOM-to-image library from the Chrome docs’ list fits.' },
  { id: 'overlay', situation: 'No support. A login form must stay typeable and readable by screen readers on top of a WebGL map.', accept: ['overlay'],
    why: 'Floating real HTML over the canvas keeps the form live and accessible; a picture of it would not be.' },
  { id: 'three', situation: 'No support. A three.js scene needs an HTML panel on a surface in the 3D world.', accept: ['three-html-render', 'css3d'],
    why: 'Stay in the three.js world: a three.js HTML library, or real DOM placed with CSS 3D transforms as this site does.' },
  { id: 'decorative', situation: 'No support. The canvas only adds a decorative effect; the same content works as plain HTML.', accept: ['alt-ui'],
    why: 'When the canvas adds nothing essential, an alternative UI is the simplest, most robust fallback.' },
];

export function judgeHatch(scenarioId: string, pick: HatchOption): boolean {
  return HATCH_SCENARIOS.find((s) => s.id === scenarioId)?.accept.includes(pick) ?? false;
}

export const HATCH_OPTIONS = Object.keys(HATCH_LABELS) as HatchOption[];

/** The escape-hatch round of the boss rush, as ordinary questions. */
export function hatchQuestions(): RushQuestion[] {
  return HATCH_SCENARIOS.map((scenario) => ({
    id: `hatch-${scenario.id}`,
    roll: 'epilogue',
    prompt: scenario.situation,
    source: 'Chrome docs, concepts.md (Fallback strategies)',
    options: HATCH_OPTIONS.map((option) => ({
      label: HATCH_LABELS[option],
      correct: judgeHatch(scenario.id, option) || undefined,
      why: judgeHatch(scenario.id, option) ? scenario.why : `Not the best fit for this situation. ${scenario.why}`,
    })),
  }));
}

// ---------------------------------------------------------------- detection

/** The Chrome docs’ detection function, with the document injected for tests. */
export function supportsHtmlInCanvas(doc: { createElement(tag: 'canvas'): HTMLCanvasElement } | undefined): boolean {
  if (typeof doc === 'undefined') return false;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('content', 'drawable');
  return (canvas as HTMLCanvasElement & { content?: string }).content === 'drawable';
}

export type RenderContext = '2d' | 'webgl' | 'webgpu' | 'worker';

export interface SupportReport {
  content: boolean;
  '2d': boolean;
  webgl: boolean;
  webgpu: boolean;
  worker: boolean;
  geometry: boolean;
}

interface Proto { prototype: object }
export interface DetectEnv {
  document?: { createElement(tag: 'canvas'): HTMLCanvasElement };
  HTMLCanvasElement?: Proto;
  CanvasRenderingContext2D?: Proto;
  WebGL2RenderingContext?: Proto;
  WebGLRenderingContext?: Proto;
  GPUQueue?: Proto;
}

const has = (ctor: Proto | undefined, key: string) => !!ctor && key in ctor.prototype;

/** Probe the attribute, then the exact method each context will call. */
export function detectSupport(env: DetectEnv): SupportReport {
  return {
    content: supportsHtmlInCanvas(env.document),
    '2d': has(env.CanvasRenderingContext2D, 'drawElementImage'),
    webgl: has(env.WebGL2RenderingContext, 'texElementSubImage2D') || has(env.WebGLRenderingContext, 'texElementSubImage2D'),
    webgpu: has(env.GPUQueue, 'drawElementImageToTexture'),
    worker: has(env.HTMLCanvasElement, 'captureElementImage'),
    geometry: has(env.HTMLCanvasElement, 'updateElementGeometry'),
  };
}

/** Use the API for a context only when the attribute and that context’s method both exist. */
export function pathFor(report: SupportReport, context: RenderContext): 'native' | 'escape-hatch' {
  return report.content && report[context] ? 'native' : 'escape-hatch';
}
