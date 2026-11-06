/**
 * Stamps: achievements pressed into the corner of your contact sheet.
 * They reward *how* you played, not just that you finished.
 */
export interface Stamp {
  id: string;
  name: string;
  /** What you did to earn it, written as the reason it was awarded. */
  text: string;
  silver: number;
}

export const STAMPS: readonly Stamp[] = [
  { id: 'first-light', name: 'First light', text: 'You opened the darkroom door.', silver: 10 },
  { id: 'tab-walker', name: 'Tab walker', text: 'You reached a print in 3D using only the keyboard.', silver: 30 },
  { id: 'clean-exposure', name: 'Clean exposure', text: 'You finished a trial without a single mistake.', silver: 40 },
  { id: 'quiet-bells', name: 'Quiet bells', text: 'You predicted every paint event in the bell tower.', silver: 50 },
  { id: 'fog-walker', name: 'Fog walker', text: 'You tried to draw an element that was not drawable, and read the error.', silver: 20 },
  { id: 'hand-written', name: 'Hand-written', text: 'You solved every exercise in a roll without revealing a solution.', silver: 40 },
  { id: 'night-owl', name: 'Night owl', text: 'You visited the Album before finishing a roll.', silver: 10 },
  { id: 'round-earth', name: 'Round earth', text: 'You built the upload pipeline and landed every orbit click without a slip.', silver: 50 },
  { id: 'cool-head', name: 'Cool head', text: 'You sorted every shader and configured the foundry without a single melt.', silver: 50 },
  { id: 'sharp-eye', name: 'Sharp eye', text: 'You beat Blur without a single wrong unit or soft edge.', silver: 50 },
  { id: 'steady-reel', name: 'Steady reel', text: 'You framed every projector shot on the first try.', silver: 50 },
  { id: 'airtight', name: 'Airtight', text: 'You guarded the vault without letting a single card or heist slip.', silver: 50 },
  { id: 'endless-reel', name: 'Endless reel', text: 'You beat the boss rush without losing a single life.', silver: 60 },
  { id: 'on-time', name: 'On time', text: 'You dispatched every railway timetable without a single red signal.', silver: 50 },
  { id: 'steady-hands', name: 'Steady hands', text: 'You rebuilt the clockwork and predicted every landing without a slip.', silver: 50 },
  { id: 'ghost-catcher', name: 'Ghost catcher', text: 'You made a click register where nothing was drawn, and saw why.', silver: 20 },
  { id: 'mirror-master', name: 'Mirror master', text: 'You fixed every mirror in the maze without a single ghost click.', silver: 50 },
  { id: 'lighthouse-keeper', name: 'Lighthouse keeper', text: 'You audited the tide board using only the keyboard.', silver: 40 },
];

export function getStamp(id: string): Stamp | undefined {
  return STAMPS.find((stamp) => stamp.id === id);
}
