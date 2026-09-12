/**
 * Single source of tuneable v1 numbers.
 *
 * Costs are verified against optimalProgressionSimulator.js. UI/entity/gameplay
 * classes must not duplicate these literals.
 */
export const BALANCE = Object.freeze({
  baseXpPerTarget: 10,
  baseCriticalMultiplier: 2,
  higherCriticalMultipliers: Object.freeze({
    MEGA_CRITICAL: 4,
    ULTRA_CRITICAL: 6,
    OMEGA_CRITICAL: 10,
  }),
  gaugeOneWaySeconds: 1.35,
  successRecoverySeconds: 0.7,
  missReloadSeconds: 5,

  basePlayerBoomerangs: 1,
  maxPlayerBoomerangs: 4,
  baseTargets: 1,
  maxTargets: 1,

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

  // Fortune Mill-style pacing: cheap early purchases, then wider cost bands
  // around transformative unlocks and a steep late-game climb.
  upgradeCosts: Object.freeze({
    betterTraining1: 160,
    twinThrow: 900,
    comboTraining: 2400,

    quickReload1: 300,
    steadyHands1: 400,
    betterTraining2: 1600,
    criticalTraining1: 2000,
    megaCritical: 2500,
    quickReload2: 5000,

    steadyHands2: 6000,
    perfectWindow1: 12000,
    dogCompanion: 15000,
    dogTraining1: 18000,
    fastFetch1: 22000,
    betterTraining3: 28000,
    tripleThrow: 35000,
    criticalTraining2: 65000,
    ultraCritical: 85000,
    criticalMastery: 100000,
    quickReload3: 110000,
    perfectWindow2: 125000,
    dogTraining2: 140000,
    fastFetch2: 160000,
    quadThrow: 200000,
    omegaCritical: 250000,
    comboMastery: 375000,
    boomerangMastery: 450000,
    fetchMastery: 550000,
    dogTraining3: 650000,
    fastFetch3: 750000,
    recoveryMastery: 850000,
    grandmaster: 1000000,
  }),

  unlockLifetimeXp: Object.freeze({}),
});
