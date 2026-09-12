import { BALANCE } from './balance.js';
import { SKILL_BY_ID, SKILL_DEFINITIONS } from './skillDefinitions.js';
import { UPGRADE_BY_ID, UPGRADE_DEFINITIONS } from './upgradeDefinitions.js';

/**
 * Owns upgrade/skill purchases and every derived progression effect.
 */
export class ProgressionManager {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /** Convenience upgrade ownership query. */
  hasUpgrade(upgradeId) {
    return this.gameState.hasUpgrade(upgradeId);
  }

  /** Convenience learned-skill query. */
  hasSkill(skillId) {
    return this.gameState.hasSkill(skillId);
  }

  /** Convenience active-skill query. */
  isSkillActive(skillId) {
    return this.gameState.isSkillActive(skillId);
  }

  /** Return whether every prerequisite is already purchased. */
  prerequisitesMet(upgradeId) {
    const definition = UPGRADE_BY_ID[upgradeId];
    if (!definition) return false;
    return definition.prerequisites.every((id) => this.hasUpgrade(id));
  }

  /** Return a structured reason used by UI/tests instead of duplicating checks. */
  getPurchaseStatus(upgradeId) {
    const definition = UPGRADE_BY_ID[upgradeId];

    if (!definition) return { ok: false, reason: 'UNKNOWN_UPGRADE' };
    if (this.hasUpgrade(upgradeId)) return { ok: false, reason: 'ALREADY_PURCHASED' };
    if (!this.prerequisitesMet(upgradeId)) return { ok: false, reason: 'PREREQUISITES' };
    if (this.gameState.lifetimeXp < definition.unlockLifetimeXp) {
      return { ok: false, reason: 'LIFETIME_XP_GATE' };
    }
    if (this.gameState.xp < definition.costXp) return { ok: false, reason: 'INSUFFICIENT_XP' };

    return { ok: true, reason: null };
  }

  /** Whether the upgrade can be purchased now. */
  canPurchase(upgradeId) {
    return this.getPurchaseStatus(upgradeId).ok;
  }

  /** Transactionally deduct XP and mark an upgrade purchased. */
  purchase(upgradeId) {
    const status = this.getPurchaseStatus(upgradeId);
    if (!status.ok) return status;

    const definition = UPGRADE_BY_ID[upgradeId];
    if (!this.gameState.spendXp(definition.costXp)) {
      return { ok: false, reason: 'INSUFFICIENT_XP' };
    }

    if (!this.gameState.purchaseUpgrade(upgradeId)) {
      this.gameState.xp += definition.costXp;
      return { ok: false, reason: 'PURCHASE_FAILED' };
    }

    return { ok: true, reason: null, upgrade: definition };
  }

  /** Return whether an active skill can be learned now. */
  getSkillLearnStatus(skillId) {
    const definition = SKILL_BY_ID[skillId];
    if (!definition) return { ok: false, reason: 'UNKNOWN_SKILL' };
    if (this.hasSkill(skillId)) return { ok: false, reason: 'ALREADY_LEARNED' };
    if (this.gameState.xp < definition.costXp) return { ok: false, reason: 'INSUFFICIENT_XP' };
    return { ok: true, reason: null };
  }

  /** Transactionally learn a skill; newly learned skills start active. */
  learnSkill(skillId) {
    const status = this.getSkillLearnStatus(skillId);
    if (!status.ok) return status;

    const definition = SKILL_BY_ID[skillId];
    if (!this.gameState.spendXp(definition.costXp)) {
      return { ok: false, reason: 'INSUFFICIENT_XP' };
    }

    if (!this.gameState.learnSkill(skillId)) {
      this.gameState.xp += definition.costXp;
      return { ok: false, reason: 'LEARN_FAILED' };
    }

    return { ok: true, reason: null, skill: definition };
  }

