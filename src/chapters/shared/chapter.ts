/**
 * The contract every chapter implements.
 *
 * A chapter = a story script (dialogue + concept cards) + a Lab (free play)
 * + Practice (hand-written code) + a Trial (a challenge with a win
 * condition). The chapter shell owns navigation, rewards and theming;
 * chapters only own their content.
 */
import type { Capabilities } from '../../core/capabilities';
import type { FrameId, GameState } from '../../game/state';
import type { Roll } from '../../story/rolls';
import type { Exercise } from './exercise';

export type Speaker = 'caret' | 'narrator' | 'foe';
export type ConceptKind = 'attribute' | 'event' | 'method' | 'property' | 'idea' | 'rule';

export interface ConceptCard {
  /** Stable id, used by exercises to point back here ("Seen in"). */
  id: string;
  title: string;
  kind: ConceptKind;
  /** One sentence: what this is. The first thing a learner reads. */
  what: string;
  /** Extra detail, one paragraph each. `backticks` become inline code. */
  body?: string[];
  code?: string;
  /** An optional diagram that shows the idea (built on demand). */
  figure?: () => HTMLElement;
  /** Where in the source material this comes from. */
  source?: string;
}

export interface StoryLine {
  speaker: Speaker;
  text: string;
  /** Optional concept card pinned to the notebook alongside this line. */
  concept?: ConceptCard;
}

export interface TrialResult {
  /** Mistakes made on the way; 0 earns the "Clean exposure" stamp. */
  mistakes: number;
  /** Extra stamps the chapter decided to award. */
  stamps?: string[];
}

export interface BeatContext {
  caps: Capabilities;
  roll: Roll;
  /** Let Caret comment on what the learner just did. */
  say(text: string, speaker?: Speaker): void;
  /** Award a stamp right away (e.g. for discovering something in a lab). */
  stamp(id: string): void;
  /** Award a (usually secret) negative found by exploring. */
  collect(id: string): void;
  /** Mark the lab as explored. Safe to call more than once. */
  completeLab(): void;
  /** Report the trial as passed. */
  completeTrial(result: TrialResult): void;
  /** Open the notebook drawer, optionally at a concept. */
  openConcept(id?: string): void;
  /** Read-only snapshot of the learner's saved progress (negatives, frames, stamps). */
  progress?(): GameState;
}

/** A mountable piece of UI. Returns a cleanup function. */
export type Beat = (host: HTMLElement, ctx: BeatContext) => () => void;

/** A 3D scene shown beside the story, reacting to each line. */
export interface Diorama {
  onLine?(index: number, total: number): void;
  destroy(): void;
}

export interface ChapterModule {
  /** Optional decorative layer behind the content: the chapter's signature visual. */
  backdrop?: (host: HTMLElement) => () => void;
  /** The chapter's 3D story scene. */
  diorama?: (host: HTMLElement, roll: Roll) => Diorama;
  story: StoryLine[];
  /** Short instruction shown above the lab. */
  labBrief: string;
  lab: Beat;
  /** Short instruction shown above the practice exercises. */
  practiceBrief: string;
  exercises: Exercise[];
  /** Short instruction shown above the trial. */
  trialBrief: string;
  trial: Beat;
}

export const FRAME_LABELS: Record<FrameId, string> = {
  story: 'Story',
  lab: 'Lab',
  practice: 'Practice',
  trial: 'Trial',
};

export const KIND_LABELS: Record<ConceptKind, string> = {
  attribute: 'Attribute',
  event: 'Event',
  method: 'Method',
  property: 'Property',
  idea: 'Idea',
  rule: 'Rule',
};

/** Every concept card a chapter's story introduces, in order. */
export function conceptsOf(module: Pick<ChapterModule, 'story'>): ConceptCard[] {
  return module.story.flatMap((line) => (line.concept ? [line.concept] : []));
}
