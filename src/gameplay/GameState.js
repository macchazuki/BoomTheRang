import { createDefaultSave } from '../persistence/defaultSave.js';
import { cloneData } from '../game.js';

/**
 * Authoritative mutable run/save state.
 *
 * Derived progression effects are intentionally NOT stored here; ask
 * ProgressionManager for current boomerang count, target count, multipliers, etc.
 */
export class GameState {
  constructor(saveData = createDefaultSave()) {
    this.replaceFromSave(saveData);
  }

  /** Replace state with validated save-compatible data. */
  replaceFromSave(saveData) {
    const fresh = createDefaultSave();
    const data = { ...fresh, ...cloneData(saveData) };

    this.version = data.version;
    this.xp = data.xp;
    this.lifetimeXp = data.lifetimeXp;
    this.upgrades = { ...fresh.upgrades, ...data.upgrades };
    this.progression = { ...fresh.progression, ...data.progression };
    this.gameplay = { ...fresh.gameplay, ...data.gameplay };
    this.stats = { ...fresh.stats, ...data.stats };
    this.settings = { ...fresh.settings, ...data.settings };
  }

  /** Add earned XP to spendable and lifetime totals. */
  addXp(amount, source = 'player') {
    const integerAmount = Math.max(0, Math.round(amount));
    this.xp += integerAmount;
    this.lifetimeXp += integerAmount;

    if (source === 'dog') {
      this.stats.xpEarnedFromDog += integerAmount;
    } else {
      this.stats.xpEarnedFromPlayer += integerAmount;
    }

    return integerAmount;
  }

  /** Spend XP; lifetime XP is never reduced. */
  spendXp(amount) {
    if (!Number.isFinite(amount) || amount < 0 || this.xp < amount) {
      return false;
    }
    this.xp -= amount;
    return true;
  }

  /** Mark one known upgrade as purchased. */
  purchaseUpgrade(upgradeId) {
    if (!(upgradeId in this.upgrades) || this.upgrades[upgradeId]) {
      return false;
    }
    this.upgrades[upgradeId] = true;
    return true;
  }

  /** Read current upgrade ownership without exposing internal mutation. */
  hasUpgrade(upgradeId) {
    return this.upgrades[upgradeId] === true;
  }

  /** Set combo and update longest-combo statistic. */
  setCombo(combo) {
    this.gameplay.combo = Math.max(0, Math.floor(combo));
    this.stats.longestCombo = Math.max(this.stats.longestCombo, this.gameplay.combo);
  }

  /** Increment a numeric statistic safely. */
  incrementStat(statName, amount = 1) {
    if (!(statName in this.stats) || typeof this.stats[statName] !== 'number') {
      throw new Error(`Unknown numeric stat: ${statName}`);
    }
    this.stats[statName] = Math.max(0, this.stats[statName] + amount);
  }

  /** Apply a partial settings update. Validation/clamping happens in SaveManager on load. */
  updateSettings(partialSettings) {
    this.settings = { ...this.settings, ...partialSettings };
  }

  /** Mark the one-time Grandmaster completion flag. */
  markCompleted() {
    this.progression.gameCompleted = true;
  }

  /** Return plain serializable data suitable for SaveManager. */
  toSaveData() {
    return cloneData({
      version: this.version,
      xp: this.xp,
      lifetimeXp: this.lifetimeXp,
      upgrades: this.upgrades,
      progression: this.progression,
      gameplay: this.gameplay,
      stats: this.stats,
      settings: this.settings,
    });
  }
}
