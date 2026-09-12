import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance.js';
import { simulateOptimalProgression } from './optimalProgressionSimulator.js';

describe('Fortune Mill-style progression rescale', () => {
  it('keeps the early critical branch reachable within five minutes of perfect play', () => {
    const report = simulateOptimalProgression({
      route: [
        'betterTraining1',
        'betterTraining2',
        'criticalTraining1',
        'megaCritical',
      ],
    });

    expect(report.milestones.megaCritical / 60).toBeLessThanOrEqual(5);
  });

  it('widens costs from cheap early unlocks into a steep late-game climb', () => {
    const costs = BALANCE.upgradeCosts;

    expect(costs.betterTraining1).toBeLessThan(costs.twinThrow);
    expect(costs.twinThrow).toBeLessThan(costs.dogCompanion);
    expect(costs.dogCompanion).toBeLessThan(costs.tripleThrow);
    expect(costs.tripleThrow).toBeLessThan(costs.quadThrow);
    expect(costs.quadThrow).toBeLessThan(costs.comboMastery);
    expect(costs.comboMastery).toBeLessThan(costs.grandmaster);
    expect(costs.grandmaster).toBe(1_000_000);
  });

  it('spaces higher critical tiers progressively farther apart', () => {
    const costs = BALANCE.upgradeCosts;

    expect(costs.megaCritical).toBeLessThan(costs.ultraCritical);
    expect(costs.ultraCritical).toBeLessThan(costs.omegaCritical);
  });
});
