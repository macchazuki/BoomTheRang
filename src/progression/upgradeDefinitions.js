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
  define('betterTraining1', 'Better Training I', '+20% global damage.', [], 'globalTrainingBonus', 0.20),
  define('betterTraining2', 'Better Training II', 'Additional +25% global damage.', ['betterTraining1'], 'globalTrainingBonus', 0.25),
  define('betterTraining3', 'Better Training III', 'Additional +35% global damage.', ['betterTraining2'], 'globalTrainingBonus', 0.35),

  define('criticalTraining1', 'Critical Training I', 'Player critical damage becomes 2.25x.', ['betterTraining2'], 'criticalMultiplier', 2.25),
  define('criticalTraining2', 'Critical Training II', 'Player critical damage becomes 2.5x.', ['criticalTraining1', 'tripleThrow'], 'criticalMultiplier', 2.5),
  define('criticalMastery', 'Critical Mastery', 'Player critical damage becomes 3x.', ['criticalTraining2'], 'criticalMultiplier', 3),
  define('megaCritical', 'Mega Critical', 'Adds a Mega Crit layer in the center of the white critical zone.', ['criticalTraining1'], 'criticalLayerCount', 2),
  define('ultraCritical', 'Ultra Critical', 'Adds an Ultra Crit layer in the center and pushes earlier crit layers outward.', ['megaCritical', 'criticalTraining2'], 'criticalLayerCount', 3),
  define('omegaCritical', 'Omega Critical', 'Adds an Omega Crit layer at the very center of the gauge.', ['ultraCritical', 'criticalMastery'], 'criticalLayerCount', 4),

  define('quickReload1', 'Quick Reload I', 'Miss reload becomes 4.5s.', ['betterTraining1'], 'missReloadSeconds', 4.5),
  define('quickReload2', 'Quick Reload II', 'Miss reload becomes 4s.', ['quickReload1'], 'missReloadSeconds', 4),
  define('quickReload3', 'Quick Reload III', 'Miss reload becomes 3s.', ['quickReload2'], 'missReloadSeconds', 3),
  define('recoveryMastery', 'Recovery Mastery', 'Miss reload becomes 2s.', ['quickReload3'], 'missReloadSeconds', 2),

  define('steadyHands1', 'Steady Hands I', 'Total green width becomes 19%.', ['betterTraining1'], 'greenWidth', 0.19),
  define('steadyHands2', 'Steady Hands II', 'Total green width becomes 21%.', ['steadyHands1'], 'greenWidth', 0.21),
  define('perfectWindow1', 'Perfect Window I', 'White width becomes 4%.', ['steadyHands2'], 'whiteWidth', 0.04),
  define('perfectWindow2', 'Perfect Window II', 'White width becomes 5%.', ['perfectWindow1'], 'whiteWidth', 0.05),

  define('twinThrow', 'Twin Throw', 'Player throws 2 boomerangs.', ['betterTraining1'], 'playerBoomerangs', 2),
  define('tripleThrow', 'Triple Throw', 'Player throws 3 boomerangs.', ['twinThrow'], 'playerBoomerangs', 3),
  define('quadThrow', 'Quad Throw', 'Player throws 4 boomerangs.', ['comboTraining', 'tripleThrow'], 'playerBoomerangs', 4),
  define('boomerangMastery', 'Boomerang Mastery', '+50% player-boomerang damage.', ['quadThrow', 'comboMastery'], 'boomerangMasteryMultiplier', 1.5),

  define('comboTraining', 'Combo Training', '+2% player damage per combo step up to +20%.', ['twinThrow'], 'comboUnlocked', true),
  define('comboMastery', 'Combo Mastery', 'Maximum combo damage bonus becomes +50%.', ['quadThrow', 'comboTraining'], 'comboMaxBonus', 0.50),

  define('dogCompanion', 'Dog Companion', 'Unlock automatic dog boomerang throws.', ['twinThrow'], 'dogUnlocked', true),
  define('dogTraining1', 'Dog Training I', 'Dog damage factor becomes 40%.', ['dogCompanion'], 'dogXpFactor', 0.40),
  define('dogTraining2', 'Dog Training II', 'Dog damage factor becomes 60%.', ['dogTraining1'], 'dogXpFactor', 0.60),
  define('fastFetch1', 'Fast Fetch I', 'Dog interval becomes 8s.', ['dogCompanion'], 'dogIntervalSeconds', 8),
  define('fastFetch2', 'Fast Fetch II', 'Dog interval becomes 6s.', ['fastFetch1'], 'dogIntervalSeconds', 6),
  define('fetchMastery', 'Fetch Mastery', 'Dog gains 10% independent critical chance.', ['dogTraining2', 'fastFetch2'], 'dogCriticalChance', 0.10),
  define('dogTraining3', 'Dog Training III', 'Dog damage factor becomes 100%.', ['fetchMastery'], 'dogXpFactor', 1.00),
  define('fastFetch3', 'Fast Fetch III', 'Dog interval becomes 4s.', ['fetchMastery'], 'dogIntervalSeconds', 4),

  define(
    'grandmaster',
    'Grandmaster',
    'Unlock the final white-zone challenge.',
    ['boomerangMastery', 'fetchMastery'],
    'finalChallenge',
    true,
  ),
]);

export const UPGRADE_BY_ID = Object.freeze(
  Object.fromEntries(UPGRADE_DEFINITIONS.map((definition) => [definition.id, definition])),
);

export const UPGRADE_IDS = Object.freeze(UPGRADE_DEFINITIONS.map((definition) => definition.id));
