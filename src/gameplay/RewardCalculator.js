import { GAUGE_RESULT, isCriticalResult } from './GaugeController.js';
import { BALANCE } from '../progression/balance.js';

/**
 * Pure player reward formula. Round once, after all multipliers.
 */
export function calculatePlayerReward({
  result,
  boomerangCount,
  targetCount,
  globalTrainingMultiplier = 1,
  challengeDamageMultiplier = 1,
  criticalMultiplier = BALANCE.baseCriticalMultiplier,
  comboMultiplier = 1,
  boomerangMasteryMultiplier = 1,
  baseXpPerTarget = BALANCE.baseXpPerTarget,
}) {
  if (result === GAUGE_RESULT.MISS) return 0;

  const zoneMultiplier = result === GAUGE_RESULT.CRITICAL
    ? criticalMultiplier
    : BALANCE.higherCriticalMultipliers[result] ?? 1;
  return Math.round(
    baseXpPerTarget *
      boomerangCount *
      targetCount *
      globalTrainingMultiplier *
      challengeDamageMultiplier *
      zoneMultiplier *
      comboMultiplier *
      boomerangMasteryMultiplier,
  );
}

/**
 * Pure dog reward formula. The dog ignores player combo and player critical multiplier.
 */
export function calculateDogReward({
  targetCount,
  dogXpFactor,
  globalTrainingMultiplier = 1,
  challengeDamageMultiplier = 1,
  dogCritical = false,
  baseXpPerTarget = BALANCE.baseXpPerTarget,
}) {
  const dogCriticalMultiplier = dogCritical ? BALANCE.dogCriticalMultiplier : 1;
  return Math.round(
    baseXpPerTarget *
      targetCount *
      dogXpFactor *
      globalTrainingMultiplier *
      challengeDamageMultiplier *
      dogCriticalMultiplier,
  );
}

/** Return combo after one player throw. Dog throws never call this. */
export function getNextCombo(currentCombo, result, comboUnlocked) {
  if (!comboUnlocked) return 0;
  if (result === GAUGE_RESULT.MISS) return 0;
  if (isCriticalResult(result)) return currentCombo + 2;
  return currentCombo + 1;
}

/** Compute player combo XP multiplier from step percentage and current cap. */
export function calculateComboMultiplier(
  combo,
  { perStep = BALANCE.comboBonusPerStep, maxBonus = BALANCE.comboBaseMaxBonus } = {},
) {
  return 1 + Math.min(Math.max(0, combo) * perStep, maxBonus);
}
