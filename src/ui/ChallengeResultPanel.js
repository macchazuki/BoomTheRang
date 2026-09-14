/** Challenge attempt results overlay shown before returning to the regular run. */
export class ChallengeResultPanel {
  constructor({ mountElement, onReturn }) {
    this.mountElement = mountElement;
    this.onReturn = onReturn;
    this.isOpen = false;
  }

  open(result) {
    this.isOpen = true;
    this.mountElement.hidden = false;

    const panel = document.createElement('section');
    panel.className = 'modal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'challenge-result-title');

    const heading = document.createElement('h2');
    heading.id = 'challenge-result-title';
    heading.textContent = result.improved ? 'New Best!' : 'Challenge Complete';

    const challenge = document.createElement('p');
    challenge.textContent = result.definition?.name ?? 'Challenge';

    const hits = document.createElement('p');
    hits.textContent = `Hits: ${result.hits}`;

    const best = document.createElement('p');
    best.textContent = `Best: ${result.bestHits}`;

    const bonus = document.createElement('p');
    bonus.textContent = `Permanent damage bonus: +${this.formatPercent(result.damageBonus)}`;

    const returnButton = document.createElement('button');
    returnButton.type = 'button';
    returnButton.textContent = 'Return';
    returnButton.addEventListener('click', this.onReturn);

    panel.append(heading, challenge, hits, best, bonus, returnButton);
    this.mountElement.replaceChildren(panel);
  }

  close() {
    this.isOpen = false;
    this.mountElement.hidden = true;
    this.mountElement.replaceChildren();
  }

  formatPercent(value) {
    return `${(Math.max(0, Number(value) || 0) * 100).toFixed(1)}%`;
  }
}
