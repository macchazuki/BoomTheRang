import { describe, expect, it } from 'vitest';
import { SaveManager } from './SaveManager.js';
import { createDefaultSave } from './defaultSave.js';

const manager = new SaveManager({ storage: null });

describe('challenge persistence', () => {
  it('adds default challenge records to old saves that do not contain them', () => {
    const save = createDefaultSave();
    delete save.challenges;

    const sanitized = manager.roundTrip(save);

    expect(sanitized.challenges.speedTrial).toEqual({ bestHits: 0, damageBonus: 0, cooldownUntil: 0 });
    expect(sanitized.challenges.pressureTrial).toEqual({ bestHits: 0, damageBonus: 0, cooldownUntil: 0 });
    expect(sanitized.challenges.masterTrial).toEqual({ bestHits: 0, damageBonus: 0, cooldownUntil: 0 });
  });

  it('sanitizes challenge score, bonus, and cooldown values', () => {
    const save = createDefaultSave();
    save.challenges.speedTrial = {
      bestHits: 12.9,
      damageBonus: 999,
      cooldownUntil: 1234.8,
    };

    const sanitized = manager.roundTrip(save);

    expect(sanitized.challenges.speedTrial).toEqual({
      bestHits: 12,
      damageBonus: 0.15,
      cooldownUntil: 1234,
    });
  });
});
