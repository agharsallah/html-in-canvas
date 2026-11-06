/**
 * Every exercise gets a "Your code, running" scene, and the light list the
 * page ships with matches the lazily loaded registry exactly.
 */
import { describe, expect, it } from 'vitest';
import { exercises as prologue } from '../src/chapters/prologue/exercises';
import { exercises as fog } from '../src/chapters/roll-01-fog/exercises';
import { exercises as bells } from '../src/chapters/roll-02-bells/exercises';
import { exercises as lens } from '../src/chapters/roll-03-lens/exercises';
import { exercises as projector } from '../src/chapters/roll-04-projector/exercises';
import { exercises as mirrors } from '../src/chapters/roll-05-mirrors/exercises';
import { exercises as observatory } from '../src/chapters/roll-06-observatory/exercises';
import { exercises as foundry } from '../src/chapters/roll-07-foundry/exercises';
import { exercises as railway } from '../src/chapters/roll-08-railway/exercises';
import { exercises as lighthouse } from '../src/chapters/roll-09-lighthouse/exercises';
import { exercises as vault } from '../src/chapters/roll-10-vault/exercises';
import { exercises as clockwork } from '../src/chapters/roll-11-clockwork/exercises';
import { exercises as epilogue } from '../src/chapters/roll-12-epilogue/exercises';
import { PROOF_IDS } from '../src/chapters/shared/proof';
import { PROOFS } from '../src/chapters/shared/proof/registry';

const ALL = [prologue, fog, bells, lens, projector, mirrors, observatory, foundry, railway, lighthouse, vault, clockwork, epilogue]
  .flat().map((ex) => ex.id);

describe('proof scenes', () => {
  it('cover every exercise, and only real exercises', () => {
    expect([...PROOF_IDS].sort()).toEqual([...ALL].sort());
  });

  it('ship the same id list as the lazy registry', () => {
    expect([...PROOF_IDS].sort()).toEqual(Object.keys(PROOFS).sort());
  });

  it('each tie the scene back to the code in one or two sentences', () => {
    for (const [id, proof] of Object.entries(PROOFS)) {
      expect(proof.says.length, id).toBeGreaterThan(30);
      expect(proof.says.length, id).toBeLessThanOrEqual(140);
    }
  });
});
