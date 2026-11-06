/**
 * Lab sounds must never become a drone: the cooldown blocks rapid repeats,
 * fatigue stretches it while a cue keeps firing, and a pause resets it.
 */
import { describe, expect, it } from 'vitest';
import { admit, type Gate } from '../src/ui/fx/lab-sfx';

const fresh = (): Gate => ({ at: -Infinity, fatigue: 1 });

describe('lab sound gate', () => {
  it('plays the first time and blocks repeats inside the cooldown', () => {
    const gate = fresh();
    expect(admit(gate, 0, 500)).toBe(true);
    expect(admit(gate, 200, 500)).toBe(false);
    expect(admit(gate, 499, 500)).toBe(false);
    expect(admit(gate, 500, 500)).toBe(true);
  });

  it('tires while a cue keeps firing, up to four times the cooldown', () => {
    const gate = fresh();
    let now = 0;
    let plays = 0;
    // Something asks every 10 ms for 20 seconds (a spinning gear).
    for (; now < 20_000; now += 10) if (admit(gate, now, 500)) plays += 1;
    expect(gate.fatigue).toBe(4);
    // Without fatigue it would be 40 plays; with it, far fewer.
    expect(plays).toBeLessThan(16);
  });

  it('is rested after a quiet spell', () => {
    const gate = fresh();
    for (let now = 0; now < 5000; now += 10) admit(gate, now, 500);
    expect(gate.fatigue).toBeGreaterThan(1);
    expect(admit(gate, 5000 + 500 * gate.fatigue * 3, 500)).toBe(true);
    expect(gate.fatigue).toBe(1);
  });
});
