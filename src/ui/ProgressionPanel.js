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
  constructor({ challengeManager, onUnlockChallenge, onUpgradeChallenge, onUpgradeSkill, ...options }) {
    super({ ...options, onToggleSkill: null });
    this.challengeManager = challengeManager;
    this.onUnlockChallenge = onUnlockChallenge;
    this.onUpgradeChallenge = onUpgradeChallenge;
    this.onUpgradeSkill = onUpgradeSkill;
    this.lastChallengeResult = null;
  }

  render() {
    if (!this.isOpen) return;

    const panel = document.createElement('section');
    panel.className = 'modal-panel skill-tree-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'progression-panel-title');

    const header = document.createElement('header');
    header.className = 'skill-tree-header';
    const heading = document.createElement('h2');
    heading.id = 'progression-panel-title';
    heading.textContent = 'Progression';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'skill-tree-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close progression');
    close.addEventListener('click', this.onClose);
    header.append(heading, close);

    const tabs = this.createProgressionTabs();
    const content = this.activeTab === 'skills'
      ? this.createSkillsView()
      : this.activeTab === 'challenges'
        ? this.createChallengesView()
        : this.createUpgradesView();
    panel.append(header, tabs, content);
    this.mountElement.replaceChildren(panel);

    if (this.activeTab === 'upgrades') {
      this.renderDetails();
      const viewport = panel.querySelector('.skill-tree-viewport');
      if (viewport) this.centerSelectedNode(viewport);
    }
  }

  createProgressionTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'progression-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Progression views');

    for (const [id, label] of [['upgrades', 'Upgrades'], ['skills', 'Skills'], ['challenges', 'Challenges']]) {
      const button = document.createElement('button');
      const active = this.activeTab === id;
      button.type = 'button';
      button.className = 'progression-tab';
      button.classList.toggle('progression-tab--active', active);
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.textContent = label;
      button.addEventListener('click', () => {
        if (this.activeTab === id) return;
        this.activeTab = id;
        this.render();
      });
      tabs.append(button);
    }

    return tabs;
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

  createChallengesView() {
    const view = document.createElement('div');
    view.className = 'active-skill-list';
    view.setAttribute('aria-label', 'Challenge modes');

    const summary = document.createElement('p');
    summary.textContent = `Permanent damage bonus: +${this.formatPercent(this.challengeManager?.getTotalDamageBonus() ?? 0)}`;
    view.append(summary);

    if (this.lastChallengeResult) {
      const result = document.createElement('p');
      result.setAttribute('aria-live', 'polite');
      result.textContent = `${this.lastChallengeResult.improved ? 'New best!' : 'Attempt complete.'} ${this.lastChallengeResult.hits} hits. Best: ${this.lastChallengeResult.bestHits}.`;
      view.append(result);
    }

    for (const status of this.challengeManager?.getStatuses() ?? []) {
      const {
        definition,
        effectiveDefinition,
        nextLevelDefinition,
        record,
        unlocked,
        level,
        maxLevel,
        meetsLifetimeXp,
        canUnlock,
        meetsUpgradeLifetimeXp,
        canUpgrade,
      } = status;
      const card = document.createElement('section');
      card.className = 'active-skill-card';
      card.dataset.challengeId = definition.id;

      const titleRow = document.createElement('div');
      titleRow.className = 'active-skill-card__title-row';
      const name = document.createElement('h3');
      name.textContent = definition.name;
      const badge = document.createElement('span');
      badge.className = 'active-skill-card__badge';
      badge.textContent = unlocked ? `Level ${level}/${maxLevel}` : 'Locked';
      titleRow.append(name, badge);

      const description = document.createElement('p');
      description.className = 'active-skill-card__description';
      description.textContent = definition.description;

      const meta = document.createElement('p');
      meta.className = 'active-skill-card__levels';
      if (unlocked) {
        const nextText = nextLevelDefinition
          ? `\nNext: ${nextLevelDefinition.tierName} — ${nextLevelDefinition.description}`
          : '';
        meta.textContent = `Current: ${effectiveDefinition.tierName}\nBest: ${record.bestHits} hits • Bonus: +${this.formatPercent(record.damageBonus)} • Max: +${this.formatPercent(effectiveDefinition.maxDamageBonus)}${nextText}`;
      } else {
        meta.textContent = `Level 1: ${definition.levels[0].tierName} — ${definition.levels[0].description}`;
      }
      meta.style.whiteSpace = 'pre-line';

      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'active-skill-card__action';
      if (!unlocked) {
        const firstLevel = definition.levels[0];
        action.disabled = !canUnlock;
        if (!meetsLifetimeXp) {
          action.textContent = `Locked — ${firstLevel.unlockLifetimeXp.toLocaleString()} lifetime XP required`;
        } else if (!canUnlock) {
          action.textContent = `Need ${firstLevel.unlockCostXp.toLocaleString()} XP to unlock`;
        } else {
          action.textContent = `Unlock for ${firstLevel.unlockCostXp.toLocaleString()} XP`;
        }
        action.addEventListener('click', () => this.onUnlockChallenge?.(definition.id));
      } else if (!nextLevelDefinition) {
        action.disabled = true;
        action.textContent = 'Max Level';
      } else {
        action.disabled = !canUpgrade;
        if (!meetsUpgradeLifetimeXp) {
          action.textContent = `Locked — ${nextLevelDefinition.unlockLifetimeXp.toLocaleString()} lifetime XP required`;
        } else if (!canUpgrade) {
          action.textContent = `Need ${nextLevelDefinition.unlockCostXp.toLocaleString()} XP`;
        } else {
          action.textContent = `Upgrade to ${nextLevelDefinition.tierName} for ${nextLevelDefinition.unlockCostXp.toLocaleString()} XP`;
        }
        action.addEventListener('click', () => this.onUpgradeChallenge?.(definition.id));
      }

      card.append(titleRow, description, meta, action);
      view.append(card);
    }

    return view;
  }

  showChallengeResult(result) {
    this.lastChallengeResult = result;
    this.activeTab = 'challenges';
  }

  formatPercent(value) {
    return `${(Math.max(0, Number(value) || 0) * 100).toFixed(1)}%`;
  }

  formatDuration(milliseconds) {
    const totalMinutes = Math.max(1, Math.ceil(Math.max(0, milliseconds) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
}
