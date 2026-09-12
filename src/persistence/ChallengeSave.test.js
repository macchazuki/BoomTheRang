import { describe, expect, it } from 'vitest';
import { SaveManager } from './SaveManager.js';
import { createDefaultSave } from './defaultSave.js';

const manager = new SaveManager({ storage: null });

describe('challenge persistence', () => {
  it('adds only the two locked base challenge records to old saves that do not contain them', () => {
    const save = createDefaultSave();
    delete save.challenges;

    const sanitized = manager.roundTrip(save);

    expect(sanitized.challenges.speedTrial).toEqual({ unlocked: false, level: 0, bestHits: 0, damageBonus: 0, cooldownUntil: 0 });
    expect(sanitized.challenges.blindTrial).toEqual({ unlocked: false, level: 0, bestHits: 0, damageBonus: 0, cooldownUntil: 0 });
    expect(Object.keys(sanitized.challenges)).toEqual(['speedTrial', 'blindTrial']);
  });

  it('sanitizes challenge unlock, level, score, bonus, and cooldown values', () => {
    const save = createDefaultSave();
    save.challenges.speedTrial = {
      unlocked: true,
      level: 99,
      bestHits: 12.9,
      damageBonus: 999,
      cooldownUntil: 1234.8,
    };

    const sanitized = manager.roundTrip(save);

    expect(sanitized.challenges.speedTrial).toEqual({
      unlocked: true,
      level: 3,
      bestHits: 12,
      damageBonus: 0.35,
      cooldownUntil: 1234,
    });
  });

  it('folds legacy Pressure and Master challenge progress into Speed Trial', () => {
    const save = createDefaultSave();
    save.challenges.pressureTrial = {
      unlocked: true,
      bestHits: 40,
      damageBonus: 0.2,
      cooldownUntil: 5000,
    };
    save.challenges.masterTrial = {
      unlocked: true,
      bestHits: 60,
      damageBonus: 0.3,
      cooldownUntil: 8000,
    };

    const sanitized = manager.roundTrip(save);

    expect(sanitized.challenges.speedTrial).toEqual({
      unlocked: true,
      level: 3,
      bestHits: 60,
      damageBonus: 0.3,
      cooldownUntil: 8000,
    });
  });
});
