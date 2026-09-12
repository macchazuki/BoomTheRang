export class ChallengePanel {
  constructor({ mountElement, challengeManager, onStart, onClose }) {
    this.mountElement = mountElement;
    this.challengeManager = challengeManager;
    this.onStart = onStart;
    this.onClose = onClose;
    this.isOpen = false;
    this.lastResult = null;
  }

  open(lastResult = null) {
    this.isOpen = true;
    this.lastResult = lastResult;
    this.mountElement.hidden = false;
    this.render();
  }

  close() {
    this.isOpen = false;
    this.lastResult = null;
    this.mountElement.hidden = true;
    this.mountElement.replaceChildren();
  }

  render() {
    if (!this.isOpen) return;

    const panel = document.createElement('section');
    panel.className = 'modal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'challenge-panel-title');

    const heading = document.createElement('h2');
    heading.id = 'challenge-panel-title';
    heading.textContent = 'Challenge Modes';
    panel.append(heading);

    const intro = document.createElement('p');
    intro.textContent = 'Each attempt starts fresh with no upgrades or skills. Missed boomerangs are lost for the rest of the attempt, and the gauge speeds up after every hit.';
    panel.append(intro);

    const totalBonus = document.createElement('p');
    totalBonus.innerHTML = `<strong>Permanent damage bonus: +${this.formatPercent(this.challengeManager.getTotalDamageBonus())}</strong>`;
    panel.append(totalBonus);

    if (this.lastResult) {
      const result = document.createElement('p');
      result.setAttribute('aria-live', 'polite');
      const prefix = this.lastResult.improved ? 'New best!' : 'Attempt complete.';
      result.textContent = `${prefix} ${this.lastResult.hits} hits. Best: ${this.lastResult.bestHits} hits (+${this.formatPercent(this.lastResult.damageBonus)} damage).`;
      panel.append(result);
    }

    const list = document.createElement('div');
    list.className = 'upgrade-list';

    for (const status of this.challengeManager.getStatuses().filter(({ unlocked }) => unlocked)) {
      const { definition, record, cooldownRemainingMs, canStart } = status;
      const card = document.createElement('article');
      card.className = `upgrade-card ${canStart ? 'upgrade-card--available' : 'upgrade-card--locked'}`;

      const title = document.createElement('strong');
      title.textContent = definition.name;
      card.append(title);

      const description = document.createElement('span');
      description.textContent = definition.description;
      card.append(description);

      const best = document.createElement('span');
      best.textContent = `Best: ${record.bestHits} hits · Bonus: +${this.formatPercent(record.damageBonus)}`;
      card.append(best);

      const cap = document.createElement('span');
      cap.textContent = `Bonus cap: +${this.formatPercent(definition.maxDamageBonus)} · Cooldown: ${this.formatDuration(definition.cooldownSeconds * 1000)}`;
      card.append(cap);

      if (cooldownRemainingMs > 0) {
        const cooldown = document.createElement('span');
        cooldown.textContent = `Ready in ${this.formatDuration(cooldownRemainingMs)}`;
        card.append(cooldown);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = !canStart;
      button.textContent = cooldownRemainingMs > 0 ? 'On Cooldown' : 'Start Challenge';
      button.addEventListener('click', () => this.onStart(definition.id));
      card.append(button);

      list.append(card);
    }

    panel.append(list);

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', this.onClose);
    panel.append(close);

    this.mountElement.replaceChildren(panel);
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
