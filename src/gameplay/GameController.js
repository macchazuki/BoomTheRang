import { GAUGE_RESULT } from './GaugeController.js';
import {
  calculateComboMultiplier,
  calculateDogReward,
  calculatePlayerReward,
  getNextCombo,
} from './RewardCalculator.js';

export const GAMEPLAY_STATE = Object.freeze({
  READY: 'READY',
  PLAYER_THROW: 'PLAYER_THROW',
  MISS_RELOAD: 'MISS_RELOAD',
  FINAL_CHALLENGE: 'FINAL_CHALLENGE',
  PAUSED: 'PAUSED',
});

/** Central gameplay orchestrator/state machine. */
export class GameController {
  constructor({
    gameState, gaugeController, throwController, dogController, progressionManager,
    gameScene, hud, gaugeView, saveManager, onOpenUpgrades, onOpenSettings, onCompleted,
  }) {
    Object.assign(this, {
      gameState, gaugeController, throwController, dogController, progressionManager,
      gameScene, hud, gaugeView, saveManager, onOpenUpgrades, onOpenSettings, onCompleted,
    });
    this.state = GAMEPLAY_STATE.PAUSED;
    this.previousStateBeforePause = GAMEPLAY_STATE.READY;
    this.pauseReason = null;
    this.reloadRemainingSeconds = 0;
    this.successRecoveryRemainingSeconds = 0;
    this.finalChallengeActive = false;
    this.finalChallengePending = false;
    this.finalChallengeCompleting = false;
    this.maxPlayerBoomerangCount = 0;
    this.currentPlayerBoomerangCount = 0;
    this.missedBoomerangReloads = [];
    this.handlePointerDown = this.handlePointerDown.bind(this);
  }

  start() {
    this.gameScene.bindInput({
      onGameplayPointer: this.handlePointerDown,
      onOpenSkills: this.onOpenUpgrades,
      onOpenSettings: this.onOpenSettings,
    });
    this.applyProgressionEffects(this.progressionManager.getDerivedEffects());
    if (this.finalChallengePending) {
      this.finalChallengePending = false;
      this.enterFinalChallenge();
    } else if (this.state !== GAMEPLAY_STATE.FINAL_CHALLENGE) {
      this.state = GAMEPLAY_STATE.READY;
      this.gaugeController.resetFromEdge();
      this.dogController.resume();
    }
    this.renderMirrors();
  }

  dispose() { this.dogController.pause(); }

  isActivePlay() {
    const documentVisible = typeof document === 'undefined' || !document.hidden;
    return this.state !== GAMEPLAY_STATE.PAUSED && !this.finalChallengeCompleting && documentVisible;
  }

  update(deltaSeconds) {
    if (!this.isActivePlay()) return;
    this.gameState.incrementStat('activePlaySeconds', deltaSeconds);
    this.dogController.update(deltaSeconds);
    this.updateMissedBoomerangs(deltaSeconds);
    if ([GAMEPLAY_STATE.READY, GAMEPLAY_STATE.FINAL_CHALLENGE].includes(this.state)) {
      const reachesEnd = this.gaugeController.position + deltaSeconds / this.gaugeController.oneWaySeconds >= 1;
      this.gaugeController.update(deltaSeconds);
      if (reachesEnd) this.gaugeController.setSegmentCount(this.currentPlayerBoomerangCount);
    }
    this.renderMirrors();
  }

  updateMissedBoomerangs(deltaSeconds) {
    if (this.missedBoomerangReloads.length === 0) return;

    const hadBoomerangs = this.currentPlayerBoomerangCount > 0;
    const remainingReloads = [];
    let restored = 0;

    for (const reloadSeconds of this.missedBoomerangReloads) {
      const remaining = reloadSeconds - deltaSeconds;
      if (remaining <= 0) restored += 1;
      else remainingReloads.push(remaining);
    }

    this.missedBoomerangReloads = remainingReloads;
    this.currentPlayerBoomerangCount = Math.min(
      this.maxPlayerBoomerangCount,
      this.currentPlayerBoomerangCount + restored,
    );

    if (!hadBoomerangs && this.currentPlayerBoomerangCount > 0) {
      this.gaugeController.setSegmentCount(this.currentPlayerBoomerangCount);
      this.gaugeController.resetFromEdge();
    }
  }

  handlePointerDown(event) {
    if (event.defaultPrevented || this.finalChallengeCompleting) return;
    if (![GAMEPLAY_STATE.READY, GAMEPLAY_STATE.FINAL_CHALLENGE].includes(this.state)) return;
    this.resolvePlayerInput();
  }

  /**
   * Fire exactly one boomerang from the current timing area. The gauge keeps moving;
   * a used area rejects further taps until the marker completes the sweep.
   */
  resolvePlayerInput() {
    if (!this.gaugeController.consumeCurrentSegment()) return;

    const result = this.gaugeController.classify();
    const effects = this.progressionManager.getDerivedEffects();
    this.gameState.incrementStat('manualThrows');

    const nextCombo = getNextCombo(this.gameState.gameplay.combo, result, effects.comboUnlocked);
    this.gameState.setCombo(nextCombo);
    const comboMultiplier = effects.comboUnlocked
      ? calculateComboMultiplier(nextCombo, { maxBonus: effects.comboMaxBonus })
      : 1;

    const throwData = this.throwController.resolvePlayerThrow({
      result,
      boomerangCount: 1,
      targetCount: effects.targetCount,
    });
    let awardedXp = 0;

    if (result === GAUGE_RESULT.MISS) {
      this.gameState.incrementStat('misses');
      this.currentPlayerBoomerangCount = Math.max(0, this.currentPlayerBoomerangCount - 1);
      this.missedBoomerangReloads.push(effects.missReloadSeconds);
    } else {
      this.gameState.incrementStat('hits');
      if (result === GAUGE_RESULT.CRITICAL) this.gameState.incrementStat('criticals');
      this.gameState.incrementStat('targetsHit', throwData.rewardedTargetHits);
      awardedXp = calculatePlayerReward({
        result,
        boomerangCount: 1,
        targetCount: effects.targetCount,
        globalTrainingMultiplier: effects.globalTrainingMultiplier,
        criticalMultiplier: effects.criticalMultiplier,
        comboMultiplier,
        boomerangMasteryMultiplier: effects.boomerangMasteryMultiplier,
      });
      this.gameState.addXp(awardedXp, 'player');
      if (this.finalChallengeActive && result === GAUGE_RESULT.CRITICAL) {
        this.completeFinalChallenge();
      }
    }

    void this.gameScene.playPlayerThrow({ ...throwData, reducedMotion: this.gameState.settings.reducedMotion });
    this.gameScene.playResultFeedback(result);
    this.hud.showPlayerResult({ result, awardedXp });
    this.renderMirrors();
  }

