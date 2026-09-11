import { BALANCE } from './balance.js';

/**
 * Data-only upgrade graph.
 *
 * `effectKey/effectValue` are data-only metadata consumed by ProgressionManager when
 * rebuilding derived values; do not execute arbitrary functions from configuration.
 */
function define(id, name, description, prerequisites = [], effectKey = null, effectValue = null) {
  return Object.freeze({
    id,
    name,
    description,
    prerequisites: Object.freeze(prerequisites),
    costXp: BALANCE.upgradeCosts[id],
    unlockLifetimeXp: BALANCE.unlockLifetimeXp[id] ?? 0,
    effectKey,
    effectValue,
  });
}

export const UPGRADE_DEFINITIONS = Object.freeze([
  define('betterTraining1', 'Better Training I', '+20% global earned XP.', [], 'globalTrainingBonus', 0.20),
  define('betterTraining2', 'Better Training II', 'Additional +25% global earned XP.', ['betterTraining1'], 'globalTrainingBonus', 0.25),
  define('betterTraining3', 'Better Training III', 'Additional +35% global earned XP.', ['betterTraining2'], 'globalTrainingBonus', 0.35),

  define('criticalTraining1', 'Critical Training I', 'Player critical multiplier becomes 2.25x.', ['betterTraining2'], 'criticalMultiplier', 2.25),
  define('criticalTraining2', 'Critical Training II', 'Player critical multiplier becomes 2.5x.', ['criticalTraining1', 'thirdDummy'], 'criticalMultiplier', 2.5),
  define('criticalMastery', 'Critical Mastery', 'Player critical multiplier becomes 3x.', ['criticalTraining2'], 'criticalMultiplier', 3),

  define('quickReload1', 'Quick Reload I', 'Miss reload becomes 4.5s.', ['betterTraining1'], 'missReloadSeconds', 4.5),
  define('quickReload2', 'Quick Reload II', 'Miss reload becomes 4s.', ['quickReload1'], 'missReloadSeconds', 4),
  define('quickReload3', 'Quick Reload III', 'Miss reload becomes 3s.', ['quickReload2'], 'missReloadSeconds', 3),
  define('recoveryMastery', 'Recovery Mastery', 'Miss reload becomes 2s.', ['quickReload3'], 'missReloadSeconds', 2),

  define('steadyHands1', 'Steady Hands I', 'Total green width becomes 19%.', ['betterTraining1'], 'greenWidth', 0.19),
  define('steadyHands2', 'Steady Hands II', 'Total green width becomes 21%.', ['steadyHands1'], 'greenWidth', 0.21),
  define('perfectWindow1', 'Perfect Window I', 'White width becomes 4%.', ['steadyHands2'], 'whiteWidth', 0.04),
  define('perfectWindow2', 'Perfect Window II', 'White width becomes 5%.', ['perfectWindow1'], 'whiteWidth', 0.05),

  define('twinThrow', 'Twin Throw', 'Player throws 2 boomerangs.', ['betterTraining1'], 'playerBoomerangs', 2),
  define('secondDummy', 'Second Dummy', 'Train against 2 target dummies.', ['twinThrow'], 'targets', 2),
  define('tripleThrow', 'Triple Throw', 'Player throws 3 boomerangs.', ['secondDummy'], 'playerBoomerangs', 3),
  define('thirdDummy', 'Third Dummy', 'Train against 3 target dummies.', ['tripleThrow'], 'targets', 3),
  define('quadThrow', 'Quad Throw', 'Player throws 4 boomerangs.', ['comboTraining', 'thirdDummy'], 'playerBoomerangs', 4),
  define('fourthDummy', 'Fourth Dummy', 'Train against 4 target dummies.', ['quadThrow'], 'targets', 4),
  define('boomerangMastery', 'Boomerang Mastery', '+50% player-boomerang XP.', ['fourthDummy', 'comboMastery'], 'boomerangMasteryMultiplier', 1.5),

  define('comboTraining', 'Combo Training', '+2% player XP per combo step up to +20%.', ['secondDummy'], 'comboUnlocked', true),
  define('comboMastery', 'Combo Mastery', 'Maximum combo bonus becomes +50%.', ['fourthDummy', 'comboTraining'], 'comboMaxBonus', 0.50),

  define('dogCompanion', 'Dog Companion', 'Unlock automatic dog boomerang throws.', ['secondDummy'], 'dogUnlocked', true),
  define('dogTraining1', 'Dog Training I', 'Dog XP factor becomes 40%.', ['dogCompanion'], 'dogXpFactor', 0.40),
  define('dogTraining2', 'Dog Training II', 'Dog XP factor becomes 60%.', ['dogTraining1'], 'dogXpFactor', 0.60),
  define('fastFetch1', 'Fast Fetch I', 'Dog interval becomes 8s.', ['dogCompanion'], 'dogIntervalSeconds', 8),
  define('fastFetch2', 'Fast Fetch II', 'Dog interval becomes 6s.', ['fastFetch1'], 'dogIntervalSeconds', 6),
  define('fetchMastery', 'Fetch Mastery', 'Dog gains 10% independent critical chance.', ['dogTraining2', 'fastFetch2'], 'dogCriticalChance', 0.10),
  define('dogTraining3', 'Dog Training III', 'Dog XP factor becomes 100%.', ['fetchMastery'], 'dogXpFactor', 1.00),
  define('fastFetch3', 'Fast Fetch III', 'Dog interval becomes 4s.', ['fetchMastery'], 'dogIntervalSeconds', 4),

  define(
    'grandmaster',
    'Grandmaster',
    'Unlock the final white-zone challenge.',
    ['boomerangMastery', 'fetchMastery', 'fourthDummy'],
    'finalChallenge',
    true,
  ),
]);

export const UPGRADE_BY_ID = Object.freeze(
  Object.fromEntries(UPGRADE_DEFINITIONS.map((definition) => [definition.id, definition])),
);

export const UPGRADE_IDS = Object.freeze(UPGRADE_DEFINITIONS.map((definition) => definition.id));
