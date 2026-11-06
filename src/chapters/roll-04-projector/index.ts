/**
 * Roll 04: The projector hall. Process: three-strip colour.
 * Signature visual: red, green and blue projector beams, slightly out of
 * register, over dark velvet.
 */
import type { ChapterModule } from '../shared/chapter';
import { projectorBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './projector.css';
import './projector-trial.css';

const chapter: ChapterModule = {
  backdrop: projectorBackdrop,
  diorama,
  story,
  labBrief: 'Drag the gate over the ticket (CSS px) and the frame over the screen (grid px). Watch the call switch between the four forms as you crop, size and tilt.',
  lab,
  practiceBrief: 'Crop, stretch and tilt by hand: the source rect, the destination size, and the context transform.',
  exercises,
  trialBrief: 'The Crooked Reel jammed six frames. Pick the right form and the right numbers to match each target.',
  trial,
};

export default chapter;
