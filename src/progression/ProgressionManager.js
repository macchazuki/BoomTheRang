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
      // Defensive rollback. This branch should be unreachable after status check.
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

  /**
   * Rebuild every derived gameplay value from upgrade ownership.
   * This is deliberately explicit: it keeps save files stable and makes effects testable.
   */
  getDerivedEffects() {
    const has = (id) => this.hasUpgrade(id);

    const globalTrainingMultiplier =
      1 +
      (has('betterTraining1') ? 0.20 : 0) +
      (has('betterTraining2') ? 0.25 : 0) +
      (has('betterTraining3') ? 0.35 : 0);

    const criticalMultiplier = has('criticalMastery')
      ? 3
      : has('criticalTraining2')
        ? 2.5
        : has('criticalTraining1')
          ? 2.25
          : BALANCE.baseCriticalMultiplier;

    const missReloadSeconds = has('recoveryMastery')
      ? 2
      : has('quickReload3')
        ? 3
        : has('quickReload2')
          ? 4
          : has('quickReload1')
            ? 4.5
            : BALANCE.missReloadSeconds;

    const playerBoomerangCount = has('quadThrow')
      ? 4
      : has('tripleThrow')
        ? 3
        : has('twinThrow')
          ? 2
          : BALANCE.basePlayerBoomerangs;

    const targetCount = has('fourthDummy')
      ? 4
      : has('thirdDummy')
        ? 3
        : has('secondDummy')
          ? 2
          : BALANCE.baseTargets;

    const greenTotal = has('steadyHands2') ? 0.30 : has('steadyHands1') ? 0.27 : 0.25;
    const white = has('perfectWindow2') ? 0.07 : has('perfectWindow1') ? 0.06 : 0.05;

    // Perfect Window takes its added width equally from the currently configured green total.
    const green = greenTotal - (white - 0.05);
    const red = 1 - green - white;

    const dogXpFactor = has('dogTraining3')
      ? 1
      : has('dogTraining2')
        ? 0.60
        : has('dogTraining1')
          ? 0.40
          : BALANCE.dogBaseXpFactor;

    const dogIntervalSeconds = has('fastFetch3')
      ? 4
      : has('fastFetch2')
        ? 6
        : has('fastFetch1')
          ? 8
          : BALANCE.dogBaseIntervalSeconds;

    return {
      globalTrainingMultiplier,
      criticalMultiplier,
      missReloadSeconds,
      gaugeZoneWidths: { red, green, white },
      playerBoomerangCount,
      targetCount,

      comboUnlocked: has('comboTraining'),
      comboMaxBonus: has('comboMastery')
        ? BALANCE.comboMasteryMaxBonus
        : BALANCE.comboBaseMaxBonus,

      boomerangMasteryMultiplier: has('boomerangMastery')
        ? BALANCE.boomerangMasteryMultiplier
        : 1,

      dogUnlocked: has('dogCompanion'),
      dogXpFactor,
      dogIntervalSeconds,
      dogCriticalChance: has('fetchMastery') ? BALANCE.dogCriticalChance : 0,

      finalChallengeUnlocked: has('grandmaster'),
    };
  }
}
