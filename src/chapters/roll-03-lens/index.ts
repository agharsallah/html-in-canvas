/**
 * Roll 03: The lens grinder. Process: daguerreotype.
 * Signature visual: a mirror-silver plate with focus rings breathing in and
 * out of focus. Foe: Blur, who lives in every mismatched pixel grid.
 */
import type { ChapterModule } from '../shared/chapter';
import { lensBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './lens.css';
import './lens-trial.css';

const chapter: ChapterModule = {
  backdrop: lensBackdrop,
  diorama,
  story,
  labBrief: 'Pick the canvas grid and a screen. Read the loupe: grind until your canvas’ device pixels match a plain `<div>`’s, on every DPR.',
  lab,
  practiceBrief: 'Write the three lines that keep HTML sharp: size the grid from device pixels, convert CSS px to grid px, and make `width` mean the drawn box.',
  exercises,
  trialBrief: 'Face Blur. File twelve values under the right unit, then size grids and centre cards in grid px. Keys 1–4 file a value.',
  trial,
};

export default chapter;
