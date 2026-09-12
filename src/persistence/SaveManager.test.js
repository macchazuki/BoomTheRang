import { describe, expect, it } from 'vitest';
import { GameState } from '../gameplay/GameState.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';
import { UPGRADE_IDS } from '../progression/upgradeDefinitions.js';
import { SAVE_KEY, createDefaultSave } from './defaultSave.js';
import { SaveManager } from './SaveManager.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

describe('SaveManager contract', () => {
  it('returns fresh defaults when no save exists', () => {
    const manager = new SaveManager({ storage: createMemoryStorage() });

    const first = manager.load();
    const second = manager.load();

    expect(first).toEqual(createDefaultSave());
    expect(second).toEqual(createDefaultSave());
    expect(first).not.toBe(second);
    expect(first.upgrades).not.toBe(second.upgrades);
    expect(Object.keys(first.upgrades)).toEqual(UPGRADE_IDS);
  });

  it('round-trips valid v1 data', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager({ storage });
    const save = createDefaultSave();

    save.xp = 1234;
    save.lifetimeXp = 5678;
    save.upgrades.betterTraining1 = true;
    save.progression.gameCompleted = true;
    save.gameplay.combo = 7;
    save.stats.manualThrows = 42;
    save.stats.activePlaySeconds = 91.25;
    save.settings.masterVolume = 0.6;
    save.settings.haptics = false;
    save.settings.screenShake = false;
    save.settings.reducedMotion = true;

    expect(manager.save(save)).toBe(true);
    expect(manager.load()).toEqual(save);
  });

  it('fills missing fields', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager({ storage });
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, xp: 50 }));

    const loaded = manager.load();

    expect(loaded.xp).toBe(50);
    expect(loaded.lifetimeXp).toBe(50);
    expect(loaded.upgrades).toEqual(createDefaultSave().upgrades);
    expect(loaded.progression).toEqual({ gameCompleted: false });
    expect(loaded.gameplay).toEqual({ combo: 0 });
    expect(loaded.stats).toEqual(createDefaultSave().stats);
    expect(loaded.settings).toEqual(createDefaultSave().settings);
  });

  it('recovers from corrupted JSON', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager({ storage });
    storage.setItem(SAVE_KEY, '{not valid json');

    expect(manager.load()).toEqual(createDefaultSave());
  });

  it('ignores unknown and removed upgrades/fields safely', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager({ storage });
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        xp: 10,
        unexpectedRootField: 'ignored',
        upgrades: {
          betterTraining1: true,
          secondDummy: true,
          imaginaryUpgrade: true,
        },
        stats: {
          manualThrows: 3,
          imaginaryStat: 999,
        },
      }),
    );

    const loaded = manager.load();

    expect(loaded.upgrades.betterTraining1).toBe(true);
    expect(loaded.upgrades).not.toHaveProperty('secondDummy');
    expect(loaded.upgrades).not.toHaveProperty('imaginaryUpgrade');
    expect(loaded.stats.manualThrows).toBe(3);
    expect(loaded.stats).not.toHaveProperty('imaginaryStat');
    expect(loaded).not.toHaveProperty('unexpectedRootField');
  });

  it('clamps unsafe numeric/settings values', () => {
    const manager = new SaveManager({ storage: createMemoryStorage() });
    const sanitized = manager.roundTrip({
      version: 1,
      xp: Number.MAX_VALUE,
      lifetimeXp: -100,
      gameplay: { combo: Number.MAX_VALUE },
      stats: {
        manualThrows: -4,
        activePlaySeconds: Number.MAX_VALUE,
      },
      settings: {
        masterVolume: -1,
        musicVolume: 2,
        sfxVolume: Number.NaN,
        haptics: 'yes',
        screenShake: 'yes',
        reducedMotion: null,
      },
    });

    expect(sanitized.xp).toBe(Number.MAX_SAFE_INTEGER);
    expect(sanitized.lifetimeXp).toBe(Number.MAX_SAFE_INTEGER);
    expect(sanitized.gameplay.combo).toBe(Number.MAX_SAFE_INTEGER);
    expect(sanitized.stats.manualThrows).toBe(0);
    expect(sanitized.stats.activePlaySeconds).toBe(Number.MAX_SAFE_INTEGER);
    expect(sanitized.settings).toEqual({
      masterVolume: 0,
      musicVolume: 1,
      sfxVolume: 1,
      haptics: true,
      screenShake: true,
      reducedMotion: false,
    });
  });

  it('keeps migration path explicit by version', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager({ storage });
    const unsupported = createDefaultSave();
    unsupported.version = 2;
    unsupported.xp = 999;
    storage.setItem(SAVE_KEY, JSON.stringify(unsupported));

    expect(manager.load()).toEqual(createDefaultSave());

    const wrongType = createDefaultSave();
    wrongType.version = '1';
    wrongType.xp = 999;
    storage.setItem(SAVE_KEY, JSON.stringify(wrongType));

    expect(manager.load()).toEqual(createDefaultSave());
  });

  it('restores late-game derived effects from canonical upgrade ownership', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager({ storage });
    const save = createDefaultSave();

    for (const upgradeId of UPGRADE_IDS) {
      save.upgrades[upgradeId] = true;
    }
    save.xp = 5000;
    save.lifetimeXp = 10_000_000;
    save.gameplay.combo = 18;
    save.progression.gameCompleted = true;

    manager.save(save);

    const gameState = new GameState(manager.load());
    const effects = new ProgressionManager(gameState).getDerivedEffects();

    expect(effects.playerBoomerangCount).toBe(4);
    expect(effects.targetCount).toBe(1);
    expect(effects.dogUnlocked).toBe(true);
    expect(effects.dogIntervalSeconds).toBe(4);
    expect(effects.dogXpFactor).toBe(1);
    expect(effects.comboUnlocked).toBe(true);
    expect(effects.comboMaxBonus).toBe(0.5);
    expect(effects.boomerangMasteryMultiplier).toBe(1.5);
    expect(gameState.gameplay.combo).toBe(18);
    expect(gameState.progression.gameCompleted).toBe(true);
  });
});
