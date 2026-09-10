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

  /** Create one card; button state comes from ProgressionManager status. */
  createUpgradeCard(definition) {
    const status = this.progressionManager.getPurchaseStatus(definition.id);
    const purchased = this.progressionManager.hasUpgrade(definition.id);

    const card = document.createElement('article');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <strong>${definition.name}</strong>
      <span>${definition.description}</span>
      <span>Cost: ${definition.costXp.toLocaleString()} XP</span>
      <span>${purchased ? 'Purchased' : status.ok ? 'Available' : status.reason}</span>
    `;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = purchased ? 'Purchased' : 'Buy';
    button.disabled = !status.ok;
    button.addEventListener('click', () => this.onPurchase(definition.id));

    card.append(button);
    return card;
  }
}
