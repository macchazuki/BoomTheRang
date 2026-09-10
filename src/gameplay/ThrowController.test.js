import { describe, expect, it } from 'vitest';
import { GAUGE_RESULT } from './GaugeController.js';
import { ThrowController } from './ThrowController.js';

describe('ThrowController contract', () => {
  it('resolves the target chain and rewards boomerang × target hits once', () => {
    const controller = new ThrowController();
    const throwData = controller.resolvePlayerThrow({
      result: GAUGE_RESULT.HIT,
      boomerangCount: 2,
      targetCount: 2,
    });

    expect(throwData.targetChain).toEqual([0, 1]);
    expect(throwData.rewardedTargetHits).toBe(4);
  });

  it('keeps the target chain but awards no rewarded hits for a miss', () => {
    const controller = new ThrowController();
    const throwData = controller.resolvePlayerThrow({
      result: GAUGE_RESULT.MISS,
      boomerangCount: 2,
      targetCount: 2,
    });

    expect(throwData.targetChain).toEqual([0, 1]);
    expect(throwData.rewardedTargetHits).toBe(0);
  });

  it('dog throws chain across every target exactly once', () => {
    const controller = new ThrowController();
    const throwData = controller.resolveDogThrow({ targetCount: 3, critical: true });

    expect(throwData.targetChain).toEqual([0, 1, 2]);
    expect(throwData.rewardedTargetHits).toBe(3);
    expect(throwData.result).toBe(GAUGE_RESULT.CRITICAL);
  });
});
