import { BALANCE } from './balance.js';

function freezeLevels(levels) {
  return Object.freeze(levels.map((level) => Object.freeze({ ...level })));
}

export const SKILL_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'rapidRecall',
    icon: '↩',
    name: 'Rapid Recall',
    description: 'Temporarily gives missed boomerangs a chance to return immediately and increases gauge speed.',
    learnCostXp: BALANCE.activeSkills.rapidRecall.learnCostXp,
    upgradeCostsXp: BALANCE.activeSkills.rapidRecall.upgradeCostsXp,
    levels: freezeLevels(BALANCE.activeSkills.rapidRecall.levels),
  }),
  Object.freeze({
    id: 'openingBullseye',
    icon: '◎',
    name: 'Opening Bullseye',
    description: 'Temporarily auto-fires the first boomerang of each sweep at the exact centre. Taps in the first area do nothing while active.',
    learnCostXp: BALANCE.activeSkills.openingBullseye.learnCostXp,
    upgradeCostsXp: BALANCE.activeSkills.openingBullseye.upgradeCostsXp,
    levels: freezeLevels(BALANCE.activeSkills.openingBullseye.levels),
  }),
]);

export const SKILL_IDS = Object.freeze(SKILL_DEFINITIONS.map(({ id }) => id));
export const SKILL_BY_ID = Object.freeze(Object.fromEntries(SKILL_DEFINITIONS.map((definition) => [definition.id, definition])));

export function getSkillLevelDefinition(skillId, level) {
  const definition = SKILL_BY_ID[skillId];
  if (!definition || !Number.isInteger(level) || level < 1) return null;
  return definition.levels[level - 1] ?? null;
}
