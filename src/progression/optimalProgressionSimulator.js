import { BALANCE } from './balance.js';
import { ProgressionManager } from './ProgressionManager.js';
import { UPGRADE_BY_ID, UPGRADE_IDS } from './upgradeDefinitions.js';
import { GameState } from '../gameplay/GameState.js';
import { DogController } from '../gameplay/DogController.js';
import { GAUGE_RESULT } from '../gameplay/GaugeController.js';
import {
  calculateComboMultiplier,
  calculateDogReward,
  calculatePlayerReward,
  getNextCombo,
} from '../gameplay/RewardCalculator.js';

/**
 * Reproducible perfect-play route used to tune v1 costs.
 *
 * It skips miss/precision assistance that cannot improve theoretical perfect play.
 * Better Training III and Critical Mastery are included because their XP-rate gains
 * pay back before Grandmaster. Dog Training III and Fast Fetch III are intentionally
 * post-route: at their configured costs their payback is longer than the remaining
 * optimal path after Fetch Mastery.
 */
export const DEFAULT_OPTIMAL_ROUTE = Object.freeze([
  'betterTraining1',
  'betterTraining2',
  'criticalTraining1',
  'quickReload1',
  'quickReload2',
  'twinThrow',
  'secondDummy',
  'dogCompanion',
  'betterTraining3',
  'dogTraining1',
  'fastFetch1',
  'tripleThrow',
  'thirdDummy',
  'criticalTraining2',
  'criticalMastery',
  'comboTraining',
  'dogTraining2',
  'fastFetch2',
  'quadThrow',
  'fourthDummy',
  'comboMastery',
  'boomerangMastery',
  'fetchMastery',
  'grandmaster',
]);

const DEFAULT_SEED = 0x5eed1234;
const EPSILON = 1e-9;

/** Calculate perfect timing wait from left edge to first white boundary. */
export function getPerfectGaugeWaitSeconds({
  oneWaySeconds = BALANCE.gaugeOneWaySeconds,
  whiteWidth = BALANCE.baseGaugeZoneWidths.white,
} = {}) {
  const whiteStart = 0.5 - whiteWidth / 2;
  return oneWaySeconds * whiteStart;
}

/** Return modeled perfect manual throw cadence. */
export function getPerfectThrowCycleSeconds(options = {}) {
  return getPerfectGaugeWaitSeconds(options) + BALANCE.successRecoverySeconds;
}

/** Small seeded generator keeps Fetch Mastery deterministic across runs/platforms. */
function createSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function validateRoute(route) {
  const earlier = new Set();

  for (const upgradeId of route) {
    const definition = UPGRADE_BY_ID[upgradeId];
    if (!definition) throw new Error(`Unknown upgrade in optimal route: ${upgradeId}`);
    if (earlier.has(upgradeId)) throw new Error(`Duplicate upgrade in optimal route: ${upgradeId}`);

    const missing = definition.prerequisites.filter((id) => !earlier.has(id));
    if (missing.length > 0) {
      throw new Error(`Optimal route reaches ${upgradeId} before: ${missing.join(', ')}`);
    }
    earlier.add(upgradeId);
  }
}

function awardPerfectPlayerThrow(gameState, effects) {
  const nextCombo = getNextCombo(
    gameState.gameplay.combo,
    GAUGE_RESULT.CRITICAL,
    effects.comboUnlocked,
  );
  gameState.setCombo(nextCombo);

  const reward = calculatePlayerReward({
    result: GAUGE_RESULT.CRITICAL,
    boomerangCount: effects.playerBoomerangCount,
    targetCount: effects.targetCount,
    globalTrainingMultiplier: effects.globalTrainingMultiplier,
    criticalMultiplier: effects.criticalMultiplier,
    comboMultiplier: effects.comboUnlocked
      ? calculateComboMultiplier(nextCombo, { maxBonus: effects.comboMaxBonus })
      : 1,
    boomerangMasteryMultiplier: effects.boomerangMasteryMultiplier,
  });

  gameState.addXp(reward, 'player');
  return reward;
}

