/**
 * Roll 10: The vault. Process: redacted photocopy.
 * Signature visual: toner grain, typed lines, and black bars that redact
 * the secret ones as the copier's light bar sweeps past.
 */
import type { ChapterModule } from '../shared/chapter';
import { vaultBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './vault.css';

const chapter: ChapterModule = {
  backdrop: vaultBackdrop,
  diorama,
  story,
  labBrief: 'Expose the dossier and compare what you see with what the snapshot holds. Send the spy after a secret and after the caret, then switch the photocopier off (a thought experiment) and watch the leak meter.',
  lab,
  practiceBrief: 'Three safe habits: read the canvas back, choose your own colours instead of system colours, and export the print.',
  exercises,
  trialBrief: 'Guard the vault. First feed the copier: redact what is never painted, print what is. Then call six heists by outcome and channel. Open questions jam the copier and are never scored.',
  trial,
};

export default chapter;
