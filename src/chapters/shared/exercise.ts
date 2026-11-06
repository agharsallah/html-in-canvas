/**
 * Hand-written code exercises.
 *
 * Code is normalised before checking (comments removed, quotes unified,
 * whitespace collapsed), so learners are judged on what they wrote, not on
 * formatting. Each check is a requirement a learner can read up front; the
 * checks say *what* the code must do, never the exact syntax.
 */
import type { Language } from '../../ui/editor/highlight';

export interface CodeCheck {
  /** Plain-language requirement, shown before and after checking. */
  label: string;
  /** Runs against the normalised code. */
  test: RegExp | ((code: string) => boolean);
}

export interface Exercise {
  id: string;
  title: string;
  /** What to write, in one or two sentences. `backticks` become code. */
  task: string;
  language: Language;
  starter: string;
  solution: string;
  checks: CodeCheck[];
  /** Progressive hints, gentlest first. */
  hints: string[];
  /** Id of the concept card where the learner saw this pattern. */
  seenIn: string;
}

export interface CheckResult {
  label: string;
  passed: boolean;
}

export interface Evaluation {
  results: CheckResult[];
  passed: boolean;
}

export function normalizeCode(code: string, language: Language): string {
  let out = code;
  if (language === 'html') out = out.replace(/<!--[\s\S]*?-->/g, ' ');
  out = out
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[\s;{}])\/\/[^\n]*/g, '$1 ')
    .replace(/['`]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return out;
}

export function evaluate(exercise: Exercise, code: string): Evaluation {
  const normalized = normalizeCode(code, exercise.language);
  const results = exercise.checks.map((check) => ({
    label: check.label,
    passed: typeof check.test === 'function' ? check.test(normalized) : check.test.test(normalized),
  }));
  return { results, passed: results.every((r) => r.passed) };
}

/** Index of the first match of `pattern` in normalised code, or -1. */
export function indexOfPattern(code: string, pattern: RegExp): number {
  const match = pattern.exec(code);
  return match ? match.index : -1;
}

/** True when `first` appears, `second` appears, and `first` comes before `second`. */
export function inOrder(code: string, first: RegExp, second: RegExp): boolean {
  const a = indexOfPattern(code, first);
  const b = indexOfPattern(code, second);
  return a >= 0 && b >= 0 && a < b;
}
