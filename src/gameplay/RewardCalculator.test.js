import { describe, expect, it } from 'vitest';
import { GAUGE_RESULT } from './GaugeController.js';
import {
  calculateComboMultiplier,
  calculateDogReward,
  calculatePlayerReward,
  getNextCombo,
} from './RewardCalculator.js';
import { BALANCE } from '../progression/balance.js';

describe('RewardCalculator contract', () => {
  it('red/miss awards zero XP', () => {
    expect(
      calculatePlayerReward({
        result: GAUGE_RESULT.MISS,
        boomerangCount: 4,
        targetCount: 4,
        globalTrainingMultiplier: 2,
        comboMultiplier: 1.5,
        boomerangMasteryMultiplier: 1.5,
      }),
    ).toBe(0);
  });

  it('green uses base reward', () => {
    expect(
      calculatePlayerReward({
        result: GAUGE_RESULT.HIT,
        boomerangCount: 1,
        targetCount: 1,
      }),
    ).toBe(BALANCE.baseXpPerTarget);
  });

  it('white uses current critical multiplier', () => {
    expect(
      calculatePlayerReward({
        result: GAUGE_RESULT.CRITICAL,
        boomerangCount: 1,
        targetCount: 1,
        criticalMultiplier: 2.5,
      }),
    ).toBe(25);
  });

  it('boomerangCount × targetCount is applied exactly once', () => {
    expect(
      calculatePlayerReward({
        result: GAUGE_RESULT.HIT,
        boomerangCount: 2,
        targetCount: 2,
      }),
    ).toBe(40);
  });

  it('Training multiplier applies to player and dog', () => {
    expect(
      calculatePlayerReward({
        result: GAUGE_RESULT.HIT,
        boomerangCount: 1,
        targetCount: 1,
        globalTrainingMultiplier: 1.5,
      }),
    ).toBe(15);

    expect(
      calculateDogReward({
        targetCount: 2,
        dogXpFactor: 0.25,
        globalTrainingMultiplier: 1.5,
      }),
    ).toBe(8);
  });

  it('Boomerang Mastery applies to player only', () => {
    expect(
      calculatePlayerReward({
        result: GAUGE_RESULT.HIT,
        boomerangCount: 1,
        targetCount: 1,
        boomerangMasteryMultiplier: 1.5,
      }),
    ).toBe(15);

    const dogBase = calculateDogReward({ targetCount: 2, dogXpFactor: 1 });
    const dogWithPlayerOnlyMultiplier = calculateDogReward({
      targetCount: 2,
      dogXpFactor: 1,
      boomerangMasteryMultiplier: 1.5,
    });
    expect(dogWithPlayerOnlyMultiplier).toBe(dogBase);
  });

  it('combo applies to player only', () => {
    expect(
      calculatePlayerReward({
        result: GAUGE_RESULT.HIT,
        boomerangCount: 1,
        targetCount: 1,
        comboMultiplier: 1.2,
      }),
    ).toBe(12);

    const dogBase = calculateDogReward({ targetCount: 2, dogXpFactor: 1 });
    const dogWithPlayerCombo = calculateDogReward({
      targetCount: 2,
      dogXpFactor: 1,
      comboMultiplier: 1.5,
    });
    expect(dogWithPlayerCombo).toBe(dogBase);
  });

  it('rounds final XP exactly once after all multipliers', () => {
    expect(
      calculatePlayerReward({
        result: GAUGE_RESULT.HIT,
        boomerangCount: 1,
        targetCount: 1,
        globalTrainingMultiplier: 1.15,
        comboMultiplier: 1.15,
      }),
    ).toBe(13);
  });

  it('green adds one combo step and white adds two', () => {
    expect(getNextCombo(4, GAUGE_RESULT.HIT, true)).toBe(5);
    expect(getNextCombo(4, GAUGE_RESULT.CRITICAL, true)).toBe(6);
  });

  it('miss resets combo', () => {
    expect(getNextCombo(12, GAUGE_RESULT.MISS, true)).toBe(0);
  });

  it('normal/mastery combo caps are 20% and 50%', () => {
    expect(calculateComboMultiplier(100)).toBeCloseTo(1.2);
    expect(
      calculateComboMultiplier(100, { maxBonus: BALANCE.comboMasteryMaxBonus }),
    ).toBeCloseTo(1.5);
  });
});
