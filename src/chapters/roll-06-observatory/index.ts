/**
 * Roll 06: The orbit observatory. Process: cyanotype.
 * Signature visual: a white-line star chart on Prussian blue.
 */
import type { ChapterModule } from '../shared/chapter';
import { observatoryBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './observatory.css';
import './observatory-trial.css';

const chapter: ChapterModule = {
  backdrop: observatoryBackdrop,
  diorama,
  story,
  labBrief: 'A live form rides a swaying satellite. Type into it, flip `UNPACK_FLIP_Y_WEBGL`, stop gating uploads on `changedElements`, and click the tilted face.',
  lab,
  practiceBrief: 'Write the WebGL trio: allocate the texture once, upload only fresh snapshots, and tell the DOM where the element landed.',
  exercises,
  trialBrief: 'Assemble the upload pipeline, then land clicks on a tilted card through the projective matrix.',
  trial,
};

export default chapter;
