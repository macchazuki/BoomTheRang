import { UPGRADE_BY_ID } from '../progression/upgradeDefinitions.js';

const STATUS_PRESENTATION = Object.freeze({
  purchased: Object.freeze({ className: 'purchased', label: 'Purchased' }),
  available: Object.freeze({ className: 'available', label: 'Available' }),
  INSUFFICIENT_XP: Object.freeze({ className: 'insufficient-xp', label: 'Not enough XP' }),
  PREREQUISITES: Object.freeze({ className: 'locked', label: 'Locked' }),
  LIFETIME_XP_GATE: Object.freeze({ className: 'locked', label: 'Locked' }),
});

/**
 * DOM upgrade-tree/list renderer.
 * All prerequisite/affordability decisions come from ProgressionManager.
 */
export class UpgradePanel {
  constructor({ mountElement, progressionManager, onPurchase, onClose }) {
    this.mountElement = mountElement;
    this.progressionManager = progressionManager;
    this.onPurchase = onPurchase;
    this.onClose = onClose;
    this.isOpen = false;
  }

  /** Open and render current progression state. */
  open() {
    this.isOpen = true;
    this.mountElement.hidden = false;
    this.render();
  }

  /** Hide without mutating gameplay/progression. */
  close() {
    this.isOpen = false;
    this.mountElement.hidden = true;
    this.mountElement.replaceChildren();
  }

  /** Render visible upgrade cards from data definitions/status. */
  render() {
    if (!this.isOpen) return;

    const definitions = this.progressionManager.getVisibleUpgrades();
    const panel = document.createElement('section');
    panel.className = 'modal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'skills-panel-title');

    const heading = document.createElement('h2');
    heading.id = 'skills-panel-title';
    heading.textContent = 'Skills';

    const list = document.createElement('div');
    list.className = 'upgrade-list';

    for (const definition of definitions) {
      list.append(this.createUpgradeCard(definition));
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', this.onClose);

    panel.append(heading, list, close);
    this.mountElement.replaceChildren(panel);
  }

  /** Create one card; purchase rules come entirely from ProgressionManager status. */
  createUpgradeCard(definition) {
    const status = this.progressionManager.getPurchaseStatus(definition.id);
    const purchased = this.progressionManager.hasUpgrade(definition.id);
    const presentation = purchased
      ? STATUS_PRESENTATION.purchased
      : status.ok
        ? STATUS_PRESENTATION.available
        : STATUS_PRESENTATION[status.reason] ?? STATUS_PRESENTATION.PREREQUISITES;

    const card = document.createElement('article');
    card.className = `upgrade-card upgrade-card--${presentation.className}`;
    card.dataset.state = presentation.className;

    const name = document.createElement('strong');
    name.textContent = definition.name;

    const description = document.createElement('span');
    description.textContent = definition.description;

    const cost = document.createElement('span');
    cost.textContent = `Cost: ${definition.costXp.toLocaleString()} XP`;

    const state = document.createElement('span');
    state.className = 'upgrade-card__status';
    state.textContent = this.getStatusLabel(definition, status, purchased, presentation.label);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = purchased ? 'Purchased' : 'Buy';
    button.disabled = !status.ok;
    button.setAttribute(
      'aria-label',
      purchased
        ? `${definition.name} purchased`
        : `Buy ${definition.name} for ${definition.costXp.toLocaleString()} XP`,
    );
    button.addEventListener('click', () => this.onPurchase(definition.id));

    card.append(name, description, cost, state, button);
    return card;
  }

  /** Build a readable UI-only explanation for an authoritative purchase status. */
  getStatusLabel(definition, status, purchased, fallbackLabel) {
    if (purchased || status.ok) return fallbackLabel;

    if (status.reason === 'PREREQUISITES') {
      const unmet = definition.prerequisites
        .filter((id) => !this.progressionManager.hasUpgrade(id))
        .map((id) => UPGRADE_BY_ID[id]?.name ?? id);
      return `Locked: requires ${unmet.join(', ')}`;
    }

    if (status.reason === 'LIFETIME_XP_GATE') {
      return `Locked: requires ${definition.unlockLifetimeXp.toLocaleString()} lifetime XP`;
    }

    return fallbackLabel;
  }
}
