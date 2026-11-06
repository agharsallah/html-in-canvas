/**
 * Roll 05: The mirror maze. Process: tintype.
 * Signature visual: a dark lacquered plate, warm highlights, a passing glint.
 */
import type { ChapterModule } from '../shared/chapter';
import { mirrorBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './mirrors.css';

const chapter: ChapterModule = {
  backdrop: mirrorBackdrop,
  diorama,
  story,
  labBrief: 'Click the drawn button, then make its ghost drift: opt out of automatic geometry, move it, clip it, clear it, and sync it by hand. Every click lands on the chart.',
  lab,
  practiceBrief: 'Three geometry fixes by hand: sync a card yourself in CSS px, keep a backdrop behind in the hit-test stack, and sync a 3D card with a fallback for older builds.',
  exercises,
  trialBrief: 'Five mirrors, five bugs. Fix each paint handler, then click every target: each click must land on the element you see.',
  trial,
};

export default chapter;
