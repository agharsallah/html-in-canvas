/**
 * Roll 09: The lighthouse of voices. Process: salt print.
 * Signature visual: a slow lighthouse beam sweeping over warm brown paper,
 * with a sea-blue horizon.
 */
import type { ChapterModule } from '../shared/chapter';
import { lighthouseBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './lighthouse.css';

const chapter: ChapterModule = {
  backdrop: lighthouseBackdrop,
  diorama,
  story,
  labBrief: 'Toggle `drawable`, `inert` and `aria-hidden`, stop drawing or clear geometry, and Tab through the canvas. The screen reader view, the chart and the beam show who can still be heard, reached and clicked.',
  lab,
  practiceBrief: 'Three fixes from the official demos: give a chart roles and tab stops, ring the focused wedge, and silence a hidden card face.',
  exercises,
  trialBrief: 'The tide board hides seven accessibility bugs. Fix the markup and the paint handler, then sweep the beam. Use only the keyboard for an extra stamp.',
  trial,
};

export default chapter;
