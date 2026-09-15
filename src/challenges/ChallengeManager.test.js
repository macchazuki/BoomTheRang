import { describe, expect, it } from 'vitest';
import { ChallengeManager } from './ChallengeManager.js';
import {
  CHALLENGE_DEFINITIONS,
  calculateChallengeDamageBonus,
  createDefaultChallengeRecords,
  getChallengeGaugeOneWaySeconds,
} from './challengeDefinitions.js';

function createState({ xp = 0, lifetimeXp = 0 } = {}) {
  return {
    xp,
    lifetimeXp,
    challenges: createDefaultChallengeRecords(),
    spendXp(amount) {
      if (this.xp < amount) return false;
      this.xp -= amount;
      return true;
    },
  };
}

describe('ChallengeManager', () => {
  it('exposes only the speed and blind base challenges', () => {
    expect(CHALLENGE_DEFINITIONS.map(({ id }) => id)).toEqual(['speedTrial', 'blindTrial']);
  });

  it('starts every challenge locked and requires an XP unlock purchase', () => {
    const gameState = createState({ xp: 2_500 });
    const manager = new ChallengeManager(gameState);

    expect(manager.getStatus('speedTrial').unlocked).toBe(false);
    expect(manager.startAttempt('speedTrial')).toMatchObject({ ok: false, reason: 'LOCKED' });

    expect(manager.unlock('speedTrial').ok).toBe(true);
    expect(gameState.xp).toBe(0);
    expect(gameState.challenges.speedTrial).toMatchObject({ unlocked: true, level: 1 });
  });

  it('upgrades Speed Trial with slower acceleration instead of harder challenge tiers', () => {
    const gameState = createState({ xp: 130_000, lifetimeXp: 200_000 });
    const manager = new ChallengeManager(gameState);
    manager.unlock('speedTrial');

    const control1 = manager.upgrade('speedTrial');
    expect(control1).toMatchObject({ ok: true, level: 2 });
    expect(control1.effectiveDefinition.tierName).toBe('Speed Control I');

    const control2 = manager.upgrade('speedTrial');
    expect(control2).toMatchObject({ ok: true, level: 3 });
    expect(control2.effectiveDefinition.tierName).toBe('Speed Control II');
    expect(gameState.challenges.speedTrial.level).toBe(3);
    expect(manager.getStatuses()).toHaveLength(2);
  });

  it('keeps Speed Trial upgrades behind their lifetime XP gates', () => {
    const gameState = createState({ xp: 30_000, lifetimeXp: 24_999 });
    const manager = new ChallengeManager(gameState);
    manager.unlock('speedTrial');

    expect(manager.getStatus('speedTrial').meetsUpgradeLifetimeXp).toBe(false);
    expect(manager.upgrade('speedTrial')).toMatchObject({ ok: false, reason: 'LIFETIME_XP_GATE' });
  });

  it('puts an unlocked challenge on a 30 minute cooldown as soon as an attempt starts', () => {
    const now = 1_000_000;
    const gameState = createState({ xp: 2_500 });
    const manager = new ChallengeManager(gameState, { now: () => now });
    manager.unlock('speedTrial');

    const result = manager.startAttempt('speedTrial');

    expect(result.ok).toBe(true);
    expect(gameState.challenges.speedTrial.cooldownUntil).toBe(now + 30 * 60 * 1000);
    expect(manager.getStatus('speedTrial').canStart).toBe(false);
  });

  it('does not let a worse score reduce the saved high score or damage bonus', () => {
    const gameState = createState();
    const manager = new ChallengeManager(gameState);

    const best = manager.recordResult('speedTrial', 80);
    const worse = manager.recordResult('speedTrial', 20);

    expect(best.improved).toBe(true);
    expect(worse.improved).toBe(false);
    expect(worse.bestHits).toBe(80);
    expect(worse.damageBonus).toBe(calculateChallengeDamageBonus('speedTrial', 80));
  });

  it('makes each Speed Trial upgrade reduce acceleration', () => {
    const baseAtTenHits = getChallengeGaugeOneWaySeconds('speedTrial', 10, 1);
    const control1AtTenHits = getChallengeGaugeOneWaySeconds('speedTrial', 10, 2);
    const control2AtTenHits = getChallengeGaugeOneWaySeconds('speedTrial', 10, 3);

    expect(getChallengeGaugeOneWaySeconds('speedTrial', 0, 1)).toBeCloseTo(1.35);
    expect(control1AtTenHits).toBeGreaterThan(baseAtTenHits);
    expect(control2AtTenHits).toBeGreaterThan(control1AtTenHits);
    expect(getChallengeGaugeOneWaySeconds('speedTrial', 10_000, 3)).toBe(0.10);
  });
});
