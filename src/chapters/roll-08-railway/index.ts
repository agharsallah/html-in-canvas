/**
 * Roll 08: The worker railway. Process: instant film.
 * Signature visual: white-bordered instant prints developing from murky
 * chemical green, like snapshots arriving by train.
 */
import type { ChapterModule } from '../shared/chapter';
import { railwayBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './railway.css';
import './railway-trial.css';

const chapter: ChapterModule = {
  backdrop: railwayBackdrop,
  diorama,
  story,
  labBrief: 'Run the railway. Tune how often `paint` captures, how long the worker draws, and whether images are closed or skipped. Make a late train, leak the yard, then tidy it.',
  lab,
  practiceBrief: 'Write the three stops of the round trip: ship the snapshot, draw it in the worker, and read the geometry when it comes home.',
  exercises,
  trialBrief: 'Three timetables. Dispatch every train on time and leave nothing in the yard.',
  trial,
};

export default chapter;
