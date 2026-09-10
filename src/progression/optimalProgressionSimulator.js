import { BALANCE } from './balance.js';

/**
 * Progression simulator contract.
 *
 * The final implementation should run purely in logical time:
 * - every manual throw is white;
 * - next throw begins from the gauge edge;
 * - dog operates after unlock;
 * - purchases follow a defined progression-optimal route;
 * - milestone acquisition times are reported.
 *
 * This file intentionally exposes the functions agents need without locking in an
 * unverified purchase algorithm or late-game costs.
 */

export const DEFAULT_OPTIMAL_ROUTE = Object.freeze([
  'betterTraining1',
  'quickReload1',
  'steadyHands1',
  'betterTraining2',
  'criticalTraining1',
  'quickReload2',
  'twinThrow',
  'secondDummy',
  'dogCompanion',
  'dogTraining1',
  'fastFetch1',
  'tripleThrow',
  'thirdDummy',
  'criticalTraining2',
  'comboTraining',
  'quadThrow',
  'fourthDummy',
  'comboMastery',
  'boomerangMastery',
  'dogTraining2',
  'fastFetch2',
  'fetchMastery',
  'grandmaster',
]);

/** Calculate perfect timing wait from left edge to first white boundary. */
export function getPerfectGaugeWaitSeconds({
  oneWaySeconds = BALANCE.gaugeOneWaySeconds,
  whiteWidth = BALANCE.baseGaugeZoneWidths.white,
} = {}) {
  const whiteStart = 0.5 - whiteWidth / 2;
  return oneWaySeconds * whiteStart;
}

/** Return modeled perfect manual throw cadence before upgrades affecting other systems. */
export function getPerfectThrowCycleSeconds(options = {}) {
  return getPerfectGaugeWaitSeconds(options) + BALANCE.successRecoverySeconds;
}

/**
 * Run deterministic progression and return milestone timing/report data.
 * TODO: implement after core progression/reward systems are verified.
 */
export function simulateOptimalProgression({
  route = DEFAULT_OPTIMAL_ROUTE,
  maxSeconds = 6 * 60 * 60,
} = {}) {
  void route;
  void maxSeconds;

  return {
    implemented: false,
    milestones: {},
    purchases: [],
    completionSeconds: null,
    notes: 'TODO: implement logical-time simulator and tune balance.js costs.',
  };
}
