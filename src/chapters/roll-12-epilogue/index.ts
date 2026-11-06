/**
 * Roll 12: The endless reel. Process: hologram.
 * Signature visual: iridescent foil bands and glints; the lab is the
 * exhibition, your negatives as holographic cards.
 */
import type { ChapterModule } from '../shared/chapter';
import { reelBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './epilogue.css';

const chapter: ChapterModule = {
  backdrop: reelBackdrop,
  diorama,
  story,
  labBrief: 'Your exhibition is open. Walk along your negatives, switch the foil shader off and on, then run feature detection and see which path each context would take.',
  lab,
  practiceBrief: 'Three lines of defence for every browser: detect support, probe the exact method, and open the escape hatch when the answer is no.',
  exercises,
  trialBrief: 'The boss rush: one question from every roll, then the escape-hatch round. You have three lives; a wrong answer costs one.',
  trial,
};

export default chapter;
