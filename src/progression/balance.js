/**
 * Single source of tuneable v1 numbers.
 *
 * Costs are verified against optimalProgressionSimulator.js. UI/entity/gameplay
 * classes must not duplicate these literals.
 */
export const BALANCE = Object.freeze({
  baseXpPerTarget: 10,
  baseCriticalMultiplier: 2,
  gaugeOneWaySeconds: 1.6,
  successRecoverySeconds: 0.7,
  missReloadSeconds: 5,

  basePlayerBoomerangs: 1,
  maxPlayerBoomerangs: 4,
  baseTargets: 1,
  maxTargets: 4,

  baseGaugeZoneWidths: Object.freeze({ red: 0.70, green: 0.25, white: 0.05 }),

  comboBonusPerStep: 0.02,
  comboBaseMaxBonus: 0.20,
  comboMasteryMaxBonus: 0.50,

  dogBaseIntervalSeconds: 10,
  dogMinimumIntervalSeconds: 4,
  dogBaseXpFactor: 0.25,
  dogCriticalChance: 0.10,
  dogCriticalMultiplier: 2,

  boomerangMasteryMultiplier: 1.5,

  upgradeCosts: Object.freeze({
    betterTraining1: 480,
    quickReload1: 1800,
    steadyHands1: 1800,
    betterTraining2: 3000,
    criticalTraining1: 3600,
    quickReload2: 5700,
    twinThrow: 8100,
    secondDummy: 24000,

    betterTraining3: 42000,
    quickReload3: 39000,
    steadyHands2: 42000,
    perfectWindow1: 51000,
    perfectWindow2: 72000,
    dogCompanion: 54000,
    dogTraining1: 28200,
    dogTraining2: 144000,
    fastFetch1: 93000,
    fastFetch2: 144000,
    fetchMastery: 480000,
    dogTraining3: 390000,
    fastFetch3: 420000,
    tripleThrow: 102000,
    thirdDummy: 181800,
    criticalTraining2: 127200,
    criticalMastery: 81000,
    comboTraining: 96000,
    quadThrow: 219000,
    fourthDummy: 678000,
    comboMastery: 258000,
    boomerangMastery: 324000,
    grandmaster: 480000,
    recoveryMastery: 270000,
  }),

  unlockLifetimeXp: Object.freeze({}),
});
