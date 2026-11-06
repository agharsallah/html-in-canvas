/**
 * Trial: the boss fight against Blur. Phase one files twelve values from the
 * units table under the right unit; phase two sizes grids and centres cards
 * in grid px. Every hit sharpens Blur's portrait and drains its strength;
 * every miss is a mistake. Rules: units.ts and rounds.ts.
 */
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { ROUNDS } from './rounds';
import { mountLedger } from './trial-ledger';
import { mountSizing } from './trial-sizing';
import { LEDGER } from './units';

const TOTAL = LEDGER.length + ROUNDS.length * 2;

export const trial: Beat = (host, ctx) => {
  let mistakes = 0;
  let hits = 0;
  let unmount = () => {};

  const meter = h('div', { class: 'lens-boss-meter', role: 'meter', 'aria-label': 'Blur’s strength', 'aria-valuemin': '0', 'aria-valuemax': '100' },
    h('span', { class: 'lens-boss-fill' }));
  const portrait = h('p', { class: 'lens-boss-name', 'aria-hidden': 'true' }, 'Blur');
  const phaseLabel = h('p', { class: 'lens-boss-phase' });
  const tally = h('p', { class: 'lens-boss-tally', 'aria-live': 'polite' });
  const arena = h('div', { class: 'lens-arena' });
  const boss = h('div', { class: 'lens-boss' }, portrait, h('div', {}, phaseLabel, meter, tally));
  host.append(h('div', { class: 'lens-trial' }, boss, arena));

  const render = () => {
    const strength = Math.round(100 * (1 - hits / TOTAL));
    boss.style.setProperty('--blur', `${(strength / 100) * 7}px`);
    boss.style.setProperty('--strength', `${strength}%`);
    meter.setAttribute('aria-valuenow', String(strength));
    meter.setAttribute('aria-valuetext', `Blur at ${strength}%`);
    tally.textContent = `Blur ${strength}% · mistakes ${mistakes}`;
  };

  const shake = () => {
    boss.dataset.hit = 'false';
    void boss.offsetWidth; // restart the animation
    boss.dataset.hit = 'true';
  };

  const phaseTwo = () => {
    unmount();
    phaseLabel.textContent = 'Phase 2 of 2: the grinding wheel';
    ctx.say('Now grind. Size the grid, then place the card in grid px.');
    unmount = mountSizing(arena, {
      onHit: () => {
        hits += 2;
        render();
      },
      onMiss: () => {
        mistakes += 1;
        shake();
        render();
        ctx.say('Soft again. Read the hint and grind once more.', 'foe');
      },
      onDone: () => {
        render();
        ctx.say(mistakes === 0 ? 'Not one soft edge. Blur shatters like a cracked plate.' : 'Blur is ground away. Every edge holds.');
        ctx.completeTrial({ mistakes, stamps: mistakes === 0 ? ['sharp-eye'] : [] });
      },
    });
  };

  phaseLabel.textContent = 'Phase 1 of 2: the Unit Ledger';
  unmount = mountLedger(arena, {
    onHit: () => {
      hits += 1;
      render();
    },
    onMiss: () => {
      mistakes += 1;
      shake();
      render();
      ctx.say('Wrong ledger. Every wrong unit is a little more blur.', 'foe');
    },
    onDone: phaseTwo,
  });
  render();
  return () => unmount();
};
