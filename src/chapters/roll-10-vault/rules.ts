/**
 * The rules of the vault, as pure functions over the explainer's own lists.
 * They drive the lab's model, both trial phases and the unit tests.
 *
 * README.md, "Read-back-allowed rendering" (R:295-313):
 *  - Snapshots and the paint event must not reveal security- or
 *    privacy-sensitive information that isn't otherwise observable.
 *  - Two channels: painting (pixel read-back or timing) and invalidation
 *    (onpaint). Both are closed by excluding sensitive information.
 *  - The sensitive list (R:300-307) and the "not sensitive" list (R:310-313).
 * Security & privacy questionnaire (S:4, S:15, S:29) repeats part of it.
 * README.md, Accessibility: focus and carets are rendered.
 *
 * Items marked `open` are discussion slots: the docs leave them unsettled,
 * so they are never scored.
 */
export type Verdict = 'never' | 'painted';
export type ItemStatus = Verdict | 'open';

export interface VaultItem {
  id: string;
  label: string;
  status: ItemStatus;
  /** Where the README says it (R: line), if it does. */
  readme?: string;
  /** Where the questionnaire says it (S: line), if it does. */
  questionnaire?: string;
  why: string;
}

export const VAULT_ITEMS: readonly VaultItem[] = [
  // Never painted (README R:300-307; questionnaire S:15 where listed)
  { id: 'xo-img', label: 'An `<iframe>` or `<img>` loaded from another origin', status: 'never', readme: 'R:300', questionnaire: 'S:15',
    why: 'Cross-origin data in embedded content is sensitive. The snapshot leaves it out.' },
  { id: 'xo-url', label: 'A `background-image: url()` from another origin', status: 'never', readme: 'R:300',
    why: 'Cross-origin `<url>` references such as `background-image` or `clip-path` are sensitive too.' },
  { id: 'xo-iframe-in-same', label: 'A cross-origin image inside a same-origin `<iframe>`', status: 'never', readme: 'R:300',
    why: 'Same-origin iframes still paint, but cross-origin content inside them does not.' },
  { id: 'visited', label: 'The purple of a visited link', status: 'never', readme: 'R:303', questionnaire: 'S:15',
    why: 'Visited-link information is sensitive: it would reveal browsing history.' },
  { id: 'spelling', label: 'A red spelling squiggle under a typo', status: 'never', readme: 'R:302', questionnaire: 'S:15',
    why: 'Spelling and grammar markers are never painted into snapshots.' },
  { id: 'autofill', label: 'An autofill preview the user has not accepted yet', status: 'never', readme: 'R:304', questionnaire: 'S:15',
    why: 'Pending autofill information not otherwise available to JavaScript is sensitive.' },
  { id: 'system-colors', label: 'A button styled with system colours (`ButtonFace`)', status: 'never', readme: 'R:301', questionnaire: 'S:4',
    why: 'System colours, themes and preferences are sensitive. The questionnaire adds: “without revealing OS theme colors”.' },
  { id: 'subpixel-aa', label: 'Subpixel text anti-aliasing', status: 'never', readme: 'R:305',
    why: 'Subpixel text anti-aliasing is on the README’s sensitive list, so snapshots leave it out.' },
  { id: 'captions', label: 'Video captions and video controls', status: 'never', readme: 'R:306',
    why: 'Captions and video controls are on the README’s sensitive list.' },
  { id: 'ime', label: 'An IME candidate pop-up while typing Japanese', status: 'never', readme: 'R:307',
    why: 'IME pop-ups and distinctive IME text formatting are sensitive.' },

  // Painted: new information the README calls not sensitive (R:310-313), or rendered per Accessibility
  { id: 'caret', label: 'A caret blinking at the user’s blink rate', status: 'painted', readme: 'R:312', questionnaire: 'S:4, S:29',
    why: 'Caret blink rate is not sensitive. The questionnaire names it as revealed on purpose, for interactivity.' },
  { id: 'focus-ring', label: 'The focus ring on a focused button', status: 'painted', readme: 'Accessibility',
    why: 'Accessibility indicators such as focus or carets are rendered by `drawElementImage`.' },
  { id: 'find', label: 'A find-in-page highlight', status: 'painted', readme: 'R:310', questionnaire: 'S:4',
    why: 'Search text (find-in-page) is not considered sensitive.' },
  { id: 'scrollbar', label: 'The look of a scrollbar', status: 'painted', readme: 'R:311', questionnaire: 'S:4',
    why: 'Scrollbar appearance is already detectable through `foreignObject` in Blink and WebKit.' },
  { id: 'form-control', label: 'How a `<select>` or checkbox is drawn', status: 'painted', readme: 'R:311', questionnaire: 'S:4',
    why: 'Form element appearance is already detectable, so it is not sensitive.' },
  { id: 'same-origin-iframe', label: 'A same-origin `<iframe>` showing same-origin content', status: 'painted', readme: 'R:300',
    why: 'Same-origin iframes still paint.' },

  // Painted, but named by only one of the two documents
  { id: 'text-fragment', label: 'A text-fragment (`#:~:text=`) marker', status: 'painted', readme: 'R:310',
    why: 'Only the README names it (not sensitive). The questionnaire is silent.' },
  { id: 'text-selection', label: 'A text selection', status: 'painted', questionnaire: 'S:4',
    why: 'Only the questionnaire names it, as revealed for interactivity. The README list is silent.' },

  // Open: never scored
  { id: 'forced-colors', label: '`forced-colors` mode, given that system colours are sensitive', status: 'open', readme: 'R:301, R:313',
    why: 'The README calls `forced-colors` not sensitive because script can read it with the media query and system colours, yet lists system colours as sensitive. Where one ends and the other begins is not settled.' },
  { id: 'replacement', label: 'What appears in place of an excluded cross-origin image', status: 'open',
    why: 'The docs say what is left out, never what is painted instead.' },
];

