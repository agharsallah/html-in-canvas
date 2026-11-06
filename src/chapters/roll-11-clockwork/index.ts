/**
 * Roll 11: The clockwork heart. Process: albumen print.
 * Signature visual: a watch movement turning slowly behind the chapter.
 */
import type { ChapterModule } from '../shared/chapter';
import { clockworkBackdrop } from './backdrop';
import { diorama } from './diorama';
import { exercises } from './exercises';
import { lab } from './lab';
import { story } from './story';
import { trial } from './trial';
import './clockwork.css';

const chapter: ChapterModule = {
  backdrop: clockworkBackdrop,
  diorama,
  story,
  labBrief: 'Step a model of the rendering update tick by tick. Move the `paint` event between Options A, B and C, inject events into frame 1, and see which frame each lands in.',
  lab,
  practiceBrief: 'Write code that trusts the clockwork: a DOM edit that drives the next paint, a resize observer that runs before Paint, and nested canvases that paint inside out.',
  exercises,
  trialBrief: 'Reassemble the rendering update, then predict where nine scenarios land and name the design that won.',
  trial,
};

export default chapter;
