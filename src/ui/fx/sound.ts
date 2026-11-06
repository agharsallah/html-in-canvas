/**
 * Sound: small synthesised cues, off until the learner turns them on.
 *
 * Nothing is downloaded: every cue is a few oscillators (or a breath of
 * filtered noise) shaped by an envelope, through one compressor so stacked
 * cues never clip. The AudioContext is created on the first cue after the
 * learner enables sound, which is always inside a click, so autoplay rules
 * are satisfied. The preference persists per browser.
 *
 * This module is only the switch. The synthesiser (synth.ts) is fetched the
 * first time a cue plays, so pages where sound stays off never load it.
 */
import { Emitter } from '../../core/emitter';

export type Cue = 'goal' | 'correct' | 'wrong' | 'complete' | 'paper' | 'on';

const KEY = 'drawable:sound';
const events = new Emitter<{ change: boolean }>();

let enabled = readPreference();

function readPreference(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export const sound = {
  get enabled(): boolean {
    return enabled;
  },
  set(on: boolean): void {
    enabled = on;
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* private mode: the choice lasts for this visit */
    }
    events.emit('change', on);
    if (on) play('on');
  },
  onChange: (listener: (on: boolean) => void) => events.on('change', listener),
};

/** Play a celebration cue, if sound is on. */
export function play(cue: Cue): void {
  if (!enabled) return;
  void import('./synth').then((synth) => synth.playCue(cue));
}