  /** Enable or disable a learned active skill. */
  setSkillActive(skillId, active) {
    if (!SKILL_BY_ID[skillId]) return { ok: false, reason: 'UNKNOWN_SKILL' };
    if (!this.hasSkill(skillId)) return { ok: false, reason: 'NOT_LEARNED' };
    if (!this.gameState.setSkillActive(skillId, active)) {
      return { ok: false, reason: 'ACTIVATION_FAILED' };
    }
    return { ok: true, reason: null, active: this.isSkillActive(skillId) };
  }

  /**
   * Return upgrades that UI may show.
   * Purchased upgrades are retained; future nodes appear when their direct branch is reachable.
   */
  getVisibleUpgrades() {
    return UPGRADE_DEFINITIONS.filter((definition) => {
      if (definition.prerequisites.length === 0) return true;
      if (this.hasUpgrade(definition.id)) return true;
      return definition.prerequisites.some((id) => this.hasUpgrade(id));
    });
  }

  /** Rebuild every derived gameplay value from upgrade and active-skill ownership. */
  getDerivedEffects() {
    const ownedEffects = { globalTrainingBonus: 0 };

    for (const definition of UPGRADE_DEFINITIONS) {
      if (!this.hasUpgrade(definition.id) || !definition.effectKey) continue;

      if (definition.effectKey === 'globalTrainingBonus') {
        ownedEffects.globalTrainingBonus += definition.effectValue;
      } else {
        ownedEffects[definition.effectKey] = definition.effectValue;
      }
    }

    let missReturnChance = 0;
    let gaugeSpeedMultiplier = 1;
    let autoFirstBoomerang = false;
    for (const definition of SKILL_DEFINITIONS) {
      if (!this.isSkillActive(definition.id)) continue;
      missReturnChance = Math.max(
        missReturnChance,
        definition.effects.missReturnChance ?? 0,
      );
      gaugeSpeedMultiplier *= definition.effects.gaugeSpeedMultiplier ?? 1;
      autoFirstBoomerang ||= definition.effects.autoFirstBoomerang === true;
    }

    const baseWidths = BALANCE.baseGaugeZoneWidths;
    const configuredGreen = ownedEffects.greenWidth ?? baseWidths.green;
    const white = ownedEffects.whiteWidth ?? baseWidths.white;
    const criticalLayerCount = ownedEffects.criticalLayerCount ?? 1;

    // Perfect Window widens the base crit band by taking the same amount from green.
    // Higher crit upgrades add same-width nested bands and push earlier crit bands outward.
    const green = configuredGreen - (white - baseWidths.white);
    const red = 1 - green - white;

    return {
      globalTrainingMultiplier: 1 + ownedEffects.globalTrainingBonus,
      criticalMultiplier: ownedEffects.criticalMultiplier ?? BALANCE.baseCriticalMultiplier,
      criticalLayerCount,
      missReloadSeconds: ownedEffects.missReloadSeconds ?? BALANCE.missReloadSeconds,
      missReturnChance,
      gaugeSpeedMultiplier,
      autoFirstBoomerang,
      gaugeZoneWidths: { red, green, white, criticalLayerCount },
      playerBoomerangCount: Math.min(
        ownedEffects.playerBoomerangs ?? BALANCE.basePlayerBoomerangs,
        BALANCE.maxPlayerBoomerangs,
      ),
      targetCount: Math.min(ownedEffects.targets ?? BALANCE.baseTargets, BALANCE.maxTargets),

      comboUnlocked: ownedEffects.comboUnlocked === true,
      comboMaxBonus: ownedEffects.comboMaxBonus ?? BALANCE.comboBaseMaxBonus,

      boomerangMasteryMultiplier: ownedEffects.boomerangMasteryMultiplier ?? 1,

      dogUnlocked: ownedEffects.dogUnlocked === true,
      dogXpFactor: ownedEffects.dogXpFactor ?? BALANCE.dogBaseXpFactor,
      dogIntervalSeconds: Math.max(
        ownedEffects.dogIntervalSeconds ?? BALANCE.dogBaseIntervalSeconds,
        BALANCE.dogMinimumIntervalSeconds,
      ),
      dogCriticalChance: ownedEffects.dogCriticalChance ?? 0,

      finalChallengeUnlocked: ownedEffects.finalChallenge === true,
    };
  }
}
