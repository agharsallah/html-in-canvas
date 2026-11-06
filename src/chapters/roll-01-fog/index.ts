/**
 * Roll 01: The fallback fog. Process: platinum print.
 * Signature visual: drifting banks of grey fog; elements emerge from it.
 */
import type { ChapterModule } from '../shared/chapter';
import { fogBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './fog.css';

const chapter: ChapterModule = {
  backdrop: fogBackdrop,
  diorama,
  story,
  labBrief: 'Switch the canvas between fallback and drawable, mark children `drawable`, then press Expose. Read the console when something refuses to appear.',
  lab,
  practiceBrief: 'Three small fixes, written by hand: opt a canvas in, stop a throw, and draw a nested drawable.',
  exercises,
  trialBrief: 'Make the print match the goal: the poem, a sparkling “you”, and no advert. Set the attributes, choose the draw calls, then expose.',
  trial,
};

export default chapter;
