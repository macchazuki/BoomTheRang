const STATUS_PRESENTATION = Object.freeze({
  purchased: Object.freeze({ className: 'purchased', label: 'Purchased' }),
  available: Object.freeze({ className: 'available', label: 'Available' }),
  INSUFFICIENT_XP: Object.freeze({ className: 'insufficient-xp', label: 'Not enough XP' }),
  PREREQUISITES: Object.freeze({ className: 'locked', label: 'Locked: prerequisites required' }),
  LIFETIME_XP_GATE: Object.freeze({ className: 'locked', label: 'Locked: lifetime XP required' }),
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
    panel.setAttribute('aria-label', 'Skills');

    const list = document.createElement('div');
    list.className = 'upgrade-list';

    for (const definition of definitions) {
      list.append(this.createUpgradeCard(definition));
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', this.onClose);

    panel.append(list, close);
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
    state.textContent = presentation.label;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = purchased ? 'Purchased' : 'Buy';
    button.disabled = !status.ok;
    button.addEventListener('click', () => this.onPurchase(definition.id));

    card.append(name, description, cost, state, button);
    return card;
  }
}
