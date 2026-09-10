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
    betterTraining1: 800,
    quickReload1: 3000,
    steadyHands1: 3000,
    betterTraining2: 5000,
    criticalTraining1: 6000,
    quickReload2: 9500,
    twinThrow: 13500,
    secondDummy: 40000,

    betterTraining3: 70000,
    quickReload3: 65000,
    steadyHands2: 70000,
    perfectWindow1: 85000,
    perfectWindow2: 120000,
    dogCompanion: 90000,
    dogTraining1: 47000,
    dogTraining2: 240000,
    fastFetch1: 155000,
    fastFetch2: 240000,
    fetchMastery: 800000,
    dogTraining3: 650000,
    fastFetch3: 700000,
    tripleThrow: 170000,
    thirdDummy: 303000,
    criticalTraining2: 212000,
    criticalMastery: 135000,
    comboTraining: 160000,
    quadThrow: 365000,
    fourthDummy: 1130000,
    comboMastery: 430000,
    boomerangMastery: 540000,
    grandmaster: 800000,
    recoveryMastery: 450000,
  }),

  unlockLifetimeXp: Object.freeze({}),
});
