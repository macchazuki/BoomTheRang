import { describe, expect, it } from 'vitest';
import { simulateOptimalProgression } from './optimalProgressionSimulator.js';

const report = simulateOptimalProgression();
const minutes = (milestone) => report.milestones[milestone] / 60;

describe('optimal progression balance contract', () => {
  it('Better Training I is acquired in roughly 40 seconds', () => {
    expect(report.implemented).toBe(true);
    expect(report.completed).toBe(true);
    expect(report.milestones.betterTraining1).toBeGreaterThanOrEqual(25);
    expect(report.milestones.betterTraining1).toBeLessThanOrEqual(55);
  });

  it('Twin Throw is acquired around 18 minutes ±2 minutes', () => {
    expect(minutes('twinThrow')).toBeGreaterThanOrEqual(16);
    expect(minutes('twinThrow')).toBeLessThanOrEqual(20);
  });

  it('Second Dummy is acquired around 27 minutes ±3 minutes', () => {
    expect(minutes('secondDummy')).toBeGreaterThanOrEqual(24);
    expect(minutes('secondDummy')).toBeLessThanOrEqual(30);
  });

  it('Grandmaster completion path is around 180 minutes ±15 minutes', () => {
    expect(report.completionSeconds / 60).toBeGreaterThanOrEqual(165);
    expect(report.completionSeconds / 60).toBeLessThanOrEqual(195);
  });

  it('reports the intended intermediate progression spine', () => {
    expect(minutes('dogCompanion')).toBeGreaterThanOrEqual(34);
    expect(minutes('dogCompanion')).toBeLessThanOrEqual(41);
    expect(minutes('tripleThrow')).toBeGreaterThanOrEqual(72);
    expect(minutes('tripleThrow')).toBeLessThanOrEqual(85);
    expect(minutes('thirdDummy')).toBeGreaterThanOrEqual(90);
    expect(minutes('thirdDummy')).toBeLessThanOrEqual(103);
    expect(minutes('comboTraining')).toBeGreaterThanOrEqual(110);
    expect(minutes('comboTraining')).toBeLessThanOrEqual(122);
    expect(minutes('quadThrow')).toBeGreaterThanOrEqual(128);
    expect(minutes('quadThrow')).toBeLessThanOrEqual(142);
    expect(minutes('fourthDummy')).toBeGreaterThanOrEqual(148);
    expect(minutes('fourthDummy')).toBeLessThanOrEqual(165);
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
