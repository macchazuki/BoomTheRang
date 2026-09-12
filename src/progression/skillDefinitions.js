import { BALANCE } from './balance.js';

export const SKILL_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'rapidRecall',
    name: 'Rapid Recall',
    description: `While active, missed boomerangs have a ${Math.round(BALANCE.activeSkills.rapidRecall.missReturnChance * 100)}% chance to return immediately and the gauge moves ${Math.round(BALANCE.activeSkills.rapidRecall.gaugeSpeedBonus * 100)}% faster.`,
    costXp: BALANCE.activeSkills.rapidRecall.costXp,
    effects: Object.freeze({
      missReturnChance: BALANCE.activeSkills.rapidRecall.missReturnChance,
      gaugeSpeedMultiplier: 1 + BALANCE.activeSkills.rapidRecall.gaugeSpeedBonus,
    }),
  }),
  Object.freeze({
    id: 'openingBullseye',
    name: 'Opening Bullseye',
    description: 'While active, the first boomerang of each gauge sweep fires automatically at the exact centre of the first gauge area. Taps in that first area do nothing.',
    costXp: BALANCE.activeSkills.openingBullseye.costXp,
    effects: Object.freeze({
      autoFirstBoomerang: true,
    }),
  }),
]);

export const SKILL_IDS = Object.freeze(SKILL_DEFINITIONS.map(({ id }) => id));
export const SKILL_BY_ID = Object.freeze(
  Object.fromEntries(SKILL_DEFINITIONS.map((definition) => [definition.id, definition])),
);
