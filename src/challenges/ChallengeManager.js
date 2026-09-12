import {
  CHALLENGE_BY_ID,
  CHALLENGE_DEFINITIONS,
  calculateChallengeDamageBonus,
  getTotalChallengeDamageBonus,
} from './challengeDefinitions.js';

/** Owns persistent challenge cooldowns, high scores, and permanent bonuses. */
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
    const unlocked = this.gameState.lifetimeXp >= definition.unlockLifetimeXp;
    const cooldownRemainingMs = Math.max(0, (record?.cooldownUntil ?? 0) - now);
    return {
      ok: true,
      definition,
      record,
      unlocked,
      cooldownRemainingMs,
      canStart: unlocked && cooldownRemainingMs === 0,
    };
  }

  getStatuses() {
    return CHALLENGE_DEFINITIONS.map(({ id }) => this.getStatus(id));
  }

  startAttempt(challengeId) {
    const status = this.getStatus(challengeId);
    if (!status.ok) return status;
    if (!status.unlocked) return { ok: false, reason: 'LOCKED', definition: status.definition };
    if (status.cooldownRemainingMs > 0) {
      return { ok: false, reason: 'COOLDOWN', definition: status.definition, cooldownRemainingMs: status.cooldownRemainingMs };
    }

    const cooldownUntil = this.now() + status.definition.cooldownSeconds * 1000;
    this.gameState.challenges[challengeId].cooldownUntil = cooldownUntil;
    return { ok: true, definition: status.definition, cooldownUntil };
  }

  recordResult(challengeId, hits) {
    const definition = CHALLENGE_BY_ID[challengeId];
    const record = this.getRecord(challengeId);
    if (!definition || !record) return { ok: false, reason: 'UNKNOWN_CHALLENGE' };

    const score = Number.isFinite(hits) ? Math.max(0, Math.floor(hits)) : 0;
    const earnedBonus = calculateChallengeDamageBonus(challengeId, score);
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
