import { describe, expect, it } from 'vitest';
import { createDefaultSave } from './defaultSave.js';
import { SaveManager } from './SaveManager.js';

describe('active skill persistence', () => {
  it('adds unlearned level-zero defaults to legacy saves', () => {
    const manager = new SaveManager({ storage: null });
    const sanitized = manager.roundTrip({ version: 1, xp: 25, lifetimeXp: 25 });
    expect(sanitized.skills).toEqual({
      rapidRecall: { learned: false, level: 0 },
      openingBullseye: { learned: false, level: 0 },
    });
  });

  it('persists learned levels and ignores unknown skills', () => {
    const manager = new SaveManager({ storage: null });
    const save = createDefaultSave();
    save.skills.rapidRecall = { learned: true, level: 3 };
    save.skills.openingBullseye = { learned: true, level: 2 };
    save.skills.imaginarySkill = { learned: true, level: 99 };
    expect(manager.roundTrip(save).skills).toEqual({
      rapidRecall: { learned: true, level: 3 },
      openingBullseye: { learned: true, level: 2 },
    });
  });

  it('converts the previous learned/active shape to level 1 without persisting runtime activation', () => {
    const manager = new SaveManager({ storage: null });
    const sanitized = manager.roundTrip({
      version: 1,
      skills: { rapidRecall: { learned: true, active: true } },
    });
    expect(sanitized.skills.rapidRecall).toEqual({ learned: true, level: 1 });
    expect(sanitized.skills.rapidRecall).not.toHaveProperty('active');
  });
});
