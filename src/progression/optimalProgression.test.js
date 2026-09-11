import { describe, expect, it } from 'vitest';
import { simulateOptimalProgression } from './optimalProgressionSimulator.js';

const report = simulateOptimalProgression();
const minutes = (milestone) => report.milestones[milestone] / 60;

describe('optimal progression balance contract', () => {
  it('Better Training I is acquired very early', () => {
    expect(report.implemented).toBe(true);
    expect(report.completed).toBe(true);
    expect(report.milestones.betterTraining1).toBeGreaterThanOrEqual(10);
    expect(report.milestones.betterTraining1).toBeLessThanOrEqual(30);
  });

  it('Twin Throw is acquired around the 1 minute mark', () => {
    expect(minutes('twinThrow')).toBeGreaterThanOrEqual(0.75);
    expect(minutes('twinThrow')).toBeLessThanOrEqual(1.25);
  });

  it('Second Dummy follows shortly after Twin Throw', () => {
    expect(minutes('secondDummy')).toBeGreaterThan(minutes('twinThrow'));
    expect(minutes('secondDummy')).toBeLessThanOrEqual(2.25);
  });

  it('Combo Training arrives shortly after the second target', () => {
    expect(minutes('comboTraining')).toBeGreaterThan(minutes('secondDummy'));
    expect(minutes('comboTraining')).toBeLessThanOrEqual(3);
  });

  it('keeps later multi-boomerang and multi-target progression ordered', () => {
    expect(minutes('tripleThrow')).toBeGreaterThan(minutes('comboTraining'));
    expect(minutes('thirdDummy')).toBeGreaterThan(minutes('tripleThrow'));
    expect(minutes('quadThrow')).toBeGreaterThan(minutes('thirdDummy'));
    expect(minutes('fourthDummy')).toBeGreaterThan(minutes('quadThrow'));
  });

  it('keeps the faster full progression within the intended session scale', () => {
    expect(report.completionSeconds / 60).toBeGreaterThan(30);
    expect(report.completionSeconds / 60).toBeLessThan(100);
  });

  it('fully upgraded dog remains below optimal manual earnings', () => {
    expect(report.rates.dogXpPerMinute).toBeLessThan(report.rates.whitePlayerXpPerMinute);
    expect(report.rates.whitePlayerXpPerMinute).toBeGreaterThan(report.rates.greenPlayerXpPerMinute);
  });

  it('is deterministic across runs', () => {
    const repeated = simulateOptimalProgression();
    expect(repeated.milestones).toEqual(report.milestones);
    expect(repeated.purchases).toEqual(report.purchases);
    expect(repeated.completionSeconds).toBe(report.completionSeconds);
  });
});
