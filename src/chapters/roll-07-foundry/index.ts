/**
 * Roll 07: The GPU foundry. Process: lith print.
 * Signature visual: a black foundry floor with a molten seam and embers.
 */
import type { ChapterModule } from '../shared/chapter';
import { foundryBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './foundry.css';
import './foundry-chart.css';
import './foundry-trial.css';

const chapter: ChapterModule = {
  backdrop: foundryBackdrop,
  diorama,
  story,
  labBrief: 'Run a live card through a shader. Heat it, then melt it, and click it both times. Theme the shader from CSS, and work the WebGPU crucible’s invisible slider.',
  lab,
  practiceBrief: 'Write the WebGPU essentials: the texture recipe, the upload in `paint`, and the jelly slider’s theme-through-JS.',
  exercises,
  trialBrief: 'Sort shader effects into safe and melting, then fill two WebGPU orders with the guide’s texture recipe.',
  trial,
};

export default chapter;
