/**
 * Themed lab sounds: each lab sounds like its place. The bell tower rings
 * a bell, the projector hall clatters film through a gate, the foundry
 * sizzles, the railway whistles, the clockwork ticks.
 *
 * Sounds play on meaningful moments only (an exposure, a ring, a hit, a
 * late train), never on every click. Each cue picks a slightly different
 * pitch every time and has its own cooldown, so a busy lab never turns
 * into a drone. All of it is silent until the learner turns sound on.
 */
import { breath, tone, withAudio, type Audio } from './synth';

export type LabCue =
  | 'smudge' | 'reveal'
  | 'foghorn' | 'fog-clear'
  | 'bell'
  | 'grind' | 'glass'
  | 'projector'
  | 'shimmer' | 'ghost'
  | 'beep' | 'whirr'
  | 'sizzle' | 'pour'
  | 'chug' | 'whistle'
  | 'horn' | 'sonar'
  | 'tumbler' | 'clunk'
  | 'tick' | 'ratchet' | 'jam'
  | 'reel';

/** Minimum time between two plays of the same cue, in ms. */
const COOLDOWN: Record<LabCue, number> = {
  smudge: 400, reveal: 800, foghorn: 1500, 'fog-clear': 600, bell: 650, grind: 140, glass: 600, projector: 900,
  shimmer: 250, ghost: 400, beep: 300, whirr: 300, sizzle: 700, pour: 700, chug: 600, whistle: 4000,
  horn: 1500, sonar: 300, tumbler: 500, clunk: 400, tick: 90, ratchet: 300, jam: 1000, reel: 500,
};
/**
 * Fatigue: a cue that keeps firing (a spinning gear ringing the bell every
 * frame) backs off, up to four times its cooldown, and recovers after a
 * quiet spell. Busy labs stay musical instead of becoming an alarm.
 */
const state = new Map<LabCue, { at: number; fatigue: number }>();

/** A pitch that wanders a little around `base`, so repeats don't sound copied. */
const vary = (base: number, cents = 60) => base * 2 ** (((Math.random() * 2 - 1) * cents) / 1200);
const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;
const PENTATONIC = [392, 440, 523.25, 587.33, 659.25];

export interface Gate { at: number; fatigue: number }

/**
 * May a cue play at `now`? Mutates the gate when it does. Played again soon
 * after the last time, it tires (up to 4x the cooldown); after a pause of
 * 2.5x the current cooldown, it is rested again.
 */
export function admit(gate: Gate, now: number, cooldown: number): boolean {
  const since = now - gate.at;
  if (since < cooldown * gate.fatigue) return false;
  gate.fatigue = since < cooldown * gate.fatigue * 2.5 ? Math.min(4, gate.fatigue * 1.4) : 1;
  gate.at = now;
  return true;
}

export function sfx(cue: LabCue): void {
  let gate = state.get(cue);
  if (!gate) state.set(cue, (gate = { at: -Infinity, fatigue: 1 }));
  if (!admit(gate, performance.now(), COOLDOWN[cue])) return;
  withAudio((a, t) => SYNTHS[cue](a, t));
}

