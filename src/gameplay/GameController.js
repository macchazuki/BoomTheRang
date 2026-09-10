import { GAUGE_RESULT } from './GaugeController.js';
import {
  calculateComboMultiplier,
  calculateDogReward,
  calculatePlayerReward,
  getNextCombo,
} from './RewardCalculator.js';
import { BALANCE } from '../progression/balance.js';

export const GAMEPLAY_STATE = Object.freeze({
  READY: 'READY',
  PLAYER_THROW: 'PLAYER_THROW',
  MISS_RELOAD: 'MISS_RELOAD',
  FINAL_CHALLENGE: 'FINAL_CHALLENGE',
  PAUSED: 'PAUSED',
});

/**
 * Central gameplay orchestrator/state machine.
 *
 * This is the only module that accepts gameplay pointer input and decides whether
 * a tap is legal. It coordinates models/views but does not construct meshes or DOM.
 */
export class GameController {
  constructor({
    gameState,
    gaugeController,
    throwController,
    dogController,
    progressionManager,
    gameScene,
    hud,
    gaugeView,
    saveManager,
    onOpenUpgrades,
    onOpenSettings,
    onCompleted,
  }) {
    Object.assign(this, {
      gameState,
      gaugeController,
      throwController,
      dogController,
      progressionManager,
      gameScene,
      hud,
      gaugeView,
      saveManager,
      onOpenUpgrades,
      onOpenSettings,
      onCompleted,
    });

    this.state = GAMEPLAY_STATE.PAUSED;
    this.previousStateBeforePause = GAMEPLAY_STATE.READY;
    this.pauseReason = null;
    this.reloadRemainingSeconds = 0;
    this.successRecoveryRemainingSeconds = 0;

    this.handlePointerDown = this.handlePointerDown.bind(this);
  }

  /** Start gameplay and bind one pointer path for touch/mouse/stylus. */
  start() {
    this.gameScene.bindInput({
      onGameplayPointer: this.handlePointerDown,
      onOpenSkills: this.onOpenUpgrades,
      onOpenSettings: this.onOpenSettings,
    });

    this.applyProgressionEffects(this.progressionManager.getDerivedEffects());

    // applyProgressionEffects may have entered the final challenge.
    if (this.state !== GAMEPLAY_STATE.FINAL_CHALLENGE) {
      this.state = GAMEPLAY_STATE.READY;
      this.gaugeController.resetFromEdge();
      this.dogController.resume();
    }

    this.renderMirrors();
  }

  /** No-op lifecycle hook reserved for symmetry/future listener cleanup. */
  dispose() {
    this.dogController.pause();
  }

  /** Return whether active-play seconds should increment this frame. */
  isActivePlay() {
    return this.state !== GAMEPLAY_STATE.PAUSED && !document.hidden;
  }

  /** Apply one frame of elapsed-time logic. */
  update(deltaSeconds) {
    if (this.state === GAMEPLAY_STATE.PAUSED) return;

    this.gameState.incrementStat('activePlaySeconds', deltaSeconds);
    this.dogController.update(deltaSeconds);

    if (this.state === GAMEPLAY_STATE.READY || this.state === GAMEPLAY_STATE.FINAL_CHALLENGE) {
      this.gaugeController.update(deltaSeconds);
    }

    if (this.state === GAMEPLAY_STATE.MISS_RELOAD) {
      this.updateMissReload(deltaSeconds);
    }

    if (this.state === GAMEPLAY_STATE.PLAYER_THROW) {
      this.updateSuccessRecovery(deltaSeconds);
    }

    this.renderMirrors();
  }

  /** Accept a gameplay pointer only in READY or FINAL_CHALLENGE. */
  handlePointerDown(event) {
    if (event.defaultPrevented) return;
    if (![GAMEPLAY_STATE.READY, GAMEPLAY_STATE.FINAL_CHALLENGE].includes(this.state)) return;

    this.resolvePlayerInput();
  }

