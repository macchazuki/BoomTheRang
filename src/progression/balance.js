/**
 * Single source of tuneable v1 numbers.
 *
 * Costs are verified against optimalProgressionSimulator.js. UI/entity/gameplay
 * classes must not duplicate these literals.
 */
export const BALANCE = Object.freeze({
  baseXpPerTarget: 10,
  baseCriticalMultiplier: 2,
  gaugeOneWaySeconds: 1.35,
  successRecoverySeconds: 0.7,
  missReloadSeconds: 5,

  basePlayerBoomerangs: 1,
  maxPlayerBoomerangs: 4,
  baseTargets: 1,
  maxTargets: 4,

  baseGaugeZoneWidths: Object.freeze({ red: 0.80, green: 0.17, white: 0.03 }),

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
    betterTraining1: 240,
    twinThrow: 800,
    secondDummy: 1400,
    comboTraining: 1800,

    quickReload1: 900,
    steadyHands1: 900,
    betterTraining2: 1500,
    criticalTraining1: 1800,
    quickReload2: 2850,

    betterTraining3: 21000,
    quickReload3: 19500,
    steadyHands2: 21000,
    perfectWindow1: 25500,
    perfectWindow2: 36000,
    dogCompanion: 27000,
    dogTraining1: 14100,
    dogTraining2: 72000,
    fastFetch1: 46500,
    fastFetch2: 72000,
    fetchMastery: 240000,
    dogTraining3: 195000,
    fastFetch3: 210000,
    tripleThrow: 51000,
    thirdDummy: 90900,
    criticalTraining2: 63600,
    criticalMastery: 40500,
    megaCritical: 90000,
    ultraCritical: 180000,
    omegaCritical: 360000,
    quadThrow: 109500,
    fourthDummy: 339000,
    comboMastery: 129000,
    boomerangMastery: 162000,
    grandmaster: 240000,
    recoveryMastery: 135000,
  }),

  unlockLifetimeXp: Object.freeze({}),
});
