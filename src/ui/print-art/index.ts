/**
 * The photograph on each print: one picture per roll, drawn from the roll's
 * own process colours. Built once per card and cached, so re-rendering a
 * print's text never rebuilds its picture.
 */
import type { RollId } from '../../story/rolls';
import { bells, fog, lens, mirrors, projector, prologue } from './early';
import { clockwork, epilogue, foundry, lighthouse, observatory, railway, vault } from './late';

const PICTURES: Record<RollId, () => SVGSVGElement> = {
  prologue, fog, bells, lens, projector, mirrors, observatory, foundry, railway, lighthouse, vault, clockwork, epilogue,
};

export function printArt(roll: RollId): SVGSVGElement {
  return PICTURES[roll]();
}