export const itemById = (id: string): VaultItem | undefined => VAULT_ITEMS.find((item) => item.id === id);
export const scoredItems = (): VaultItem[] => VAULT_ITEMS.filter((item) => item.status !== 'open');
export const openItems = (): VaultItem[] => VAULT_ITEMS.filter((item) => item.status === 'open');

/** Items that only one of the two documents names: the lists differ here. */
export function listDifferences(): VaultItem[] {
  return VAULT_ITEMS.filter((item) => item.status !== 'open' && (!item.readme || !item.questionnaire));
}

// ---------------------------------------------------------------- phase 1: sort

/** The twelve-plus items sorted in the trial: unambiguous, named by the README. */
export const SORT_IDS: readonly string[] = [
  'xo-img', 'visited', 'spelling', 'autofill', 'system-colors', 'captions', 'ime', 'xo-iframe-in-same',
  'caret', 'focus-ring', 'find', 'scrollbar', 'form-control', 'same-origin-iframe',
];
/** Discussion slots shown beside the sort, never scored. */
export const DISCUSS_IDS: readonly string[] = ['forced-colors', 'replacement'];

export interface SortScore {
  right: string[];
  wrong: string[];
  missing: string[];
  /** Open items the learner placed: ignored, listed so the UI can say so. */
  ignored: string[];
  solved: boolean;
}

export function scoreSort(answers: Readonly<Record<string, Verdict | undefined>>, ids: readonly string[] = SORT_IDS): SortScore {
  const score: SortScore = { right: [], wrong: [], missing: [], ignored: [], solved: false };
  for (const id of ids) {
    const item = itemById(id);
    if (!item) continue;
    const answer = answers[id];
    if (item.status === 'open') {
      if (answer) score.ignored.push(id);
    } else if (!answer) score.missing.push(id);
    else (answer === item.status ? score.right : score.wrong).push(id);
  }
  score.solved = score.wrong.length === 0 && score.missing.length === 0 && score.right.length > 0;
  return score;
}

// ---------------------------------------------------------------- phase 2: the heist

/** How a spy script tries to learn something (README R:297). */
export type Method = 'readback' | 'timing' | 'onpaint';
export type Channel = 'painting' | 'invalidation';

export function channelOf(method: Method): Channel {
  return method === 'onpaint' ? 'invalidation' : 'painting';
}

export type HeistOutcome = 'blocked' | 'learns';

/** A sensitive target is excluded from painting and invalidating, on every channel. */
export function heistOutcome(targetId: string): HeistOutcome | null {
  const item = itemById(targetId);
  if (!item || item.status === 'open') return null;
  return item.status === 'never' ? 'blocked' : 'learns';
}

export interface Heist {
  id: string;
  /** What the spy script does, in a sentence. */
  plan: string;
  target: string;
  method: Method;
}

export const HEISTS: readonly Heist[] = [
  { id: 'h-history', plan: 'Draws a list of links, then reads the canvas with `getImageData()` looking for purple text.', target: 'visited', method: 'readback' },
  { id: 'h-squiggle', plan: 'Counts `paint` events after typing a typo into a drawable `<textarea>`, hoping a squiggle triggers one more.', target: 'spelling', method: 'onpaint' },
  { id: 'h-blink', plan: 'Records how often the caret appears in read-back pixels to learn the blink rate.', target: 'caret', method: 'readback' },
  { id: 'h-xo', plan: 'Times how long `drawElementImage()` takes on a card with a cross-origin image, to guess its contents.', target: 'xo-img', method: 'timing' },
  { id: 'h-focus', plan: 'Watches `changedElements` to see which drawable button gets the focus ring.', target: 'focus-ring', method: 'onpaint' },
  { id: 'h-autofill', plan: 'Reads pixels of a login field while the browser previews a saved email address.', target: 'autofill', method: 'readback' },
];

export interface HeistAnswer {
  outcome?: HeistOutcome;
  channel?: Channel;
}

export function judgeHeist(heist: Heist, answer: HeistAnswer): { outcome: boolean; channel: boolean; correct: boolean } {
  const outcome = answer.outcome === heistOutcome(heist.target);
  const channel = answer.channel === channelOf(heist.method);
  return { outcome, channel, correct: outcome && channel };
}

// ---------------------------------------------------------------- the lab model

/** What a spy reads back from the snapshot of one specimen. */
export function spyReads(id: string, redaction: boolean): 'redacted' | 'readable' {
  const item = itemById(id);
  if (!item) return 'redacted';
  if (item.status === 'painted') return 'readable';
  return redaction ? 'redacted' : 'readable';
}

/**
 * The leak meter: the share of sensitive specimens a spy can read. In any
 * real implementation redaction is always on, so the answer is 0. The
 * switch exists only to show why the rule is needed.
 */
export function leakLevel(ids: readonly string[], redaction: boolean): { leaked: number; sensitive: number; allowed: number } {
  let leaked = 0;
  let sensitive = 0;
  let allowed = 0;
  for (const id of ids) {
    const item = itemById(id);
    if (!item || item.status === 'open') continue;
    if (item.status === 'never') {
      sensitive += 1;
      if (spyReads(id, redaction) === 'readable') leaked += 1;
    } else allowed += 1;
  }
  return { leaked, sensitive, allowed };
}
