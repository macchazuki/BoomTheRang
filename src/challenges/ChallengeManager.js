import {
  CHALLENGE_BY_ID,
  CHALLENGE_DEFINITIONS,
  calculateChallengeDamageBonus,
  getChallengeLevelDefinition,
  getTotalChallengeDamageBonus,
} from './challengeDefinitions.js';

/** Owns persistent challenge unlocks, upgrades, cooldowns, high scores, and permanent bonuses. */
export class ChallengeManager {
  constructor(gameState, { now = () => Date.now() } = {}) {
    this.gameState = gameState;
    this.now = now;
  }

  getRecord(challengeId) {
    return this.gameState.challenges?.[challengeId] ?? null;
  }

  getStatus(challengeId) {
    const definition = CHALLENGE_BY_ID[challengeId];
    if (!definition) return { ok: false, reason: 'UNKNOWN_CHALLENGE' };
    const record = this.getRecord(challengeId);
    const now = this.now();
    const unlocked = record?.unlocked === true;
    const level = unlocked ? Math.max(1, Math.min(definition.levels.length, Math.floor(record?.level || 1))) : 0;
    const effectiveDefinition = getChallengeLevelDefinition(challengeId, Math.max(1, level));
    const nextLevelDefinition = level > 0 && level < definition.levels.length
      ? getChallengeLevelDefinition(challengeId, level + 1)
      : null;
    const meetsLifetimeXp = this.gameState.lifetimeXp >= definition.levels[0].unlockLifetimeXp;
    const canAffordUnlock = this.gameState.xp >= definition.levels[0].unlockCostXp;
    const meetsUpgradeLifetimeXp = nextLevelDefinition
      ? this.gameState.lifetimeXp >= nextLevelDefinition.unlockLifetimeXp
      : false;
    const canAffordUpgrade = nextLevelDefinition
      ? this.gameState.xp >= nextLevelDefinition.unlockCostXp
      : false;
    const cooldownRemainingMs = Math.max(0, (record?.cooldownUntil ?? 0) - now);

    return {
      ok: true,
      definition,
      effectiveDefinition,
      nextLevelDefinition,
      record,
      unlocked,
      level,
      maxLevel: definition.levels.length,
      meetsLifetimeXp,
      canAffordUnlock,
      canUnlock: !unlocked && meetsLifetimeXp && canAffordUnlock,
      meetsUpgradeLifetimeXp,
      canAffordUpgrade,
      canUpgrade: unlocked && Boolean(nextLevelDefinition) && meetsUpgradeLifetimeXp && canAffordUpgrade,
      cooldownRemainingMs,
      canStart: unlocked && cooldownRemainingMs === 0,
    };
  }

  getStatuses() {
    return CHALLENGE_DEFINITIONS.map(({ id }) => this.getStatus(id));
  }

  unlock(challengeId) {
    const status = this.getStatus(challengeId);
    if (!status.ok) return status;
    if (status.unlocked) return { ok: false, reason: 'ALREADY_UNLOCKED', definition: status.definition };
    if (!status.meetsLifetimeXp) return { ok: false, reason: 'LIFETIME_XP_GATE', definition: status.definition };
    const costXp = status.definition.levels[0].unlockCostXp;
    if (!this.gameState.spendXp(costXp)) {
      return { ok: false, reason: 'INSUFFICIENT_XP', definition: status.definition };
    }
    this.gameState.challenges[challengeId].unlocked = true;
    this.gameState.challenges[challengeId].level = 1;
    return { ok: true, definition: status.definition, level: 1 };
  }

  upgrade(challengeId) {
    const status = this.getStatus(challengeId);
    if (!status.ok) return status;
    if (!status.unlocked) return { ok: false, reason: 'LOCKED', definition: status.definition };
    if (!status.nextLevelDefinition) return { ok: false, reason: 'MAX_LEVEL', definition: status.definition };
    if (!status.meetsUpgradeLifetimeXp) {
      return { ok: false, reason: 'LIFETIME_XP_GATE', definition: status.definition };
    }
    if (!this.gameState.spendXp(status.nextLevelDefinition.unlockCostXp)) {
      return { ok: false, reason: 'INSUFFICIENT_XP', definition: status.definition };
    }

    this.gameState.challenges[challengeId].level = status.level + 1;
    return {
      ok: true,
      definition: status.definition,
      effectiveDefinition: getChallengeLevelDefinition(challengeId, status.level + 1),
      level: status.level + 1,
    };
  }

  startAttempt(challengeId) {
    const status = this.getStatus(challengeId);
    if (!status.ok) return status;
    if (!status.unlocked) return { ok: false, reason: 'LOCKED', definition: status.definition };
    if (status.cooldownRemainingMs > 0) {
      return {
        ok: false,
        reason: 'COOLDOWN',
        definition: status.effectiveDefinition,
        cooldownRemainingMs: status.cooldownRemainingMs,
      };
    }

    const cooldownUntil = this.now() + status.effectiveDefinition.cooldownSeconds * 1000;
    this.gameState.challenges[challengeId].cooldownUntil = cooldownUntil;
    return { ok: true, definition: status.effectiveDefinition, cooldownUntil };
  }

  recordResult(challengeId, hits) {
    const baseDefinition = CHALLENGE_BY_ID[challengeId];
    const record = this.getRecord(challengeId);
    if (!baseDefinition || !record) return { ok: false, reason: 'UNKNOWN_CHALLENGE' };

    const level = Math.max(1, Math.min(baseDefinition.levels.length, Math.floor(record.level || 1)));
    const definition = getChallengeLevelDefinition(challengeId, level);
    const score = Number.isFinite(hits) ? Math.max(0, Math.floor(hits)) : 0;
    const earnedBonus = calculateChallengeDamageBonus(challengeId, score, level);
    const improved = score > record.bestHits;
    if (improved) {
      record.bestHits = score;
      record.damageBonus = Math.max(record.damageBonus, earnedBonus);
    }

    return {
      ok: true,
      definition,
      hits: score,
      earnedBonus,
      improved,
      bestHits: record.bestHits,
      damageBonus: record.damageBonus,
    };
  }

  getTotalDamageBonus() {
    return getTotalChallengeDamageBonus(this.gameState.challenges);
  }
}
