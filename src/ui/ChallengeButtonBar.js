export class ChallengeButtonBar {
  constructor({ mountElement, challengeManager, onStart }) {
    this.mountElement = mountElement;
    this.challengeManager = challengeManager;
    this.onStart = onStart;
    this.intervalId = null;
  }

  start() {
    this.render();
    this.intervalId = window.setInterval(() => this.render(), 1000);
  }

  render() {
    if (!this.mountElement || !this.challengeManager) return;

    const fragment = document.createDocumentFragment();
    for (const status of this.challengeManager.getStatuses().filter(({ unlocked }) => unlocked)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'challenge-button';
      button.dataset.challengeId = status.definition.id;
      button.disabled = !status.canStart;
      button.addEventListener('click', () => this.onStart?.(status.definition.id));

      const name = document.createElement('span');
      name.className = 'challenge-button__name';
      name.textContent = status.definition.name;

      const state = document.createElement('span');
      state.className = 'challenge-button__state';
      state.textContent = status.cooldownRemainingMs > 0
        ? `Cooldown ${this.formatDuration(status.cooldownRemainingMs)}`
        : status.level > 1
          ? `${status.effectiveDefinition.tierName} · Ready`
          : 'Ready';

      button.append(name, state);
      fragment.append(button);
    }

    this.mountElement.replaceChildren(fragment);
  }

  formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  dispose() {
    if (this.intervalId !== null) window.clearInterval(this.intervalId);
    this.intervalId = null;
    this.mountElement?.replaceChildren();
  }
}
