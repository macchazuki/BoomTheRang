import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { GameState } from '../gameplay/GameState.js';
import { GameController } from '../gameplay/GameController.js';
import { GaugeController } from '../gameplay/GaugeController.js';
import { ThrowController } from '../gameplay/ThrowController.js';
import { DogController } from '../gameplay/DogController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';
import { SaveManager } from '../persistence/SaveManager.js';
import { HUD } from '../ui/HUD.js';
import { GaugeView } from '../ui/GaugeView.js';
import { UpgradePanel } from '../ui/UpgradePanel.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';
import { CompletionPanel } from '../ui/CompletionPanel.js';
import { clampDeltaSeconds } from '../game.js';

/**
 * Top-level browser application.
 *
 * GameApp composes systems and owns screen/lifecycle transitions. It should not
 * contain reward formulas, upgrade rules, Three.js mesh construction, or save validation.
 */
export class GameApp {
  constructor({ mountElement }) {
    this.mountElement = mountElement;

    this.saveManager = new SaveManager();
    this.gameState = new GameState(this.saveManager.load());
    this.progressionManager = new ProgressionManager(this.gameState);

    this.mainMenuScene = null;
    this.gameScene = null;
    this.gameController = null;
    this.gaugeController = null;
    this.throwController = null;
    this.dogController = null;

    this.hud = null;
    this.gaugeView = null;
    this.upgradePanel = null;
    this.settingsPanel = null;
    this.completionPanel = null;

    this.animationFrameId = null;
    this.previousFrameMs = null;
    this.lastPeriodicSaveSeconds = 0;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.frame = this.frame.bind(this);
  }

  /** Start the app at the main menu and attach global lifecycle listeners. */
  start() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.showMainMenu();
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  /** Tear down all listeners, screens, renderer resources, and RAF ownership. */
  dispose() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.disposeGameplay();
    this.mainMenuScene?.unmount();
    this.mountElement.replaceChildren();
  }

  /** Render the main menu and wire Start/Settings transitions. */
  showMainMenu() {
    this.disposeGameplay();
    this.mainMenuScene?.unmount();

    this.mainMenuScene = new MainMenuScene({
      mountElement: this.mountElement,
      onStartGame: () => this.startGame(),
      onOpenSettings: () => this.openSettings({ returnTo: 'menu' }),
    });
    const uiHosts = this.mainMenuScene.mount();

    // Reuse the same settings implementation from both main menu and gameplay.
    this.settingsPanel = new SettingsPanel({
      mountElement: uiHosts.overlay,
      gameState: this.gameState,
      onChange: () => this.saveManager.save(this.gameState.toSaveData()),
      onClose: () => this.settingsPanel?.close(),
    });
  }

  /**
   * Compose the full gameplay screen and systems.
   * TODO implementation agents: connect all callbacks to visual/reward/save behavior.
   */
  startGame() {
    this.mainMenuScene?.unmount();
    this.mainMenuScene = null;

    this.gameScene = new GameScene({ mountElement: this.mountElement });
    const uiHosts = this.gameScene.mount();

    this.gaugeController = new GaugeController({
      zoneWidths: this.progressionManager.getDerivedEffects().gaugeZoneWidths,
    });

    this.throwController = new ThrowController();

    this.hud = new HUD({ mountElement: uiHosts.hud });
    this.gaugeView = new GaugeView({ mountElement: uiHosts.gauge });
    this.upgradePanel = new UpgradePanel({
      mountElement: uiHosts.overlay,
      progressionManager: this.progressionManager,
      onPurchase: (upgradeId) => this.purchaseUpgrade(upgradeId),
      onClose: () => this.closeModal(),
    });
    this.settingsPanel = new SettingsPanel({
      mountElement: uiHosts.overlay,
      gameState: this.gameState,
      onChange: () => this.saveManager.save(this.gameState.toSaveData()),
      onClose: () => this.closeModal(),
    });
    this.completionPanel = new CompletionPanel({
      mountElement: uiHosts.overlay,
      onContinue: () => this.closeModal(),
    });

    this.dogController = new DogController({
      onThrow: (dogThrow) => this.gameController?.handleDogThrow(dogThrow),
    });

    this.gameController = new GameController({
      gameState: this.gameState,
      gaugeController: this.gaugeController,
      throwController: this.throwController,
      dogController: this.dogController,
      progressionManager: this.progressionManager,
      gameScene: this.gameScene,
      hud: this.hud,
      gaugeView: this.gaugeView,
      saveManager: this.saveManager,
      onOpenUpgrades: () => this.openUpgrades(),
      onOpenSettings: () => this.openSettings({ returnTo: 'game' }),
      onCompleted: () => this.openCompletion(),
    });

    this.gameController.start();
  }

  /** Open the upgrade overlay and pause active play while it is visible. */
  openUpgrades() {
    if (!this.gameController) return;
    this.gameController.pause('upgrade-panel');
    this.upgradePanel?.open();
  }

  /** Open settings from either the menu or gameplay. */
  openSettings({ returnTo }) {
    if (returnTo === 'game' && this.gameController) {
      this.gameController.pause('settings-panel');
      this.settingsPanel?.open();
      return;
    }

    this.settingsPanel?.open();
  }

  /** Close a gameplay overlay and resume gameplay. */
  closeModal() {
    this.upgradePanel?.close();
    this.settingsPanel?.close();
    this.completionPanel?.close();
    this.gameController?.resume();
  }

  /** Show final statistics after Grandmaster completion. */
  openCompletion() {
    this.gameController?.pause('completion-panel');
    this.completionPanel?.open(this.gameState.stats);
  }

  /** Purchase an upgrade transactionally and immediately propagate derived effects. */
  purchaseUpgrade(upgradeId) {
    const result = this.progressionManager.purchase(upgradeId);
    if (!result.ok) return result;

    this.gameController?.applyProgressionEffects(this.progressionManager.getDerivedEffects());
    this.saveManager.save(this.gameState.toSaveData());
    this.upgradePanel?.render();
    return result;
  }

  /** Pause/snapshot when hidden; resume without granting catch-up/offline dog throws. */
  handleVisibilityChange() {
    if (document.hidden) {
      this.gameController?.pause('document-hidden');
      this.saveManager.save(this.gameState.toSaveData());
    } else {
      this.previousFrameMs = performance.now();
      this.gameController?.resume();
    }
  }

  /** Main RAF loop: update logic first, then visual mirrors. */
  frame(frameMs) {
    const rawDelta = this.previousFrameMs === null ? 0 : (frameMs - this.previousFrameMs) / 1000;
    const deltaSeconds = clampDeltaSeconds(rawDelta);
    this.previousFrameMs = frameMs;

    this.gameController?.update(deltaSeconds);
    this.gameScene?.update(deltaSeconds);

    this.lastPeriodicSaveSeconds += deltaSeconds;
    if (this.gameController?.isActivePlay() && this.lastPeriodicSaveSeconds >= 20) {
      this.saveManager.save(this.gameState.toSaveData());
      this.lastPeriodicSaveSeconds = 0;
    }

    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  /** Dispose gameplay-only systems before returning to menu or destroying the app. */
  disposeGameplay() {
    this.gameController?.dispose();
    this.gameScene?.dispose();

    this.gameController = null;
    this.gameScene = null;
    this.gaugeController = null;
    this.throwController = null;
    this.dogController = null;
    this.hud = null;
    this.gaugeView = null;
    this.upgradePanel = null;
    this.settingsPanel = null;
    this.completionPanel = null;
  }
}
