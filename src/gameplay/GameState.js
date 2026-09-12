import { createDefaultSave } from '../persistence/defaultSave.js';
import { cloneData } from '../game.js';

/** Authoritative mutable run/save state. */
export class GameState {
  constructor(saveData = createDefaultSave()) {
    this.replaceFromSave(saveData);
  }

  replaceFromSave(saveData) {
    const fresh = createDefaultSave();
    const data = { ...fresh, ...cloneData(saveData) };

    this.version = data.version;
    this.xp = data.xp;
    this.lifetimeXp = data.lifetimeXp;
    this.upgrades = { ...fresh.upgrades, ...data.upgrades };
    this.skills = Object.fromEntries(
      Object.entries(fresh.skills).map(([skillId, defaults]) => [
        skillId,
        { ...defaults, ...(data.skills?.[skillId] ?? {}) },
      ]),
    );
    this.progression = { ...fresh.progression, ...data.progression };
    this.gameplay = { ...fresh.gameplay, ...data.gameplay };
    this.stats = { ...fresh.stats, ...data.stats };
    this.settings = { ...fresh.settings, ...data.settings };
  }

  addXp(amount, source = 'player') {
    const integerAmount = Math.max(0, Math.round(amount));
    this.xp += integerAmount;
    this.lifetimeXp += integerAmount;
    if (source === 'dog') this.stats.xpEarnedFromDog += integerAmount;
    else this.stats.xpEarnedFromPlayer += integerAmount;
    return integerAmount;
  }

  spendXp(amount) {
    if (!Number.isFinite(amount) || amount < 0 || this.xp < amount) return false;
    this.xp -= amount;
    return true;
  }

  purchaseUpgrade(upgradeId) {
    if (!(upgradeId in this.upgrades) || this.upgrades[upgradeId]) return false;
    this.upgrades[upgradeId] = true;
    return true;
  }

  hasUpgrade(upgradeId) {
    return this.upgrades[upgradeId] === true;
  }

  learnSkill(skillId) {
    const skill = this.skills[skillId];
    if (!skill || skill.learned) return false;
    this.skills[skillId] = { learned: true, level: 1 };
    return true;
  }

  hasSkill(skillId) {
    return this.skills[skillId]?.learned === true;
  }

  getSkillLevel(skillId) {
    return this.hasSkill(skillId) ? Math.max(1, Math.floor(this.skills[skillId]?.level ?? 1)) : 0;
  }

  upgradeSkill(skillId, maxLevel) {
    if (!this.hasSkill(skillId)) return false;
    const level = this.getSkillLevel(skillId);
    if (level >= maxLevel) return false;
    this.skills[skillId] = { learned: true, level: level + 1 };
    return true;
  }

  setCombo(combo) {
    this.gameplay.combo = Math.max(0, Math.floor(combo));
    this.stats.longestCombo = Math.max(this.stats.longestCombo, this.gameplay.combo);
  }

  incrementStat(statName, amount = 1) {
    if (!(statName in this.stats) || typeof this.stats[statName] !== 'number') {
      throw new Error(`Unknown numeric stat: ${statName}`);
    }
    this.stats[statName] = Math.max(0, this.stats[statName] + amount);
  }

  updateSettings(partialSettings) {
    this.settings = { ...this.settings, ...partialSettings };
  }

  markCompleted() {
    this.progression.gameCompleted = true;
  }

  toSaveData() {
    return cloneData({
      version: this.version,
      xp: this.xp,
      lifetimeXp: this.lifetimeXp,
      upgrades: this.upgrades,
      skills: this.skills,
      progression: this.progression,
      gameplay: this.gameplay,
      stats: this.stats,
      settings: this.settings,
    });
  }
}
