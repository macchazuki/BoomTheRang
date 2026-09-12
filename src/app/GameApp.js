import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { GameState } from '../gameplay/GameState.js';
import { GameController } from '../gameplay/GameController.js';
import { GaugeController } from '../gameplay/GaugeController.js';
import { ThrowController } from '../gameplay/ThrowController.js';
import { DogController } from '../gameplay/DogController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';
import { SaveManager } from '../persistence/SaveManager.js';
import { createDefaultSave } from '../persistence/defaultSave.js';
import { ChallengeManager } from '../challenges/ChallengeManager.js';
import { getChallengeGaugeOneWaySeconds } from '../challenges/challengeDefinitions.js';
import { HUD } from '../ui/HUD.js';
import { GaugeView } from '../ui/GaugeView.js';
import { ActiveSkillBar } from '../ui/ActiveSkillBar.js';
import { UpgradePanel } from '../ui/ProgressionPanel.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';
import { CompletionPanel } from '../ui/CompletionPanel.js';
import { ChallengePanel } from '../ui/ChallengePanel.js';
import { clampDeltaSeconds } from '../game.js';

export class GameApp {
  constructor({ mountElement, saveKey } = {}) {
    this.mountElement = mountElement;
    this.saveManager = new SaveManager(saveKey ? { key: saveKey } : undefined);
    this.accountGameState = new GameState(this.saveManager.load());
    this.gameState = this.accountGameState;
    this.progressionManager = new ProgressionManager(this.gameState);
    this.challengeManager = new ChallengeManager(this.accountGameState);
    this.activeChallenge = null;
    this.debugTimeScale = 1;
    this.mainMenuScene = null;
    this.gameScene = null;
    this.gameController = null;
    this.gaugeController = null;
    this.throwController = null;
    this.dogController = null;
    this.hud = null;
    this.gaugeView = null;
    this.activeSkillBar = null;
    this.upgradePanel = null;
    this.settingsPanel = null;
    this.completionPanel = null;
    this.challengePanel = null;
    this.challengeButtonsHost = null;
    this.animationFrameId = null;
    this.previousFrameMs = null;
    this.lastPeriodicSaveSeconds = 0;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.frame = this.frame.bind(this);
  }