function calculateFullyUpgradedRates() {
  const state = new GameState();
  for (const upgradeId of UPGRADE_IDS) state.purchaseUpgrade(upgradeId);

  const effects = new ProgressionManager(state).getDerivedEffects();
  const cappedCombo = Math.ceil(effects.comboMaxBonus / BALANCE.comboBonusPerStep);
  const comboMultiplier = calculateComboMultiplier(cappedCombo, {
    maxBonus: effects.comboMaxBonus,
  });

  const whiteReward = calculatePlayerReward({
    result: GAUGE_RESULT.CRITICAL,
    boomerangCount: effects.playerBoomerangCount,
    targetCount: effects.targetCount,
    globalTrainingMultiplier: effects.globalTrainingMultiplier,
    criticalMultiplier: effects.criticalMultiplier,
    comboMultiplier,
    boomerangMasteryMultiplier: effects.boomerangMasteryMultiplier,
  });
  const greenReward = calculatePlayerReward({
    result: GAUGE_RESULT.HIT,
    boomerangCount: effects.playerBoomerangCount,
    targetCount: effects.targetCount,
    globalTrainingMultiplier: effects.globalTrainingMultiplier,
    criticalMultiplier: effects.criticalMultiplier,
    comboMultiplier,
    boomerangMasteryMultiplier: effects.boomerangMasteryMultiplier,
  });

  const whiteCycleSeconds = getPerfectThrowCycleSeconds({
    whiteWidth: effects.gaugeZoneWidths.white,
  });
  const firstGreenPosition =
    0.5 - effects.gaugeZoneWidths.white / 2 - effects.gaugeZoneWidths.green / 2;
  const greenCycleSeconds =
    BALANCE.gaugeOneWaySeconds * firstGreenPosition + BALANCE.successRecoverySeconds;

  const normalDogReward = calculateDogReward({
    targetCount: effects.targetCount,
    dogXpFactor: effects.dogXpFactor,
    globalTrainingMultiplier: effects.globalTrainingMultiplier,
    dogCritical: false,
  });
  const criticalDogReward = calculateDogReward({
    targetCount: effects.targetCount,
    dogXpFactor: effects.dogXpFactor,
    globalTrainingMultiplier: effects.globalTrainingMultiplier,
    dogCritical: true,
  });
  const expectedDogReward =
    normalDogReward * (1 - effects.dogCriticalChance) +
    criticalDogReward * effects.dogCriticalChance;

  return {
    whitePlayerXpPerMinute: whiteReward * 60 / whiteCycleSeconds,
    greenPlayerXpPerMinute: greenReward * 60 / greenCycleSeconds,
    dogXpPerMinute: expectedDogReward * 60 / effects.dogIntervalSeconds,
  };
}

/**
 * Run deterministic progression in logical time only.
 * Player throws are always white; dog throws use a seeded production DogController.
 */
