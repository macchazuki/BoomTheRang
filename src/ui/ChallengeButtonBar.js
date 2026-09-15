export class ChallengeButtonBar {
  constructor({ mountElement, challengeManager, onStart }) {
    this.mountElement = mountElement;
    this.challengeManager = challengeManager;
    this.onStart = onStart;
    this.intervalId = null;
    this.confirmation = null;
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
      button.addEventListener('click', () => this.openConfirmation(status));

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

  openConfirmation(status) {
    this.closeConfirmation();

    const definition = status.effectiveDefinition;
    const backdrop = document.createElement('div');
    backdrop.className = 'challenge-confirmation';

    const dialog = document.createElement('div');
    dialog.className = 'challenge-confirmation__dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', `Start ${definition.tierName || definition.name}`);

    const title = document.createElement('h2');
    title.className = 'challenge-confirmation__title';
    title.textContent = definition.tierName || definition.name;

    const description = document.createElement('p');
    description.className = 'challenge-confirmation__description';
    description.textContent = definition.description || status.definition.description;

    const actions = document.createElement('div');
    actions.className = 'challenge-confirmation__actions';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'challenge-confirmation__button challenge-confirmation__button--cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => this.closeConfirmation());

    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'challenge-confirmation__button challenge-confirmation__button--start';
    start.textContent = 'Start Challenge';
    start.addEventListener('click', () => {
      this.closeConfirmation();
      this.onStart?.(status.definition.id);
    });

    actions.append(cancel, start);
    dialog.append(title, description, actions);
    backdrop.append(dialog);
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) this.closeConfirmation();
    });

    document.body.append(backdrop);
    this.confirmation = backdrop;
  }

  closeConfirmation() {
    this.confirmation?.remove();
    this.confirmation = null;
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
    this.closeConfirmation();
    this.mountElement?.replaceChildren();
  }
}