  start() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.showMainMenu();
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  dispose() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    this.disposeGameplay();
    this.mainMenuScene?.unmount();
    this.mountElement.replaceChildren();
  }

  useGameState(gameState) {
    this.gameState = gameState;
    this.progressionManager = new ProgressionManager(gameState);
  }

  restoreAccountState() {
    if (this.accountGameState) this.useGameState(this.accountGameState);
  }

  showMainMenu() {
    this.disposeGameplay();
    this.activeChallenge = null;
    this.restoreAccountState();
    this.mainMenuScene?.unmount();
    this.mainMenuScene = new MainMenuScene({
      mountElement: this.mountElement,
      onStartGame: () => this.startGame(),
      onOpenSettings: () => this.openSettings({ returnTo: 'menu' }),
    });
    const uiHosts = this.mainMenuScene.mount();
    this.settingsPanel = new SettingsPanel({
      mountElement: uiHosts.overlay,
      gameState: this.gameState,
      onChange: () => this.saveCurrentSettings(),
      onClose: () => this.settingsPanel?.close(),
    });
  }

  startGame() {
    this.activeChallenge = null;
    this.restoreAccountState();
    this.startGameplay();
  }

  startChallenge(challengeId) {
    const attempt = this.challengeManager.startAttempt(challengeId);
    if (!attempt.ok) {
      this.challengePanel?.render();
      return attempt;
    }

    this.saveManager.save(this.accountGameState.toSaveData());
    this.disposeGameplay();

    const freshSave = createDefaultSave();
    freshSave.settings = { ...this.accountGameState.settings };
    const challengeState = new GameState(freshSave);
    this.useGameState(challengeState);
    this.activeChallenge = { id: challengeId, definition: attempt.definition };
    this.startGameplay({ challengeDefinition: attempt.definition });
    return attempt;
  }

  startGameplay({ challengeDefinition = null } = {}) {
    this.mainMenuScene?.unmount();
    this.mainMenuScene = null;
    this.lastPeriodicSaveSeconds = 0;
    this.gameScene = new GameScene({ mountElement: this.mountElement });
    const uiHosts = this.gameScene.mount();
    this.challengeButtonsHost = uiHosts.challengeButtons;
    if (uiHosts.skillsButton) {
      uiHosts.skillsButton.textContent = 'Upgrades';
      uiHosts.skillsButton.setAttribute('aria-label', 'Open upgrades and skills');
    }
    this.gaugeController = new GaugeController({ zoneWidths: this.progressionManager.getDerivedEffects().gaugeZoneWidths });
    this.throwController = new ThrowController();
    this.hud = new HUD({ mountElement: uiHosts.hud });
    this.gaugeView = new GaugeView({ mountElement: uiHosts.gauge });
    this.activeSkillBar = new ActiveSkillBar({ mountElement: uiHosts.gameplayArea, onActivate: (skillId) => this.gameController?.activateSkill(skillId) });
    this.upgradePanel = new UpgradePanel({
      mountElement: uiHosts.overlay,
      progressionManager: this.progressionManager,
      onPurchase: (upgradeId) => this.purchaseUpgrade(upgradeId),
      onLearnSkill: (skillId) => this.learnSkill(skillId),
      onUpgradeSkill: (skillId) => this.upgradeSkill(skillId),
      onClose: () => this.closeModal(),
    });
    this.settingsPanel = new SettingsPanel({ mountElement: uiHosts.overlay, gameState: this.gameState, onChange: () => this.saveCurrentSettings(), onClose: () => this.closeModal() });
    this.completionPanel = new CompletionPanel({ mountElement: uiHosts.overlay, onContinue: () => this.closeModal() });
    this.challengePanel = challengeDefinition ? null : new ChallengePanel({
      mountElement: uiHosts.overlay,
      challengeManager: this.challengeManager,
      onStart: (challengeId) => this.startChallenge(challengeId),
      onClose: () => this.closeModal(),
    });
    this.renderChallengeButtons();
    this.dogController = new DogController({ onThrow: (dogThrow) => this.gameController?.handleDogThrow(dogThrow) });
    const challengeRules = challengeDefinition ? {
      permanentMissLoss: true,
      disableMissReturns: true,
      minGaugeOneWaySeconds: challengeDefinition.minGaugeOneWaySeconds,
      getGaugeOneWaySeconds: (hits) => getChallengeGaugeOneWaySeconds(challengeDefinition.id, hits),
    } : null;
    this.gameController = new GameController({
      gameState: this.gameState,
      gaugeController: this.gaugeController,
      throwController: this.throwController,
      dogController: this.dogController,
      progressionManager: this.progressionManager,
      gameScene: this.gameScene,
      hud: this.hud,
      gaugeView: this.gaugeView,
      activeSkillBar: this.activeSkillBar,
      saveManager: this.saveManager,
      challengeRules,
      onChallengeFinished: challengeDefinition ? (result) => this.finishChallenge(result) : null,
      onOpenUpgrades: () => this.openUpgrades(),
      onOpenSettings: () => this.openSettings({ returnTo: 'game' }),
      onCompleted: () => this.openCompletion(),
    });
    this.gameController.start();
  }

  renderChallengeButtons() {
    if (!this.challengeButtonsHost) return;
    this.challengeButtonsHost.replaceChildren();
    if (this.activeChallenge) return;

    for (const status of this.challengeManager.getStatuses().filter(({ unlocked }) => unlocked)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'challenge-button';
      button.textContent = status.definition.name;
      button.setAttribute('aria-label', `Open ${status.definition.name}`);
      button.addEventListener('click', () => this.openChallenges());
      this.challengeButtonsHost.append(button);
    }
  }

  openChallenges() {
    if (!this.gameController || !this.challengePanel) return;
    this.gameController.pause('challenge-panel');
    this.upgradePanel?.close();
    this.settingsPanel?.close();
    this.challengePanel.open();
  }

  openUpgrades() {
    if (!this.gameController) return;
    this.gameController.pause('upgrade-panel');
    this.upgradePanel?.open();
  }

  openSettings({ returnTo }) {
    if (returnTo === 'game' && this.gameController) {
      this.gameController.pause('settings-panel');
      this.settingsPanel?.open();
      return;
    }
    this.settingsPanel?.open();
  }

  closeModal() {
    this.upgradePanel?.close();
    this.settingsPanel?.close();
    this.completionPanel?.close();
    this.challengePanel?.close();
    this.gameController?.resume();
  }

  openCompletion() {
    this.gameController?.pause('completion-panel');
    this.completionPanel?.open(this.gameState.stats);
  }

  finishChallenge({ hits }) {
    const challengeId = this.activeChallenge?.id;
    if (!challengeId) return;

    const result = this.challengeManager.recordResult(challengeId, hits);
    this.saveManager.save(this.accountGameState.toSaveData());
    this.disposeGameplay();
    this.activeChallenge = null;
    this.restoreAccountState();
    this.startGameplay();
    this.gameController?.pause('challenge-panel');
    this.challengePanel?.open(result);
  }

  saveCurrentSettings() {
    if (this.activeChallenge) {
      this.accountGameState.updateSettings(this.gameState.settings);
      this.saveManager.save(this.accountGameState.toSaveData());
      return;
    }
    this.saveManager.save(this.gameState.toSaveData());
  }

  purchaseUpgrade(upgradeId) {
    const result = this.progressionManager.purchase(upgradeId);
    if (!result.ok) return result;
    this.gameController?.applyProgressionEffects(this.progressionManager.getDerivedEffects());
    if (!this.activeChallenge) {
      this.saveManager.save(this.gameState.toSaveData());
      this.renderChallengeButtons();
    }
    this.upgradePanel?.render();
    return result;
  }

  learnSkill(skillId) {
    const result = this.progressionManager.learnSkill(skillId);
    if (!result.ok) return result;
    if (!this.activeChallenge) this.saveManager.save(this.gameState.toSaveData());
    this.gameController?.renderMirrors();
    this.upgradePanel?.render();
    return result;
  }

  upgradeSkill(skillId) {
    const result = this.progressionManager.upgradeSkill(skillId);
    if (!result.ok) return result;
    if (!this.activeChallenge) this.saveManager.save(this.gameState.toSaveData());
    this.gameController?.renderMirrors();
    this.upgradePanel?.render();
    return result;
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.gameController?.pause('document-hidden');
      const stateToSave = this.activeChallenge ? this.accountGameState : this.gameState;
      this.saveManager.save(stateToSave.toSaveData());
    } else {
      this.previousFrameMs = performance.now();
      const gameplayModalOpen = this.upgradePanel?.isOpen || this.settingsPanel?.isOpen || this.completionPanel?.isOpen || this.challengePanel?.isOpen;
      if (this.gameController?.pauseReason === 'document-hidden' && !gameplayModalOpen) this.gameController.resume();
    }
  }

  frame(frameMs) {
    const rawDelta = this.previousFrameMs === null ? 0 : (frameMs - this.previousFrameMs) / 1000;
    const deltaSeconds = clampDeltaSeconds(rawDelta) * (this.debugTimeScale ?? 1);
    this.previousFrameMs = frameMs;
    this.gameController?.update(deltaSeconds);
    this.gameScene?.update(deltaSeconds);
    if (!this.activeChallenge && this.gameController?.isActivePlay()) {
      this.lastPeriodicSaveSeconds += deltaSeconds;
      if (this.lastPeriodicSaveSeconds >= 20) {
        this.saveManager.save(this.gameState.toSaveData());
        this.lastPeriodicSaveSeconds = 0;
      }
    }
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  disposeGameplay() {
    this.gameController?.dispose();
    this.activeSkillBar?.dispose();
    this.gameScene?.dispose();
    this.gameController = null;
    this.gameScene = null;
    this.gaugeController = null;
    this.throwController = null;
    this.dogController = null;
    this.hud = null;
    this.gaugeView = null;
    this.activeSkillBar = null;
    this.upgradePanel = null;
    this.settingsPanel = null;
    this.completionPanel = null;
    this.challengePanel = null;
    this.challengeButtonsHost = null;
  }
}
