import { SKILL_DEFINITIONS } from '../progression/skillDefinitions.js';
import { UpgradePanel as BaseUpgradePanel } from './UpgradePanel.js';

function formatLevelStats(definition, levelData) {
  const parts = [
    `${levelData.durationSeconds}s duration`,
    `${levelData.cooldownSeconds}s cooldown`,
  ];
  if (definition.id === 'rapidRecall') {
    parts.push(`${Math.round(levelData.missReturnChance * 100)}% miss return`);
    parts.push(`+${Math.round(levelData.gaugeSpeedBonus * 100)}% gauge speed`);
  } else if (definition.id === 'openingBullseye') {
    parts.push('auto first-centre throw');
  }
  return parts.join(' • ');
}

export class UpgradePanel extends BaseUpgradePanel {
  constructor({ onUpgradeSkill, ...options }) {
    super({ ...options, onToggleSkill: null });
    this.onUpgradeSkill = onUpgradeSkill;
  }

  createSkillsView() {
    const view = document.createElement('div');
    view.className = 'active-skill-list';
    view.setAttribute('aria-label', 'Active abilities');

    for (const definition of SKILL_DEFINITIONS) {
      const learned = this.progressionManager.hasSkill(definition.id);
      const level = this.progressionManager.getSkillLevel(definition.id);
      const learnStatus = this.progressionManager.getSkillLearnStatus(definition.id);
      const upgradeStatus = learned
        ? this.progressionManager.getSkillUpgradeStatus(definition.id)
        : null;
      const currentLevelData = learned ? definition.levels[level - 1] : definition.levels[0];
      const nextLevelData = learned && level < definition.levels.length
        ? definition.levels[level]
        : null;

      const card = document.createElement('section');
      card.className = 'active-skill-card';
      card.dataset.skillId = definition.id;

      const titleRow = document.createElement('div');
      titleRow.className = 'active-skill-card__title-row';
      const name = document.createElement('h3');
      name.textContent = `${definition.icon} ${definition.name}`;
      const badge = document.createElement('span');
      badge.className = 'active-skill-card__badge';
      badge.textContent = learned ? `Level ${level}/${definition.levels.length}` : 'Not learned';
      titleRow.append(name, badge);

      const description = document.createElement('p');
      description.className = 'active-skill-card__description';
      description.textContent = definition.description;

      const levels = document.createElement('p');
      levels.className = 'active-skill-card__levels';
      levels.textContent = learned
        ? `Current: ${formatLevelStats(definition, currentLevelData)}${nextLevelData ? `\nNext: ${formatLevelStats(definition, nextLevelData)}` : ''}`
        : `Level 1: ${formatLevelStats(definition, currentLevelData)}`;
      levels.style.whiteSpace = 'pre-line';

      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'active-skill-card__action';
      if (!learned) {
        action.disabled = !learnStatus.ok;
        action.textContent = learnStatus.ok
          ? `Learn for ${definition.learnCostXp.toLocaleString()} XP`
          : `Need ${definition.learnCostXp.toLocaleString()} XP`;
        action.addEventListener('click', () => this.onLearnSkill?.(definition.id));
      } else if (upgradeStatus?.reason === 'MAX_LEVEL') {
        action.disabled = true;
        action.textContent = 'Max Level';
      } else {
        const cost = upgradeStatus?.costXp ?? definition.upgradeCostsXp[level - 1];
        action.disabled = !upgradeStatus?.ok;
        action.textContent = upgradeStatus?.ok
          ? `Upgrade to Lv${level + 1} for ${cost.toLocaleString()} XP`
          : `Need ${cost.toLocaleString()} XP`;
        action.addEventListener('click', () => this.onUpgradeSkill?.(definition.id));
      }

      card.append(titleRow, description, levels, action);
      view.append(card);
    }

    return view;
  }
}
