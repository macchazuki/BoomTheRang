import { describe, expect, it } from 'vitest';
import { simulateOptimalProgression } from './optimalProgressionSimulator.js';

const report = simulateOptimalProgression();
const minutes = (milestone) => report.milestones[milestone] / 60;

describe('optimal progression balance contract', () => {
  it('Better Training I is acquired around 1 minute ±20 seconds', () => {
    expect(report.implemented).toBe(true);
    expect(report.completed).toBe(true);
    expect(report.milestones.betterTraining1).toBeGreaterThanOrEqual(40);
    expect(report.milestones.betterTraining1).toBeLessThanOrEqual(80);
  });

  it('Twin Throw is acquired around 30 minutes ±3 minutes', () => {
    expect(minutes('twinThrow')).toBeGreaterThanOrEqual(27);
    expect(minutes('twinThrow')).toBeLessThanOrEqual(33);
  });

  it('Second Dummy is acquired around 45 minutes ±4 minutes', () => {
    expect(minutes('secondDummy')).toBeGreaterThanOrEqual(41);
    expect(minutes('secondDummy')).toBeLessThanOrEqual(49);
  });

  it('Grandmaster completion path is around 300 minutes ±20 minutes', () => {
    expect(report.completionSeconds / 60).toBeGreaterThanOrEqual(280);
    expect(report.completionSeconds / 60).toBeLessThanOrEqual(320);
  });

  it('reports the intended intermediate progression spine', () => {
    expect(minutes('dogCompanion')).toBeGreaterThanOrEqual(57);
    expect(minutes('dogCompanion')).toBeLessThanOrEqual(67);
    expect(minutes('tripleThrow')).toBeGreaterThanOrEqual(120);
    expect(minutes('tripleThrow')).toBeLessThanOrEqual(140);
    expect(minutes('thirdDummy')).toBeGreaterThanOrEqual(150);
    expect(minutes('thirdDummy')).toBeLessThanOrEqual(170);
    expect(minutes('comboTraining')).toBeGreaterThanOrEqual(185);
    expect(minutes('comboTraining')).toBeLessThanOrEqual(200);
    expect(minutes('quadThrow')).toBeGreaterThanOrEqual(215);
    expect(minutes('quadThrow')).toBeLessThanOrEqual(235);
    expect(minutes('fourthDummy')).toBeGreaterThanOrEqual(250);
    expect(minutes('fourthDummy')).toBeLessThanOrEqual(270);
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
