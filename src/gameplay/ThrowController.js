/**
 * Converts already-known gameplay outcomes into deterministic throw descriptions.
 *
 * This controller does not animate Three.js objects and does not decide gauge accuracy.
 * It exists so GameController does not accumulate trajectory/reward bookkeeping details.
 */
export class ThrowController {
  /** Build the logical result of one manual player throw. */
  resolvePlayerThrow({ result, boomerangCount, targetCount }) {
    return {
      owner: 'player',
      result,
      boomerangCount,
      targetCount,
      rewardedTargetHits: result === 'MISS' ? 0 : boomerangCount * targetCount,
      targetChain: Array.from({ length: targetCount }, (_, index) => index),
    };
  }

  /** Build logical dog throw data. Dog always hits every target. */
  resolveDogThrow({ targetCount, critical }) {
    return {
      owner: 'dog',
      result: critical ? 'CRITICAL' : 'HIT',
      boomerangCount: 1,
      targetCount,
      rewardedTargetHits: targetCount,
      critical,
      targetChain: Array.from({ length: targetCount }, (_, index) => index),
    };
  }
}
