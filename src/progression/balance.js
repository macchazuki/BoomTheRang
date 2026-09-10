/**
 * Single source of tuneable v1 numbers.
 *
 * Implementation agents should tune costs using optimalProgressionSimulator.js.
 * UI/entity/gameplay classes must not duplicate these literals.
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

  baseGaugeZoneWidths: Object.freeze({
    red: 0.70,
    green: 0.25,
    white: 0.05,
  }),

  comboBonusPerStep: 0.02,
  comboBaseMaxBonus: 0.20,
  comboMasteryMaxBonus: 0.50,

  dogBaseIntervalSeconds: 10,
  dogMinimumIntervalSeconds: 4,
  dogBaseXpFactor: 0.25,
  dogCriticalChance: 0.10,
  dogCriticalMultiplier: 2,

  boomerangMasteryMultiplier: 1.5,

  // Early values come from the handover seed. Later values are placeholders
  // and MUST be tuned by the deterministic progression simulator.
  upgradeCosts: Object.freeze({
    betterTraining1: 800,
    quickReload1: 2000,
    steadyHands1: 3000,
    betterTraining2: 4000,
    criticalTraining1: 6000,
    quickReload2: 8000,
    twinThrow: 12000,
    secondDummy: 40000,

    betterTraining3: 60000,
    quickReload3: 65000,
    steadyHands2: 70000,
    perfectWindow1: 85000,
    perfectWindow2: 120000,
    dogCompanion: 90000,
    dogTraining1: 130000,
    dogTraining2: 220000,
    fastFetch1: 180000,
    fastFetch2: 300000,
    fetchMastery: 500000,
    dogTraining3: 650000,
    fastFetch3: 700000,
    tripleThrow: 450000,
    thirdDummy: 800000,
    criticalTraining2: 700000,
    criticalMastery: 1000000,
    comboTraining: 1200000,
    quadThrow: 1800000,
    fourthDummy: 3000000,
    comboMastery: 3500000,
    boomerangMastery: 4500000,
    grandmaster: 6000000,
    recoveryMastery: 450000,
  }),

  // Optional lifetime gates belong here too. Empty by default until simulator/UI tuning needs them.
  unlockLifetimeXp: Object.freeze({}),
});
