import { BALANCE } from './balance.js';
import { UPGRADE_BY_ID, UPGRADE_DEFINITIONS } from './upgradeDefinitions.js';

/**
 * Owns upgrade visibility/requirements/purchases and every derived progression effect.
 */
export class ProgressionManager {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /** Convenience ownership query. */
  hasUpgrade(upgradeId) {
    return this.gameState.hasUpgrade(upgradeId);
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

  /** Rebuild every derived gameplay value from upgrade ownership. */
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
