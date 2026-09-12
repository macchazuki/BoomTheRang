import { describe, expect, it } from 'vitest';
import { createDefaultSave } from './defaultSave.js';
import { SaveManager } from './SaveManager.js';

describe('active skill persistence', () => {
  it('adds inactive skill defaults to legacy v1-shaped saves', () => {
    const manager = new SaveManager({ storage: null });
    const sanitized = manager.roundTrip({ version: 1, xp: 25, lifetimeXp: 25 });

    expect(sanitized.skills).toEqual({
      rapidRecall: { learned: false, active: false },
      openingBullseye: { learned: false, active: false },
    });
  });

  it('persists learned/active state and ignores unknown skills', () => {
    const manager = new SaveManager({ storage: null });
    const save = createDefaultSave();
    save.skills.rapidRecall = { learned: true, active: true };
    save.skills.openingBullseye = { learned: true, active: false };
    save.skills.imaginarySkill = { learned: true, active: true };

    const sanitized = manager.roundTrip(save);

    expect(sanitized.skills).toEqual({
      rapidRecall: { learned: true, active: true },
      openingBullseye: { learned: true, active: false },
    });
  });

  it('never keeps a skill active unless it is learned', () => {
    const manager = new SaveManager({ storage: null });
    const sanitized = manager.roundTrip({
      version: 1,
      skills: {
        rapidRecall: { learned: false, active: true },
      },
    });

    expect(sanitized.skills.rapidRecall).toEqual({ learned: false, active: false });
  });
});
