import { GAME_NAME } from '../game.js';

/**
 * DOM-only main menu screen.
 * The class is called a Scene for consistency with screen transitions; it does not use Three.js.
 */
export class MainMenuScene {
  constructor({ mountElement, onStartGame, onOpenSettings }) {
    this.mountElement = mountElement;
    this.onStartGame = onStartGame;
    this.onOpenSettings = onOpenSettings;
    this.root = null;
  }

  /**
   * Build and attach main-menu DOM.
   * Returns the overlay host so the shared SettingsPanel can be reused here.
   */
  mount() {
    const root = document.createElement('section');
    root.className = 'screen main-menu';
    root.innerHTML = `
      <div class="menu-panel">
        <p>RETURN / RECHARGE / REPEAT</p>
        <h1>${GAME_NAME}</h1>
        <p>Every throw comes back stronger.</p>
        <nav class="menu-actions" aria-label="Main menu">
          <button type="button" data-action="start">Start Game</button>
          <button type="button" data-action="settings">Settings</button>
        </nav>
      </div>
      <div class="overlay" data-overlay hidden></div>
    `;

    root.querySelector('[data-action="start"]').addEventListener('click', this.onStartGame);
    root.querySelector('[data-action="settings"]').addEventListener('click', this.onOpenSettings);

    this.mountElement.replaceChildren(root);
    this.root = root;

    return {
      overlay: root.querySelector('[data-overlay]'),
    };
  }

  /** Remove main-menu DOM and references. */
  unmount() {
    this.root?.remove();
    this.root = null;
  }
}
