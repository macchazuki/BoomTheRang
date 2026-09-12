import { describe, expect, it } from 'vitest';
import { GAUGE_RESULT } from './GaugeController.js';
import { calculateDogReward, calculatePlayerReward } from './RewardCalculator.js';
import { GameState } from './GameState.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';

describe('permanent challenge damage bonus', () => {
  it('is included in derived effects from saved challenge bonuses', () => {
    const gameState = new GameState();
    gameState.challenges.speedTrial.damageBonus = 0.10;
    gameState.challenges.pressureTrial.damageBonus = 0.20;

    const effects = new ProgressionManager(gameState).getDerivedEffects();

    expect(effects.challengeDamageMultiplier).toBeCloseTo(1.30);
  });

  it('multiplies both player and dog damage', () => {
    expect(calculatePlayerReward({
      result: GAUGE_RESULT.HIT,
      boomerangCount: 1,
      targetCount: 1,
      challengeDamageMultiplier: 1.5,
    })).toBe(15);

    expect(calculateDogReward({
      targetCount: 1,
      dogXpFactor: 1,
      challengeDamageMultiplier: 1.5,
    })).toBe(15);
  });
});