  /**
   * Lock/classify gauge, update combo/reward/state, then request deterministic animation.
   * TODO: agents may choose animation promise completion instead of a fixed recovery timer,
   * but readiness must remain an explicit state-machine decision.
   */
  resolvePlayerInput() {
    this.gaugeController.stop();
    const result = this.gaugeController.classify();
    const effects = this.progressionManager.getDerivedEffects();

    this.gameState.incrementStat('manualThrows');

    const nextCombo = getNextCombo(
      this.gameState.gameplay.combo,
      result,
      effects.comboUnlocked,
    );
    this.gameState.setCombo(nextCombo);

    const comboMultiplier = effects.comboUnlocked
      ? calculateComboMultiplier(nextCombo, {
          maxBonus: effects.comboMaxBonus,
        })
      : 1;

    const throwData = this.throwController.resolvePlayerThrow({
      result,
      boomerangCount: effects.playerBoomerangCount,
      targetCount: effects.targetCount,
    });
    let awardedXp = 0;

    if (result === GAUGE_RESULT.MISS) {
      this.gameState.incrementStat('misses');
      this.beginMissReload(effects.missReloadSeconds);
    } else {
      this.gameState.incrementStat('hits');
      if (result === GAUGE_RESULT.CRITICAL) this.gameState.incrementStat('criticals');
      this.gameState.incrementStat('targetsHit', throwData.rewardedTargetHits);

      awardedXp = calculatePlayerReward({
        result,
        boomerangCount: effects.playerBoomerangCount,
        targetCount: effects.targetCount,
        globalTrainingMultiplier: effects.globalTrainingMultiplier,
        criticalMultiplier: effects.criticalMultiplier,
        comboMultiplier,
        boomerangMasteryMultiplier: effects.boomerangMasteryMultiplier,
      });
      this.gameState.addXp(awardedXp, 'player');

      if (this.state === GAMEPLAY_STATE.FINAL_CHALLENGE && result === GAUGE_RESULT.CRITICAL) {
        this.completeFinalChallenge();
      } else {
        this.state = GAMEPLAY_STATE.PLAYER_THROW;
        this.successRecoveryRemainingSeconds = BALANCE.successRecoverySeconds;
      }
    }

    void this.gameScene.playPlayerThrow({
      ...throwData,
      reducedMotion: this.gameState.settings.reducedMotion,
    });
    this.gameScene.playResultFeedback(result);
    this.hud.showPlayerResult({ result, awardedXp });
  }

  /** Enter explicit miss cooldown. */
  beginMissReload(seconds) {
    this.state = GAMEPLAY_STATE.MISS_RELOAD;
    this.reloadRemainingSeconds = seconds;
  }

  /** Count miss reload down using elapsed time, then restart gauge. */
  updateMissReload(deltaSeconds) {
    this.reloadRemainingSeconds = Math.max(0, this.reloadRemainingSeconds - deltaSeconds);
    if (this.reloadRemainingSeconds === 0) {
      this.returnToReady();
    }
  }

  /** Count success recovery down using elapsed time, then restart gauge. */
  updateSuccessRecovery(deltaSeconds) {
    this.successRecoveryRemainingSeconds = Math.max(
      0,
      this.successRecoveryRemainingSeconds - deltaSeconds,
    );
    if (this.successRecoveryRemainingSeconds === 0) {
      this.returnToReady();
    }
  }

  /** Return to normal ready state after throw/reload. */
  returnToReady() {
    this.state = GAMEPLAY_STATE.READY;
    this.gaugeController.resetFromEdge();
  }