export function simulateOptimalProgression({
  route = DEFAULT_OPTIMAL_ROUTE,
  maxSeconds = 6 * 60 * 60,
  seed = DEFAULT_SEED,
} = {}) {
  if (!Array.isArray(route)) throw new TypeError('Optimal route must be an array.');
  if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) {
    throw new RangeError('maxSeconds must be a positive finite number.');
  }
  validateRoute(route);

  const gameState = new GameState();
  const progressionManager = new ProgressionManager(gameState);
  const milestones = {};
  const purchases = [];
  let routeIndex = 0;
  let elapsedSeconds = 0;
  let completionSeconds = null;

  const dogController = new DogController({
    rng: createSeededRng(seed),
    onThrow: ({ critical }) => {
      const effects = progressionManager.getDerivedEffects();
      if (!effects.dogUnlocked) return;

      gameState.addXp(calculateDogReward({
        targetCount: effects.targetCount,
        dogXpFactor: effects.dogXpFactor,
        globalTrainingMultiplier: effects.globalTrainingMultiplier,
        dogCritical: critical,
      }), 'dog');
    },
  });
  dogController.resume();

  const configureDog = () => {
    const effects = progressionManager.getDerivedEffects();
    dogController.configure({
      unlocked: effects.dogUnlocked,
      intervalSeconds: effects.dogIntervalSeconds,
      criticalChance: effects.dogCriticalChance,
    });
    return effects;
  };
  configureDog();

  const purchaseAffordableRouteItems = () => {
    while (routeIndex < route.length) {
      const upgradeId = route[routeIndex];
      const status = progressionManager.getPurchaseStatus(upgradeId);
      if (!status.ok) {
        if (status.reason === 'INSUFFICIENT_XP' || status.reason === 'LIFETIME_XP_GATE') return;
        throw new Error(`Optimal route could not purchase ${upgradeId}: ${status.reason}`);
      }

      const result = progressionManager.purchase(upgradeId);
      const definition = result.upgrade;
      milestones[upgradeId] = elapsedSeconds;
      purchases.push({
        id: upgradeId,
        name: definition.name,
        timeSeconds: elapsedSeconds,
        costXp: definition.costXp,
        spendableXpAfter: gameState.xp,
        lifetimeXp: gameState.lifetimeXp,
      });
      routeIndex += 1;
      configureDog();
    }
  };

  let effects = progressionManager.getDerivedEffects();
  let nextManualAt = getPerfectGaugeWaitSeconds({
    whiteWidth: effects.gaugeZoneWidths.white,
  });

  while (
    elapsedSeconds < maxSeconds &&
    routeIndex < route.length &&
    !progressionManager.hasUpgrade('grandmaster')
  ) {
    effects = progressionManager.getDerivedEffects();
    const secondsToManual = Math.max(0, nextManualAt - elapsedSeconds);
    const secondsToDog = effects.dogUnlocked
      ? dogController.getRemainingSeconds()
      : Number.POSITIVE_INFINITY;
    const deltaSeconds = Math.min(secondsToManual, secondsToDog);

    if (!Number.isFinite(deltaSeconds) || elapsedSeconds + deltaSeconds > maxSeconds) break;

    elapsedSeconds += deltaSeconds;
    dogController.update(deltaSeconds);
    purchaseAffordableRouteItems();

    const manualDue = secondsToManual <= deltaSeconds + EPSILON;
    if (!manualDue || progressionManager.hasUpgrade('grandmaster')) continue;

    effects = progressionManager.getDerivedEffects();
    awardPerfectPlayerThrow(gameState, effects);
    purchaseAffordableRouteItems();

    if (!progressionManager.hasUpgrade('grandmaster')) {
      effects = progressionManager.getDerivedEffects();
      nextManualAt =
        elapsedSeconds +
        BALANCE.successRecoverySeconds +
        getPerfectGaugeWaitSeconds({ whiteWidth: effects.gaugeZoneWidths.white });
    }
  }

  if (progressionManager.hasUpgrade('grandmaster')) {
    dogController.pause();
    effects = progressionManager.getDerivedEffects();
    const finalThrowAt = elapsedSeconds + getPerfectGaugeWaitSeconds({
      whiteWidth: effects.gaugeZoneWidths.white,
    });

    if (finalThrowAt <= maxSeconds) {
      elapsedSeconds = finalThrowAt;
      awardPerfectPlayerThrow(gameState, effects);
      gameState.markCompleted();
      completionSeconds = elapsedSeconds;
      milestones.completion = completionSeconds;
    }
  }

  return {
    implemented: true,
    completed: completionSeconds !== null,
    route: [...route],
    milestones,
    purchases,
    completionSeconds,
    spendableXp: gameState.xp,
    lifetimeXp: gameState.lifetimeXp,
    rates: calculateFullyUpgradedRates(),
    notes: 'Perfect white throws, instant route purchases, seeded dog crits, and production reward/progression formulas.',
  };
}
