import { describe, expect, it } from 'vitest';
import { ChallengeManager } from './ChallengeManager.js';
import {
  calculateChallengeDamageBonus,
  createDefaultChallengeRecords,
  getChallengeGaugeOneWaySeconds,
} from './challengeDefinitions.js';

function createState({ lifetimeXp = 0 } = {}) {
  return { lifetimeXp, challenges: createDefaultChallengeRecords() };
}

describe('ChallengeManager', () => {
  it('puts a challenge on cooldown as soon as an attempt starts', () => {
    const now = 1_000_000;
    const gameState = createState();
    const manager = new ChallengeManager(gameState, { now: () => now });

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

  it('locks later challenges behind lifetime XP', () => {
    const manager = new ChallengeManager(createState({ lifetimeXp: 24_999 }));
    expect(manager.getStatus('pressureTrial').unlocked).toBe(false);
    expect(manager.startAttempt('pressureTrial')).toMatchObject({ ok: false, reason: 'LOCKED' });
  });

  it('accelerates with hits but never makes the base gauge faster than 0.10 seconds', () => {
    expect(getChallengeGaugeOneWaySeconds('speedTrial', 0)).toBeCloseTo(1.35);
    expect(getChallengeGaugeOneWaySeconds('speedTrial', 10)).toBeLessThan(1.35);
    expect(getChallengeGaugeOneWaySeconds('masterTrial', 10_000)).toBe(0.10);
  });
});
