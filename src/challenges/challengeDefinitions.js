import { BALANCE } from '../progression/balance.js';

const DEFINITIONS = [
  {
    id: 'speedTrial',
    name: 'Speed Trial',
    description: 'Missed boomerangs are permanently lost and the gauge accelerates after every hit.',
    levels: [
      {
        tierId: 'speedTrial',
        tierName: 'Speed Trial',
        description: 'Fresh progression with an accelerating gauge after every hit.',
        ...BALANCE.challenges.speedTrial,
      },
      {
        tierId: 'pressureTrial',
        tierName: 'Pressure Trial',
        description: 'A faster-ramping Speed Trial with a larger permanent damage reward.',
        ...BALANCE.challenges.pressureTrial,
      },
      {
        tierId: 'masterTrial',
        tierName: 'Master Trial',
        description: 'The fastest-ramping Speed Trial and the largest permanent damage reward.',
        ...BALANCE.challenges.masterTrial,
      },
    ],
  },
  {
    id: 'blindTrial',
    name: 'Blind Trial',
    description: 'The gauge is visible until your first throw, then its marker and timing colors stay hidden.',
    hideGaugeAfterFirstTap: true,
    levels: [
      {
        tierId: 'blindTrial',
        tierName: 'Blind Trial',
        description: 'Fresh progression with the gauge hidden after your first throw.',
        ...BALANCE.challenges.blindTrial,
      },
    ],
  },
];

export const CHALLENGE_DEFINITIONS = Object.freeze(
  DEFINITIONS.map((definition) => Object.freeze({
    ...definition,
    levels: Object.freeze(definition.levels.map((level) => Object.freeze({ ...level }))),
  })),
);

export const CHALLENGE_BY_ID = Object.freeze(
  Object.fromEntries(CHALLENGE_DEFINITIONS.map((definition) => [definition.id, definition])),
);

export const CHALLENGE_IDS = Object.freeze(CHALLENGE_DEFINITIONS.map(({ id }) => id));

export function getChallengeLevelDefinition(challengeId, level = 1) {
  const definition = CHALLENGE_BY_ID[challengeId];
  if (!definition) return null;
  const safeLevel = Math.min(definition.levels.length, Math.max(1, Math.floor(level) || 1));
  const levelDefinition = definition.levels[safeLevel - 1];
  return Object.freeze({
    ...definition,
    ...levelDefinition,
    id: definition.id,
    baseName: definition.name,
    level: safeLevel,
    maxLevel: definition.levels.length,
  });
}

export function createDefaultChallengeRecords() {
  return Object.fromEntries(
    CHALLENGE_IDS.map((id) => [id, {
      unlocked: false,
      level: 0,
      bestHits: 0,
      damageBonus: 0,
      cooldownUntil: 0,
    }]),
  );
}

export function calculateChallengeDamageBonus(challengeId, hits, level = 1) {
  const definition = getChallengeLevelDefinition(challengeId, level);
  if (!definition) return 0;
  const safeHits = Number.isFinite(hits) ? Math.max(0, Math.floor(hits)) : 0;
  return Math.min(safeHits * definition.damageBonusPerHit, definition.maxDamageBonus);
}

export function getChallengeGaugeOneWaySeconds(challengeId, hits, level = 1) {
  const definition = getChallengeLevelDefinition(challengeId, level);
  if (!definition) return BALANCE.gaugeOneWaySeconds;
  const safeHits = Number.isFinite(hits) ? Math.max(0, Math.floor(hits)) : 0;
  return Math.max(
    definition.minGaugeOneWaySeconds,
    BALANCE.gaugeOneWaySeconds * (definition.speedFactorPerHit ** safeHits),
  );
}

export function getTotalChallengeDamageBonus(records = {}) {
  return CHALLENGE_DEFINITIONS.reduce((total, definition) => {
    const saved = records?.[definition.id]?.damageBonus;
    const maxDamageBonus = Math.max(...definition.levels.map((level) => level.maxDamageBonus));
    const bonus = Number.isFinite(saved) ? Math.max(0, Math.min(saved, maxDamageBonus)) : 0;
    return total + bonus;
  }, 0);
}