  handleDogThrow({ critical }) {
    if (this.state === GAMEPLAY_STATE.PAUSED || this.finalChallengeActive || this.finalChallengePending || this.finalChallengeCompleting) return;
    const effects = this.progressionManager.getDerivedEffects();
    if (!effects.dogUnlocked) return;
    const throwData = this.throwController.resolveDogThrow({ targetCount: effects.targetCount, critical });
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
    void this.gameScene.playDogThrow({ ...throwData, reducedMotion: this.gameState.settings.reducedMotion });
    this.hud.showDogResult({ critical, awardedXp: reward });
  }

  pause(reason = 'manual') {
    if (this.state === GAMEPLAY_STATE.PAUSED) return;
    this.previousStateBeforePause = this.state;
    this.state = GAMEPLAY_STATE.PAUSED;
    this.pauseReason = reason;
    this.gaugeController.stop();
    this.dogController.pause();
  }

  resume() {
    if (this.state !== GAMEPLAY_STATE.PAUSED) return;
    this.pauseReason = null;
    if (this.finalChallengePending) {
      this.finalChallengePending = false;
      this.enterFinalChallenge();
      return;
    }
    this.state = this.previousStateBeforePause;
    if ([GAMEPLAY_STATE.READY, GAMEPLAY_STATE.FINAL_CHALLENGE].includes(this.state)) this.gaugeController.resume();
    if (this.finalChallengeActive || this.state === GAMEPLAY_STATE.FINAL_CHALLENGE) this.dogController.pause();
    else this.dogController.resume();
  }

  applyProgressionEffects(effects) {
    const addedBoomerangs = Math.max(0, effects.playerBoomerangCount - this.maxPlayerBoomerangCount);
    this.maxPlayerBoomerangCount = effects.playerBoomerangCount;
    this.currentPlayerBoomerangCount = Math.min(
      this.maxPlayerBoomerangCount,
      this.currentPlayerBoomerangCount + addedBoomerangs,
    );

    this.gaugeController.setZoneWidths(effects.gaugeZoneWidths);
    if (addedBoomerangs > 0) this.gaugeController.setSegmentCount(this.currentPlayerBoomerangCount);
    this.gameScene.setPlayerBoomerangCount(effects.playerBoomerangCount);
    this.gameScene.setTargetCount(effects.targetCount);
    this.gameScene.setDogVisible(effects.dogUnlocked);
    this.dogController.configure({
      unlocked: effects.dogUnlocked,
      intervalSeconds: effects.dogIntervalSeconds,
      criticalChance: effects.dogCriticalChance,
    });
    if (this.progressionManager.hasUpgrade('grandmaster') && !this.gameState.progression.gameCompleted) {
      this.startFinalChallenge();
    }
  }

  startFinalChallenge() {
    if (this.gameState.progression.gameCompleted || this.finalChallengeActive || this.finalChallengePending) return;
    if (this.state === GAMEPLAY_STATE.PAUSED) {
      this.finalChallengePending = true;
      this.dogController.pause();
      return;
    }
    this.enterFinalChallenge();
  }

  enterFinalChallenge() {
    this.finalChallengeActive = true;
    this.finalChallengePending = false;
    this.finalChallengeCompleting = false;
    this.state = GAMEPLAY_STATE.FINAL_CHALLENGE;
    this.gaugeController.resetFromEdge();
    this.dogController.pause();
    this.gameScene.showGrandmasterTarget();
  }

  completeFinalChallenge() {
    if (this.gameState.progression.gameCompleted || this.finalChallengeCompleting) return;
    this.finalChallengeCompleting = true;
    this.gameState.markCompleted();
    this.saveManager.save(this.gameState.toSaveData());
    void Promise.resolve()
      .then(() => this.gameScene.playGrandmasterSequence({ reducedMotion: this.gameState.settings.reducedMotion }))
      .finally(() => {
        this.finalChallengeCompleting = false;
        this.finalChallengeActive = false;
        this.state = GAMEPLAY_STATE.READY;
        this.gaugeController.resetFromEdge();
        this.gameScene.hideGrandmasterTarget?.();
        this.onCompleted?.();
        if (this.state === GAMEPLAY_STATE.READY) this.dogController.resume();
      });
  }

  renderMirrors() {
    this.gaugeView.render(this.gaugeController.getSnapshot());
    this.hud.render({
      xp: this.gameState.xp,
      combo: this.gameState.gameplay.combo,
      comboUnlocked: this.progressionManager.getDerivedEffects().comboUnlocked,
      reloadRemainingSeconds: 0,
      state: this.state,
    });
  }
}
