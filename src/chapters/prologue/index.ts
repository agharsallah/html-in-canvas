/**
 * Prologue: The blank canvas. Process: digital proof.
 * Signature visual: The Smudge, a slowly crawling mosaic of oversized pixels.
 */
import type { ChapterModule } from '../shared/chapter';
import { smudgeBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './prologue.css';

const chapter: ChapterModule = {
  backdrop: smudgeBackdrop,
  diorama,
  story,
  labBrief: 'Two signs with the same words. One is paint, one is HTML drawn into a canvas. Try all three things on the list.',
  lab,
  practiceBrief: 'Write the check every HTML-in-Canvas page starts with. If you get stuck, the hint and the notebook are one click away.',
  exercises,
  trialBrief: 'Tick every problem HTML-in-Canvas sets out to solve. Leave the traps unticked.',
  trial,
};

export default chapter;