  /**
   * Resolve one independent dog auto-throw.
   * Dog never modifies player combo or player state.
   */
  handleDogThrow({ critical }) {
    if (this.state === GAMEPLAY_STATE.PAUSED || this.state === GAMEPLAY_STATE.FINAL_CHALLENGE) return;

    const effects = this.progressionManager.getDerivedEffects();
    if (!effects.dogUnlocked) return;

    const throwData = this.throwController.resolveDogThrow({
      targetCount: effects.targetCount,
      critical,
    });

    const reward = calculateDogReward({
      targetCount: effects.targetCount,
      dogXpFactor: effects.dogXpFactor,
      globalTrainingMultiplier: effects.globalTrainingMultiplier,
      dogCritical: critical,
    });

    this.gameState.addXp(reward, 'dog');
    this.gameState.incrementStat('dogThrows');
    this.gameState.incrementStat('targetsHit', effects.targetCount);
    if (critical) this.gameState.incrementStat('dogCriticals');

    void this.gameScene.playDogThrow({
      ...throwData,
      reducedMotion: this.gameState.settings.reducedMotion,
    });
    this.hud.showDogResult({ critical, awardedXp: reward });
  }

  /** Pause both manual gameplay and dog timing without losing current explicit state. */
  pause(reason = 'manual') {
    if (this.state === GAMEPLAY_STATE.PAUSED) return;

    this.previousStateBeforePause = this.state;
    this.state = GAMEPLAY_STATE.PAUSED;
    this.pauseReason = reason;
    this.gaugeController.stop();
    this.dogController.pause();
  }

  /** Resume from the exact pre-pause state without catch-up time. */
  resume() {
    if (this.state !== GAMEPLAY_STATE.PAUSED) return;

    this.state = this.previousStateBeforePause;
    this.pauseReason = null;

    if ([GAMEPLAY_STATE.READY, GAMEPLAY_STATE.FINAL_CHALLENGE].includes(this.state)) {
      this.gaugeController.resume();
    }
    if (this.state === GAMEPLAY_STATE.FINAL_CHALLENGE) {
      this.dogController.pause();
    } else {
      this.dogController.resume();
    }
  }

  /** Propagate derived counts/timers to systems and views after any purchase/load. */
  applyProgressionEffects(effects) {
    this.gaugeController.setZoneWidths(effects.gaugeZoneWidths);
    this.gameScene.setPlayerBoomerangCount(effects.playerBoomerangCount);
    this.gameScene.setTargetCount(effects.targetCount);
    this.gameScene.setDogVisible(effects.dogUnlocked);

    this.dogController.configure({
      unlocked: effects.dogUnlocked,
      intervalSeconds: effects.dogIntervalSeconds,
      criticalChance: effects.dogCriticalChance,
    });

    if (this.progressionManager.hasUpgrade('grandmaster') &&
        !this.gameState.progression.gameCompleted) {
      this.startFinalChallenge();
    }
  }

  /** Enter Grandmaster challenge and show its special target. */
  startFinalChallenge() {
    this.state = GAMEPLAY_STATE.FINAL_CHALLENGE;
    this.gaugeController.resetFromEdge();
    this.dogController.pause();
    this.gameScene.showGrandmasterTarget();
  }

  /** Mark final challenge complete before requesting celebratory visuals/UI. */
  completeFinalChallenge() {
    if (this.gameState.progression.gameCompleted) return;

    this.gameState.markCompleted();
    this.saveManager.save(this.gameState.toSaveData());

    void this.gameScene
      .playGrandmasterSequence({ reducedMotion: this.gameState.settings.reducedMotion })
      .finally(() => {
        this.state = GAMEPLAY_STATE.READY;
        this.dogController.resume();
        this.onCompleted?.();
      });
  }

  /** Update HUD and normalized gauge DOM mirror. */
  renderMirrors() {
    this.gaugeView.render(this.gaugeController.getSnapshot());
    this.hud.render({
      xp: this.gameState.xp,
      combo: this.gameState.gameplay.combo,
      comboUnlocked: this.progressionManager.getDerivedEffects().comboUnlocked,
      reloadRemainingSeconds: this.reloadRemainingSeconds,
      state: this.state,
    });
  }

}
