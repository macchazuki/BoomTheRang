import { clamp, cloneData } from '../game.js';
import { SAVE_KEY, SAVE_VERSION, createDefaultSave } from './defaultSave.js';
import { UPGRADE_IDS } from '../progression/upgradeDefinitions.js';
import { SKILL_IDS } from '../progression/skillDefinitions.js';

const MAX_SAFE_SAVE_NUMBER = Number.MAX_SAFE_INTEGER;

/**
 * localStorage persistence boundary.
 *
 * Malformed data must never prevent game startup. Unknown upgrade/skill IDs are ignored;
 * missing fields are filled from current defaults.
 */
export class SaveManager {
  constructor({ storage = globalThis.localStorage, key = SAVE_KEY } = {}) {
    this.storage = storage;
    this.key = key;
  }

  /** Load, parse, migrate, and sanitize save; return defaults on unrecoverable input. */
  load() {
    if (!this.storage) return createDefaultSave();

    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return createDefaultSave();

      const parsed = JSON.parse(raw);
      const migrated = this.migrate(parsed);
      return this.sanitize(migrated);
    } catch {
      return createDefaultSave();
    }
  }

  /** Serialize a sanitized snapshot. Return false instead of throwing on storage failure. */
  save(saveData) {
    if (!this.storage) return false;

    try {
      const sanitized = this.sanitize(saveData);
      this.storage.setItem(this.key, JSON.stringify(sanitized));
      return true;
    } catch {
      return false;
    }
  }

  /** Explicit schema-version migration switch. */
  migrate(saveData) {
    if (!saveData || typeof saveData !== 'object') {
      return createDefaultSave();
    }

    if (saveData.version === SAVE_VERSION) return saveData;

    // TODO future schema:
    // if (saveData.version === 1) return migrateV1ToV2(saveData);
    return createDefaultSave();
  }

  /** Merge allowed fields with defaults and clamp unsafe numeric values. */
  sanitize(saveData) {
    const defaults = createDefaultSave();
    const input = saveData && typeof saveData === 'object' ? saveData : {};

    const upgrades = Object.fromEntries(
      UPGRADE_IDS.map((id) => [id, input.upgrades?.[id] === true]),
    );
    const skills = Object.fromEntries(
      SKILL_IDS.map((id) => {
        const learned = input.skills?.[id]?.learned === true;
        return [
          id,
          {
            learned,
            active: learned && input.skills?.[id]?.active === true,
          },
        ];
      }),
    );

    const xp = this.nonNegativeNumber(input.xp, defaults.xp);
    const lifetimeXp = Math.max(
      xp,
      this.nonNegativeNumber(input.lifetimeXp, defaults.lifetimeXp),
    );

    return {
      version: SAVE_VERSION,
      xp,
      lifetimeXp,
      upgrades,
      skills,
      progression: {
        gameCompleted: input.progression?.gameCompleted === true,
      },
      gameplay: {
        combo: Math.floor(this.nonNegativeNumber(input.gameplay?.combo, 0)),
      },
      stats: this.sanitizeStats(input.stats, defaults.stats),
      settings: {
        masterVolume: clamp(this.numberOr(input.settings?.masterVolume, 1), 0, 1),
        musicVolume: clamp(this.numberOr(input.settings?.musicVolume, 1), 0, 1),
        sfxVolume: clamp(this.numberOr(input.settings?.sfxVolume, 1), 0, 1),
        haptics:
          typeof input.settings?.haptics === 'boolean'
            ? input.settings.haptics
            : defaults.settings.haptics,
        screenShake:
          typeof input.settings?.screenShake === 'boolean'
            ? input.settings.screenShake
            : defaults.settings.screenShake,
        reducedMotion:
          typeof input.settings?.reducedMotion === 'boolean'
            ? input.settings.reducedMotion
            : defaults.settings.reducedMotion,
      },
    };
  }

  /** Sanitize known numeric statistic fields only. */
  sanitizeStats(stats, defaults) {
    return Object.fromEntries(
      Object.keys(defaults).map((key) => [
        key,
        this.nonNegativeNumber(stats?.[key], defaults[key]),
      ]),
    );
  }

  /** Return fallback unless value is finite. */
  numberOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  /** Return a finite, non-negative number within the safe persisted range. */
  nonNegativeNumber(value, fallback = 0) {
    return clamp(this.numberOr(value, fallback), 0, MAX_SAFE_SAVE_NUMBER);
  }

  /** Remove the local save, mainly for development/manual reset UI. */
  clear() {
    try {
      this.storage?.removeItem(this.key);
      return true;
    } catch {
      return false;
    }
  }

  /** Return a defensive snapshot useful for debugging/tests. */
  roundTrip(saveData) {
    return cloneData(this.sanitize(saveData));
  }
}