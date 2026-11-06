/**
 * Roll 02: The bell tower. Process: sepia toning.
 * Signature visual: sound rings rippling down from an unseen bell.
 */
import type { ChapterModule } from '../shared/chapter';
import { bellBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './bells.css';

const chapter: ChapterModule = {
  backdrop: bellBackdrop,
  diorama,
  story,
  labBrief: 'Make the bell ring with a real change, then with a bare `requestPaint()` loop. Compare their `changedElements`.',
  lab,
  practiceBrief: 'Write the three paint patterns you will use everywhere: redraw on paint, loop with `requestPaint()`, and skip work for unchanged elements.',
  exercises,
  trialBrief: 'Six scenarios. Predict what the bell does in each.',
  trial,
};

export default chapter;