const SYNTHS: Record<LabCue, (a: Audio, t: number) => void> = {
  // Prologue: a thumb smearing paint, then crisp text appearing.
  smudge: (a, t) => breath(a, t, 0.4, vary(700, 200), 0.16, 'lowpass', 260),
  reveal: (a, t) => {
    tone(a, vary(1320), t, 0.18, 'sine', 0.08);
    tone(a, vary(1980), t + 0.05, 0.25, 'sine', 0.06);
  },

  // Fog: a low foghorn for the fallback, a breeze as the fog lifts.
  foghorn: (a, t) => {
    const f = pick([82.4, 87.3, 98]);
    swell(a, t, f, 1.3, 'sawtooth', 0.12, 380);
    swell(a, t + 0.05, f * 1.5, 1.2, 'sawtooth', 0.06, 380);
  },
  'fog-clear': (a, t) => breath(a, t, 0.7, 420, 0.1, 'bandpass', vary(3200, 150)),

  // Bells: a struck bell with inharmonic partials, on a pentatonic note.
  bell: (a, t) => {
    const f = vary(pick(PENTATONIC), 15);
    [[1, 0.16, 2.4], [2, 0.07, 1.6], [2.76, 0.05, 1.1], [5.4, 0.025, 0.6], [0.5, 0.05, 2.8]].forEach(([ratio, gain, dur]) =>
      tone(a, f * ratio!, t, dur!, 'sine', gain!));
  },

  // Lens: grit on the grinding wheel, a glass ting when it is sharp.
  grind: (a, t) => breath(a, t, 0.09, vary(1500, 300), 0.06, 'bandpass'),
  glass: (a, t) => {
    tone(a, vary(2093, 20), t, 0.6, 'sine', 0.08);
    tone(a, vary(3136, 20), t + 0.02, 0.45, 'sine', 0.05);
  },

  // Projector: the gate clatters film through at 24 frames a second, over a motor hum.
  projector: (a, t) => {
    const frames = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < frames; i++) click(a, t + i / 24, 0.05 * (1 - i / frames / 2), 3200);
    swell(a, t, vary(55, 30), frames / 24 + 0.1, 'sawtooth', 0.04, 240);
  },

  // Mirrors: a glass shimmer for a true hit, a falling ghostly whoosh for a ghost.
  shimmer: (a, t) => [1, 1.5, 2, 2.5].forEach((r, i) => tone(a, vary(1046 * r, 10), t + i * 0.03, 0.5, 'sine', 0.04)),
  ghost: (a, t) => glide(a, t, vary(720), 180, 0.8, 0.08),

  // Observatory: telemetry blips, and a servo when a click lands on the globe.
  beep: (a, t) => {
    const f = pick([1320, 1480, 1760]);
    tone(a, f, t, 0.06, 'square', 0.025, 3000);
    tone(a, f * 1.25, t + 0.08, 0.06, 'square', 0.02, 3000);
  },
  whirr: (a, t) => glide(a, t, 140, vary(320), 0.3, 0.05, 'sawtooth', 900),

  // Foundry: molten metal sizzles, a heavy pour rumbles.
  sizzle: (a, t) => breath(a, t, 0.6, vary(5200, 200), 0.07, 'highpass'),
  pour: (a, t) => {
    breath(a, t, 0.8, 180, 0.18, 'lowpass', 90);
    breath(a, t + 0.2, 0.5, 4800, 0.04, 'highpass');
  },

  // Railway: wheels over rail joints, and a whistle for a late train.
  chug: (a, t) => {
    click(a, t, 0.08, 500);
    click(a, t + 0.11, 0.06, 500);
  },
  whistle: (a, t) => {
    const f = vary(880, 40);
    vibrato(a, t, f, 0.9, 0.05);
    vibrato(a, t, f * 1.26, 0.9, 0.035);
  },

  // Lighthouse: the foghorn button, and a sonar ping as focus moves.
  horn: (a, t) => {
    swell(a, t, 73.4, 1.6, 'sawtooth', 0.14, 320);
    swell(a, t, 110, 1.5, 'sawtooth', 0.06, 320);
  },
  sonar: (a, t) => glide(a, t, vary(1180, 30), 1050, 0.9, 0.05),

  // Vault: lock tumblers falling into place, the door closing.
  tumbler: (a, t) => [0, 0.07, 0.15].forEach((d) => click(a, t + d + Math.random() * 0.02, 0.07, vary(2400, 150))),
  clunk: (a, t) => {
    glide(a, t, 110, 52, 0.35, 0.22, 'sine');
    breath(a, t, 0.18, 400, 0.12, 'lowpass');
  },

  // Clockwork: an escapement tick (alternating tick and tock), a ratchet, a jam.
  tick: (a, t) => {
    tock = !tock;
    woodblock(a, t, tock ? 1650 : 1250, 0.07);
  },
  ratchet: (a, t) => {
    for (let i = 0; i < 6; i++) woodblock(a, t + i * 0.045, vary(1900, 80), 0.05);
  },
  jam: (a, t) => {
    breath(a, t, 0.5, 300, 0.16, 'lowpass', 120);
    glide(a, t, 160, 60, 0.45, 0.12, 'square', 500);
  },

  // Epilogue: the reel spins, a soft major chord.
  reel: (a, t) => {
    for (let i = 0; i < 6; i++) click(a, t + i * 0.035, 0.035, 2600);
    [523.25, 659.25, 783.99].forEach((f, i) => tone(a, f, t + 0.15 + i * 0.04, 0.6, 'triangle', 0.05));
  },
};

let tock = false;

/** A noise click: film gates, wheels, tumblers. */
function click(a: Audio, at: number, gain: number, freq: number): void {
  const src = a.ctx.createBufferSource();
  src.buffer = a.noise;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.4;
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.025);
  src.connect(filter).connect(env).connect(a.out);
  src.start(at, Math.random() * 0.8);
  src.stop(at + 0.04);
}

/** A woodblock: a very short, filtered triangle. */
function woodblock(a: Audio, at: number, freq: number, gain: number): void {
  tone(a, freq, at, 0.05, 'triangle', gain, freq * 1.6);
}

/** A note that swells in slowly: horns. */
function swell(a: Audio, at: number, freq: number, dur: number, type: OscillatorType, gain: number, lowpass: number): void {
  const osc = a.ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + dur * 0.25);
  env.gain.setValueAtTime(gain, at + dur * 0.7);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(filter).connect(env).connect(a.out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** A pitch glide: ghosts, servos, sonar, thuds. */
function glide(a: Audio, at: number, from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine', lowpass?: number): void {
  const osc = a.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let node: AudioNode = osc;
  if (lowpass) {
    const filter = a.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    node = osc.connect(filter);
  }
  node.connect(env).connect(a.out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** A held note with vibrato: a steam whistle. */
function vibrato(a: Audio, at: number, freq: number, dur: number, gain: number): void {
  const osc = a.ctx.createOscillator();
  osc.frequency.value = freq;
  const lfo = a.ctx.createOscillator();
  lfo.frequency.value = 6;
  const depth = a.ctx.createGain();
  depth.gain.value = freq * 0.012;
  lfo.connect(depth).connect(osc.frequency);
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.08);
  env.gain.setValueAtTime(gain, at + dur * 0.75);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(env).connect(a.out);
  osc.start(at);
  lfo.start(at);
  osc.stop(at + dur + 0.05);
  lfo.stop(at + dur + 0.05);
}
