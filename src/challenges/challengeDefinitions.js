import { BALANCE } from '../progression/balance.js';

const DEFINITIONS = [
  {
    id: 'speedTrial',
    name: 'Speed Trial',
    description: 'Fresh progression. Missed boomerangs are permanently lost and the gauge accelerates after every hit.',
  },
  {
    id: 'pressureTrial',
    name: 'Pressure Trial',
    description: 'A faster-ramping fresh run with a larger permanent damage reward.',
  },
  {
    id: 'masterTrial',
    name: 'Master Trial',
    description: 'The fastest-ramping challenge and the largest permanent damage reward.',
  },
];

export const CHALLENGE_DEFINITIONS = Object.freeze(
  DEFINITIONS.map((definition) => Object.freeze({
    ...definition,
    ...BALANCE.challenges[definition.id],
  })),
);

export const CHALLENGE_BY_ID = Object.freeze(
  Object.fromEntries(CHALLENGE_DEFINITIONS.map((definition) => [definition.id, definition])),
);

export const CHALLENGE_IDS = Object.freeze(CHALLENGE_DEFINITIONS.map(({ id }) => id));

export function createDefaultChallengeRecords() {
  return Object.fromEntries(
    CHALLENGE_IDS.map((id) => [id, { unlocked: false, bestHits: 0, damageBonus: 0, cooldownUntil: 0 }]),
  );
}

export function calculateChallengeDamageBonus(challengeId, hits) {
  const definition = CHALLENGE_BY_ID[challengeId];
  if (!definition) return 0;
  const safeHits = Number.isFinite(hits) ? Math.max(0, Math.floor(hits)) : 0;
  return Math.min(safeHits * definition.damageBonusPerHit, definition.maxDamageBonus);
}

export function getChallengeGaugeOneWaySeconds(challengeId, hits) {
  const definition = CHALLENGE_BY_ID[challengeId];
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
    const bonus = Number.isFinite(saved) ? Math.max(0, Math.min(saved, definition.maxDamageBonus)) : 0;
    return total + bonus;
  }, 0);
}
