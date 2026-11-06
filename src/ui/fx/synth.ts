/**
 * The synthesiser behind every cue: one AudioContext, one compressor, a
 * second of white noise, and two building blocks (an enveloped tone and a
 * breath of filtered noise). Loaded on demand by sound.ts and lab-sfx.ts.
 */
import { sound, type Cue } from './sound';

export interface Audio { ctx: AudioContext; out: GainNode; noise: AudioBuffer }
let audio: Audio | null = null;

/** Run a synth function now, if sound is on. Used by the themed lab sounds. */
export function withAudio(fn: (a: Audio, t: number) => void): void {
  if (!sound.enabled) return;
  const a = ensureAudio();
  if (!a) return;
  if (a.ctx.state === 'suspended') void a.ctx.resume();
  fn(a, a.ctx.currentTime + 0.01);
}

export function playCue(cue: Cue): void {
  withAudio((a, t) => cueSynth(a, t, cue));
}

function cueSynth(a: Audio, t: number, cue: Cue): void {
  switch (cue) {
    case 'on':
      tone(a, 784, t, 0.18, 'sine', 0.16);
      tone(a, 1175, t + 0.07, 0.3, 'sine', 0.12);
      break;
    case 'goal':
      // A two-note glass chime, C6 then G6.
      tone(a, 1046.5, t, 0.5, 'sine', 0.2);
      tone(a, 1568, t + 0.07, 0.65, 'sine', 0.16);
      tone(a, 523.25, t, 0.4, 'triangle', 0.06);
      break;
    case 'correct':
      // A rising E minor-ish arpeggio, plucked.
      [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => {
        tone(a, f, t + i * 0.055, 0.4, 'triangle', 0.13);
        tone(a, f * 2, t + i * 0.055, 0.25, 'sine', 0.04);
      });
      break;
    case 'wrong':
      // Two soft, low, falling notes: a nudge, not a buzzer.
      tone(a, 311.13, t, 0.16, 'triangle', 0.14, 900);
      tone(a, 233.08, t + 0.11, 0.26, 'triangle', 0.14, 700);
      break;
    case 'complete':
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => tone(a, f, t + i * 0.06, 0.7, 'triangle', 0.1));
      breath(a, t + 0.3, 0.6, 5200, 0.05);
      break;
    case 'paper':
      // A sheet turning over: a short swell of band-passed noise.
      breath(a, t, 0.32, 1800, 0.12);
      break;
  }
}

function ensureAudio(): Audio | null {
  if (audio) return audio;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 6;
  const out = ctx.createGain();
  out.gain.value = 0.7;
  out.connect(compressor).connect(ctx.destination);
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  audio = { ctx, out, noise };
  return audio;
}

/** One enveloped note: fast attack, exponential decay. */
export function tone(a: Audio, freq: number, at: number, dur: number, type: OscillatorType, gain: number, lowpass?: number): void {
  const osc = a.ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.006);
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

/** Filtered noise with a swell and fade: paper, shimmer. */
export function breath(a: Audio, at: number, dur: number, freq: number, gain: number, type: BiquadFilterType = 'bandpass', sweepTo?: number): void {
  const src = a.ctx.createBufferSource();
  src.buffer = a.noise;
  const filter = a.ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(type === 'bandpass' && sweepTo === undefined ? freq * 0.6 : freq, at);
  filter.frequency.exponentialRampToValueAtTime(sweepTo ?? freq, at + dur);
  filter.Q.value = 0.8;
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + dur * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(env).connect(a.out);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.05);
}
