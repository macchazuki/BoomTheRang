/**
 * Final Grandmaster completion statistics overlay.
 */
export class CompletionPanel {
  constructor({ mountElement, onContinue }) {
    this.mountElement = mountElement;
    this.onContinue = onContinue;
    this.isOpen = false;
  }

  /** Show completion stats. Continued play remains available afterward. */
  open(stats) {
    this.isOpen = true;
    this.mountElement.hidden = false;

    const panel = document.createElement('section');
    panel.className = 'modal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'completion-panel-title');
    panel.innerHTML = `
      <h2 id="completion-panel-title">Grandmaster!</h2>
      <p>Manual throws: ${Math.floor(stats.manualThrows)}</p>
      <p>Criticals: ${Math.floor(stats.criticals)}</p>
      <p>Misses: ${Math.floor(stats.misses)}</p>
      <p>Dog throws: ${Math.floor(stats.dogThrows)}</p>
      <p>Longest combo: ${Math.floor(stats.longestCombo)}</p>
      <p>Active play: ${this.formatDuration(stats.activePlaySeconds)}</p>
    `;

    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.textContent = 'Continue Playing';
    continueButton.addEventListener('click', this.onContinue);
    panel.append(continueButton);

    this.mountElement.replaceChildren(panel);
  }

  /** Hide completion panel. */
  close() {
    this.isOpen = false;
    this.mountElement.hidden = true;
    this.mountElement.replaceChildren();
  }

  /** Human-readable active-play duration. */
  formatDuration(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }
}
