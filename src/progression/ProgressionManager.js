import { BALANCE } from './balance.js';
import { SKILL_BY_ID, getSkillLevelDefinition } from './skillDefinitions.js';
import { UPGRADE_BY_ID, UPGRADE_DEFINITIONS } from './upgradeDefinitions.js';

/** Owns upgrade/skill purchases and every derived progression effect. */
export class ProgressionManager {
  constructor(gameState) {
    this.gameState = gameState;
  }

  hasUpgrade(upgradeId) { return this.gameState.hasUpgrade(upgradeId); }
  hasSkill(skillId) { return this.gameState.hasSkill(skillId); }
  getSkillLevel(skillId) { return this.gameState.getSkillLevel(skillId); }

  prerequisitesMet(upgradeId) {
    const definition = UPGRADE_BY_ID[upgradeId];
    return Boolean(definition && definition.prerequisites.every((id) => this.hasUpgrade(id)));
  }

  getPurchaseStatus(upgradeId) {
    const definition = UPGRADE_BY_ID[upgradeId];
    if (!definition) return { ok: false, reason: 'UNKNOWN_UPGRADE' };
    if (this.hasUpgrade(upgradeId)) return { ok: false, reason: 'ALREADY_PURCHASED' };
    if (!this.prerequisitesMet(upgradeId)) return { ok: false, reason: 'PREREQUISITES' };
    if (this.gameState.lifetimeXp < definition.unlockLifetimeXp) return { ok: false, reason: 'LIFETIME_XP_GATE' };
    if (this.gameState.xp < definition.costXp) return { ok: false, reason: 'INSUFFICIENT_XP' };
    return { ok: true, reason: null };
  }

  canPurchase(upgradeId) { return this.getPurchaseStatus(upgradeId).ok; }

  purchase(upgradeId) {
    const status = this.getPurchaseStatus(upgradeId);
    if (!status.ok) return status;
    const definition = UPGRADE_BY_ID[upgradeId];
    if (!this.gameState.spendXp(definition.costXp)) return { ok: false, reason: 'INSUFFICIENT_XP' };
    if (!this.gameState.purchaseUpgrade(upgradeId)) {
      this.gameState.xp += definition.costXp;
      return { ok: false, reason: 'PURCHASE_FAILED' };
    }
    return { ok: true, reason: null, upgrade: definition };
  }

  getSkillLearnStatus(skillId) {
    const definition = SKILL_BY_ID[skillId];
    if (!definition) return { ok: false, reason: 'UNKNOWN_SKILL' };
    if (this.hasSkill(skillId)) return { ok: false, reason: 'ALREADY_LEARNED' };
    if (this.gameState.xp < definition.learnCostXp) return { ok: false, reason: 'INSUFFICIENT_XP' };
    return { ok: true, reason: null };
  }

  learnSkill(skillId) {
    const status = this.getSkillLearnStatus(skillId);
    if (!status.ok) return status;
    const definition = SKILL_BY_ID[skillId];
    if (!this.gameState.spendXp(definition.learnCostXp)) return { ok: false, reason: 'INSUFFICIENT_XP' };
    if (!this.gameState.learnSkill(skillId)) {
      this.gameState.xp += definition.learnCostXp;
      return { ok: false, reason: 'LEARN_FAILED' };
    }
    return { ok: true, reason: null, skill: definition, level: 1 };
  }

  getSkillUpgradeStatus(skillId) {
    const definition = SKILL_BY_ID[skillId];
    if (!definition) return { ok: false, reason: 'UNKNOWN_SKILL' };
    if (!this.hasSkill(skillId)) return { ok: false, reason: 'NOT_LEARNED' };
    const level = this.getSkillLevel(skillId);
    if (level >= definition.levels.length) return { ok: false, reason: 'MAX_LEVEL' };
    const costXp = definition.upgradeCostsXp[level - 1];
    if (this.gameState.xp < costXp) return { ok: false, reason: 'INSUFFICIENT_XP', costXp };
    return { ok: true, reason: null, costXp };
  }

  upgradeSkill(skillId) {
    const status = this.getSkillUpgradeStatus(skillId);
    if (!status.ok) return status;
    const definition = SKILL_BY_ID[skillId];
    if (!this.gameState.spendXp(status.costXp)) return { ok: false, reason: 'INSUFFICIENT_XP' };
    if (!this.gameState.upgradeSkill(skillId, definition.levels.length)) {
      this.gameState.xp += status.costXp;
      return { ok: false, reason: 'UPGRADE_FAILED' };
    }
    return { ok: true, reason: null, skill: definition, level: this.getSkillLevel(skillId) };
  }

  getSkillRuntimeDefinition(skillId) {
    return getSkillLevelDefinition(skillId, this.getSkillLevel(skillId));
  }

  getVisibleUpgrades() {
    return UPGRADE_DEFINITIONS.filter((definition) => {
      if (definition.prerequisites.length === 0 || this.hasUpgrade(definition.id)) return true;
      return definition.prerequisites.some((id) => this.hasUpgrade(id));
    });
  }

  /** Rebuild passive gameplay values from upgrade ownership only. */
  getDerivedEffects() {
    const ownedEffects = { globalTrainingBonus: 0 };
    for (const definition of UPGRADE_DEFINITIONS) {
      if (!this.hasUpgrade(definition.id) || !definition.effectKey) continue;
      if (definition.effectKey === 'globalTrainingBonus') ownedEffects.globalTrainingBonus += definition.effectValue;
      else ownedEffects[definition.effectKey] = definition.effectValue;
    }

    const baseWidths = BALANCE.baseGaugeZoneWidths;
    const configuredGreen = ownedEffects.greenWidth ?? baseWidths.green;
    const white = ownedEffects.whiteWidth ?? baseWidths.white;
    const criticalLayerCount = ownedEffects.criticalLayerCount ?? 1;
    const green = configuredGreen - (white - baseWidths.white);
    const red = 1 - green - white;

    return {
      globalTrainingMultiplier: 1 + ownedEffects.globalTrainingBonus,
      criticalMultiplier: ownedEffects.criticalMultiplier ?? BALANCE.baseCriticalMultiplier,
      criticalLayerCount,
      missReloadSeconds: ownedEffects.missReloadSeconds ?? BALANCE.missReloadSeconds,
      gaugeZoneWidths: { red, green, white, criticalLayerCount },
      playerBoomerangCount: Math.min(ownedEffects.playerBoomerangs ?? BALANCE.basePlayerBoomerangs, BALANCE.maxPlayerBoomerangs),
      targetCount: Math.min(ownedEffects.targets ?? BALANCE.baseTargets, BALANCE.maxTargets),
      comboUnlocked: ownedEffects.comboUnlocked === true,
      comboMaxBonus: ownedEffects.comboMaxBonus ?? BALANCE.comboBaseMaxBonus,
      boomerangMasteryMultiplier: ownedEffects.boomerangMasteryMultiplier ?? 1,
      dogUnlocked: ownedEffects.dogUnlocked === true,
      dogXpFactor: ownedEffects.dogXpFactor ?? BALANCE.dogBaseXpFactor,
      dogIntervalSeconds: Math.max(ownedEffects.dogIntervalSeconds ?? BALANCE.dogBaseIntervalSeconds, BALANCE.dogMinimumIntervalSeconds),
      dogCriticalChance: ownedEffects.dogCriticalChance ?? 0,
      finalChallengeUnlocked: ownedEffects.finalChallenge === true,
    };
  }
}
