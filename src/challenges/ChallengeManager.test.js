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

  it('upgrades Speed Trial through Pressure and Master tiers on the same record', () => {
    const gameState = createState({ xp: 130_000, lifetimeXp: 200_000 });
    const manager = new ChallengeManager(gameState);
    manager.unlock('speedTrial');

    const pressure = manager.upgrade('speedTrial');
    expect(pressure).toMatchObject({ ok: true, level: 2 });
    expect(pressure.effectiveDefinition.tierName).toBe('Pressure Trial');

    const master = manager.upgrade('speedTrial');
    expect(master).toMatchObject({ ok: true, level: 3 });
    expect(master.effectiveDefinition.tierName).toBe('Master Trial');
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

  it('puts an unlocked challenge on the active tier cooldown as soon as an attempt starts', () => {
    const now = 1_000_000;
    const gameState = createState({ xp: 2_500 });
    const manager = new ChallengeManager(gameState, { now: () => now });
    manager.unlock('speedTrial');

    const result = manager.startAttempt('speedTrial');

    expect(result.ok).toBe(true);
    expect(gameState.challenges.speedTrial.cooldownUntil).toBe(now + 6 * 60 * 60 * 1000);
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

  it('uses the upgraded Speed tier for gauge acceleration', () => {
    expect(getChallengeGaugeOneWaySeconds('speedTrial', 0, 1)).toBeCloseTo(1.35);
    expect(getChallengeGaugeOneWaySeconds('speedTrial', 10, 2)).toBeLessThan(
      getChallengeGaugeOneWaySeconds('speedTrial', 10, 1),
    );
    expect(getChallengeGaugeOneWaySeconds('speedTrial', 10_000, 3)).toBe(0.10);
  });
});
