/**
 * Trial: the boss rush. One question from every roll of the journey, then
 * the escape-hatch round, against three lives. Scoring and dealing live in
 * rules.ts (tests/epilogue-rules.test.ts).
 */
import type { Beat } from '../shared/chapter';
import { mountRush } from './rush';

export const trial: Beat = (host, ctx) =>
  mountRush(host, ctx, (mistakes) => {
    ctx.say(mistakes === 0 ? 'Not one life lost. The future is yours to write.' : 'The future yields. Go and build it.');
    ctx.completeTrial({ mistakes, stamps: mistakes === 0 ? ['endless-reel'] : [] });
  });
