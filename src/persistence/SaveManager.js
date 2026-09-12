import { clamp, cloneData } from '../game.js';
import { SAVE_KEY, SAVE_VERSION, createDefaultSave } from './defaultSave.js';
import { UPGRADE_IDS } from '../progression/upgradeDefinitions.js';
import { SKILL_BY_ID, SKILL_IDS } from '../progression/skillDefinitions.js';
import { CHALLENGE_DEFINITIONS } from '../challenges/challengeDefinitions.js';

const MAX_SAFE_SAVE_NUMBER = Number.MAX_SAFE_INTEGER;

/** localStorage persistence boundary. */
export class SaveManager {
  constructor({ storage = globalThis.localStorage, key = SAVE_KEY } = {}) {
    this.storage = storage;
    this.key = key;
  }

  load() {
    if (!this.storage) return createDefaultSave();
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return createDefaultSave();
      return this.sanitize(this.migrate(JSON.parse(raw)));
    } catch {
      return createDefaultSave();
    }
  }

  save(saveData) {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify(this.sanitize(saveData)));
      return true;
    } catch {
      return false;
    }
  }

  migrate(saveData) {
    if (!saveData || typeof saveData !== 'object') return createDefaultSave();
    if (saveData.version === SAVE_VERSION) return saveData;
    return createDefaultSave();
  }

  sanitize(saveData) {
    const defaults = createDefaultSave();
    const input = saveData && typeof saveData === 'object' ? saveData : {};

    const upgrades = Object.fromEntries(
      UPGRADE_IDS.map((id) => [id, input.upgrades?.[id] === true]),
    );
    const skills = Object.fromEntries(
      SKILL_IDS.map((id) => {
        const learned = input.skills?.[id]?.learned === true;
        const legacyActive = input.skills?.[id]?.active === true;
        const maxLevel = SKILL_BY_ID[id]?.levels.length ?? 1;
        const rawLevel = Number.isFinite(input.skills?.[id]?.level)
          ? Math.floor(input.skills[id].level)
          : learned || legacyActive
            ? 1
            : 0;
        const level = learned ? clamp(rawLevel || 1, 1, maxLevel) : 0;
        return [id, { learned, level }];
      }),
    );
    const challenges = Object.fromEntries(
      CHALLENGE_DEFINITIONS.map((definition) => {
        const record = input.challenges?.[definition.id] ?? {};
        return [definition.id, {
          bestHits: Math.floor(this.nonNegativeNumber(record.bestHits, 0)),
          damageBonus: clamp(this.numberOr(record.damageBonus, 0), 0, definition.maxDamageBonus),
          cooldownUntil: Math.floor(this.nonNegativeNumber(record.cooldownUntil, 0)),
        }];
      }),
    );

    const xp = this.nonNegativeNumber(input.xp, defaults.xp);
    const lifetimeXp = Math.max(xp, this.nonNegativeNumber(input.lifetimeXp, defaults.lifetimeXp));

    return {
      version: SAVE_VERSION,
      xp,
      lifetimeXp,
      upgrades,
      skills,
      progression: { gameCompleted: input.progression?.gameCompleted === true },
      challenges,
      gameplay: { combo: Math.floor(this.nonNegativeNumber(input.gameplay?.combo, 0)) },
      stats: this.sanitizeStats(input.stats, defaults.stats),
      settings: {
        masterVolume: clamp(this.numberOr(input.settings?.masterVolume, 1), 0, 1),
        musicVolume: clamp(this.numberOr(input.settings?.musicVolume, 1), 0, 1),
        sfxVolume: clamp(this.numberOr(input.settings?.sfxVolume, 1), 0, 1),
        haptics: typeof input.settings?.haptics === 'boolean' ? input.settings.haptics : defaults.settings.haptics,
        screenShake: typeof input.settings?.screenShake === 'boolean' ? input.settings.screenShake : defaults.settings.screenShake,
        reducedMotion: typeof input.settings?.reducedMotion === 'boolean' ? input.settings.reducedMotion : defaults.settings.reducedMotion,
      },
    };
  }

  sanitizeStats(stats, defaults) {
    return Object.fromEntries(
      Object.keys(defaults).map((key) => [key, this.nonNegativeNumber(stats?.[key], defaults[key])]),
    );
  }

  numberOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  nonNegativeNumber(value, fallback = 0) {
    return clamp(this.numberOr(value, fallback), 0, MAX_SAFE_SAVE_NUMBER);
  }

  clear() {
    try {
      this.storage?.removeItem(this.key);
      return true;
    } catch {
      return false;
    }
  }

  roundTrip(saveData) {
    return cloneData(this.sanitize(saveData));
  }
}
