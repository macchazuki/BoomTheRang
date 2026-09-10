import { UPGRADE_IDS } from '../progression/upgradeDefinitions.js';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'boomTheRang.save.v1';

/**
 * Build a fresh v1 save. Return a new object every call.
 */
export function createDefaultSave() {
  const upgrades = Object.fromEntries(UPGRADE_IDS.map((id) => [id, false]));

  return {
    version: SAVE_VERSION,
    xp: 0,
    lifetimeXp: 0,
    upgrades,
    progression: {
      gameCompleted: false,
    },
    gameplay: {
      combo: 0,
    },
    stats: {
      manualThrows: 0,
      hits: 0,
      criticals: 0,
      misses: 0,
      dogThrows: 0,
      dogCriticals: 0,
      targetsHit: 0,
      xpEarnedFromPlayer: 0,
      xpEarnedFromDog: 0,
      longestCombo: 0,
      activePlaySeconds: 0,
    },
    settings: {
      masterVolume: 1,
      musicVolume: 1,
      sfxVolume: 1,
      haptics: true,
      reducedMotion: false,
    },
  };
}
