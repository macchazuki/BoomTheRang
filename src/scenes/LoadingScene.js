import { GAME_NAME } from '../game.js';

/** DOM-only startup screen shown while authored assets are preloaded. */
export class LoadingScene {
  constructor({ mountElement }) {
    this.mountElement = mountElement;
    this.root = null;
    this.progressElement = null;
    this.progressText = null;
  }

  mount() {
    const root = document.createElement('section');
    root.className = 'screen loading-screen';
    root.setAttribute('aria-label', 'Loading BoomTheRang');
    root.innerHTML = `
      <div class="loading-panel">
        <h1>${GAME_NAME}</h1>
        <p>Loading assets...</p>
        <div
          class="loading-progress"
          role="progressbar"
          aria-label="Loading assets"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="0"
        >
          <div class="loading-progress__fill" data-progress-fill></div>
        </div>
        <p class="loading-progress__text" data-progress-text aria-live="polite">0%</p>
      </div>
    `;

    this.mountElement.replaceChildren(root);
    this.root = root;
    this.progressElement = root.querySelector('.loading-progress');
    this.progressText = root.querySelector('[data-progress-text]');
    return root;
  }

  setProgress(progress) {
    const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
    const fill = this.root?.querySelector('[data-progress-fill]');
    if (fill) fill.style.width = `${percent}%`;
    this.progressElement?.setAttribute('aria-valuenow', String(percent));
    if (this.progressText) this.progressText.textContent = `${percent}%`;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
    this.progressElement = null;
    this.progressText = null;
  }
}
