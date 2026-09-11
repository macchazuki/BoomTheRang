import { describe, expect, it } from 'vitest';
import { simulateOptimalProgression } from './optimalProgressionSimulator.js';

const report = simulateOptimalProgression();
const minutes = (milestone) => report.milestones[milestone] / 60;

describe('optimal progression balance contract', () => {
  it('Better Training I is acquired in roughly 20 seconds', () => {
    expect(report.implemented).toBe(true);
    expect(report.completed).toBe(true);
    expect(report.milestones.betterTraining1).toBeGreaterThanOrEqual(12);
    expect(report.milestones.betterTraining1).toBeLessThanOrEqual(28);
  });

  it('Twin Throw is acquired around 9 minutes ±1 minute', () => {
    expect(minutes('twinThrow')).toBeGreaterThanOrEqual(8);
    expect(minutes('twinThrow')).toBeLessThanOrEqual(10);
  });

  it('Second Dummy is acquired around 13.5 minutes ±1.5 minutes', () => {
    expect(minutes('secondDummy')).toBeGreaterThanOrEqual(12);
    expect(minutes('secondDummy')).toBeLessThanOrEqual(15);
  });

  it('Grandmaster completion path is around 90 minutes ±8 minutes', () => {
    expect(report.completionSeconds / 60).toBeGreaterThanOrEqual(82);
    expect(report.completionSeconds / 60).toBeLessThanOrEqual(98);
  });

  it('reports the intended intermediate progression spine', () => {
    expect(minutes('dogCompanion')).toBeGreaterThanOrEqual(17);
    expect(minutes('dogCompanion')).toBeLessThanOrEqual(21);
    expect(minutes('tripleThrow')).toBeGreaterThanOrEqual(36);
    expect(minutes('tripleThrow')).toBeLessThanOrEqual(43);
    expect(minutes('thirdDummy')).toBeGreaterThanOrEqual(44);
    expect(minutes('thirdDummy')).toBeLessThanOrEqual(52);
    expect(minutes('comboTraining')).toBeGreaterThanOrEqual(52);
    expect(minutes('comboTraining')).toBeLessThanOrEqual(61);
    expect(minutes('quadThrow')).toBeGreaterThanOrEqual(61);
    expect(minutes('quadThrow')).toBeLessThanOrEqual(71);
    expect(minutes('fourthDummy')).toBeGreaterThanOrEqual(71);
    expect(minutes('fourthDummy')).toBeLessThanOrEqual(83);
  });

  it('important late progression gaps generally increase over the run', () => {
    const gaps = [
      minutes('comboTraining') - minutes('thirdDummy'),
      minutes('quadThrow') - minutes('comboTraining'),
      minutes('fourthDummy') - minutes('quadThrow'),
      report.completionSeconds / 60 - minutes('fourthDummy'),
    ];

    expect(gaps[1]).toBeGreaterThanOrEqual(gaps[0]);
    expect(gaps[2]).toBeGreaterThanOrEqual(gaps[1] - 1);
    expect(gaps[3]).toBeGreaterThan(gaps[2]);
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
