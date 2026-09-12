import { GAUGE_RESULT, isCriticalResult } from './GaugeController.js';
import { SKILL_DEFINITIONS } from '../progression/skillDefinitions.js';
import {
  calculateComboMultiplier,
  calculateDogReward,
  calculatePlayerReward,
  getNextCombo,
} from './RewardCalculator.js';

export const MAX_TARGET_HP = 2_147_483_647;

export function distributeDamage(totalDamage, targetCount) {
  const damage = Number.isFinite(totalDamage) ? Math.max(0, Math.floor(totalDamage)) : 0;
  const count = Number.isFinite(targetCount) ? Math.max(0, Math.floor(targetCount)) : 0;
  if (count === 0) return [];
  const baseDamage = Math.floor(damage / count);
  const remainder = damage % count;
  return Array.from({ length: count }, (_, index) => baseDamage + (index < remainder ? 1 : 0));
}

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
    gameScene, hud, gaugeView, activeSkillBar, saveManager,
    onOpenUpgrades, onOpenSettings, onCompleted,
    challengeRules = null, onChallengeFinished, random = Math.random,
  }) {
    Object.assign(this, {
      gameState, gaugeController, throwController, dogController, progressionManager,
      gameScene, hud, gaugeView, activeSkillBar, saveManager,
      onOpenUpgrades, onOpenSettings, onCompleted,
      challengeRules, onChallengeFinished,
    });
    this.random = typeof random === 'function' ? random : Math.random;
    this.state = GAMEPLAY_STATE.PAUSED;
    this.previousStateBeforePause = GAMEPLAY_STATE.READY;
    this.pauseReason = null;
    this.finalChallengeActive = false;
    this.finalChallengePending = false;
    this.finalChallengeCompleting = false;
    this.challengeHits = 0;
    this.challengeRunCompleting = false;
    this.maxPlayerBoomerangCount = 0;
    this.currentPlayerBoomerangCount = 0;
    this.missedBoomerangReloads = [];
    this.targetHitPoints = Array.from({ length: 4 }, () => MAX_TARGET_HP);
    this.skillRuntime = Object.fromEntries(
      SKILL_DEFINITIONS.map(({ id }) => [id, { activeRemainingSeconds: 0, cooldownRemainingSeconds: 0 }]),
    );
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
    return this.state !== GAMEPLAY_STATE.PAUSED && !this.finalChallengeCompleting && !this.challengeRunCompleting && documentVisible;
  }

  update(deltaSeconds) {
    if (!this.isActivePlay()) return;
    this.gameState.incrementStat('activePlaySeconds', deltaSeconds);
    this.updateActiveSkills(deltaSeconds);
    this.dogController.update(deltaSeconds);
    this.updateMissedBoomerangs(deltaSeconds);

    if ([GAMEPLAY_STATE.READY, GAMEPLAY_STATE.FINAL_CHALLENGE].includes(this.state)) {
      const previousPosition = this.gaugeController.position;
      const reachesEnd = previousPosition + deltaSeconds / this.gaugeController.oneWaySeconds >= 1;
      this.gaugeController.update(deltaSeconds);
      if (reachesEnd) this.gaugeController.setSegmentCount(this.currentPlayerBoomerangCount);
      this.tryAutoFirstBoomerang({ previousPosition, startedNewSweep: reachesEnd });
    }
    this.renderMirrors();
  }

  activateSkill(skillId) {
    if (!this.isActivePlay() || !this.progressionManager.hasSkill(skillId)) return false;
    const runtime = this.skillRuntime[skillId];
    const definition = this.progressionManager.getSkillRuntimeDefinition(skillId);
    if (!runtime || !definition || runtime.activeRemainingSeconds > 0 || runtime.cooldownRemainingSeconds > 0) return false;
    runtime.activeRemainingSeconds = definition.durationSeconds;
    this.applyActiveSkillEffects();
    this.renderMirrors();
    return true;
  }

  updateActiveSkills(deltaSeconds) {
    for (const skillId of Object.keys(this.skillRuntime)) {
      const runtime = this.skillRuntime[skillId];
      if (runtime.activeRemainingSeconds > 0) {
        const before = runtime.activeRemainingSeconds;
        runtime.activeRemainingSeconds = Math.max(0, before - deltaSeconds);
        if (before > 0 && runtime.activeRemainingSeconds === 0) {
          runtime.cooldownRemainingSeconds = this.progressionManager.getSkillRuntimeDefinition(skillId)?.cooldownSeconds ?? 0;
        }
      } else if (runtime.cooldownRemainingSeconds > 0) {
        runtime.cooldownRemainingSeconds = Math.max(0, runtime.cooldownRemainingSeconds - deltaSeconds);
      }
    }
    this.applyActiveSkillEffects();
  }

  getGameplayEffects() {
    const effects = { ...this.progressionManager.getDerivedEffects() };
    effects.missReturnChance = 0;
    effects.gaugeSpeedMultiplier = 1;
    effects.autoFirstBoomerang = false;

    if (this.skillRuntime.rapidRecall?.activeRemainingSeconds > 0) {
      const level = this.progressionManager.getSkillRuntimeDefinition('rapidRecall');
      effects.missReturnChance = level?.missReturnChance ?? 0;
      effects.gaugeSpeedMultiplier = 1 + (level?.gaugeSpeedBonus ?? 0);
    }
    if (this.skillRuntime.openingBullseye?.activeRemainingSeconds > 0) {
      effects.autoFirstBoomerang = true;
    }
    if (this.challengeRules?.disableMissReturns) effects.missReturnChance = 0;
    return effects;
  }

  applyActiveSkillEffects() {
    let speedMultiplier = this.getGameplayEffects().gaugeSpeedMultiplier;
    const minimumGaugeSeconds = this.challengeRules?.minGaugeOneWaySeconds;
    if (Number.isFinite(minimumGaugeSeconds) && minimumGaugeSeconds > 0) {
      const maximumMultiplier = this.gaugeController.baseOneWaySeconds / minimumGaugeSeconds;
      speedMultiplier = Math.min(speedMultiplier, Math.max(1, maximumMultiplier));
    }
    this.gaugeController.setSpeedMultiplier(speedMultiplier);
  }

  getActiveSkillUiState() {
    return Object.fromEntries(SKILL_DEFINITIONS.map((definition) => {
      const runtime = this.skillRuntime[definition.id];
      return [definition.id, {
        name: definition.name,
        learned: this.progressionManager.hasSkill(definition.id),
        level: this.progressionManager.getSkillLevel(definition.id),
        activeRemainingSeconds: runtime?.activeRemainingSeconds ?? 0,
        cooldownRemainingSeconds: runtime?.cooldownRemainingSeconds ?? 0,
      }];
    }));
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
    this.currentPlayerBoomerangCount = Math.min(this.maxPlayerBoomerangCount, this.currentPlayerBoomerangCount + restored);
    if (!hadBoomerangs && this.currentPlayerBoomerangCount > 0) {
      this.gaugeController.setSegmentCount(this.currentPlayerBoomerangCount);
      this.gaugeController.resetFromEdge();
    }
  }

  handlePointerDown(event) {
    if (event.defaultPrevented || this.finalChallengeCompleting || this.challengeRunCompleting) return;
    if (![GAMEPLAY_STATE.READY, GAMEPLAY_STATE.FINAL_CHALLENGE].includes(this.state)) return;
    this.resolvePlayerInput();
  }

  resolvePlayerInput() {
    const effects = this.getGameplayEffects();
    if (effects.autoFirstBoomerang && this.gaugeController.getSegmentIndex() === 0) return;
    if (!this.gaugeController.consumeCurrentSegment()) return;
    this.resolvePlayerThrow(this.gaugeController.classify(), { effects, manual: true });
  }

  tryAutoFirstBoomerang({ previousPosition, startedNewSweep = false }) {
    const effects = this.getGameplayEffects();
    if (!effects.autoFirstBoomerang || this.gaugeController.segmentCount === 0) return;
    if (this.gaugeController.consumedSegments.has(0)) return;
    const firstCenter = 0.5 / this.gaugeController.segmentCount;
    const sweepStart = startedNewSweep ? 0 : previousPosition;
    if (sweepStart > firstCenter || this.gaugeController.position < firstCenter) return;
    if (!this.gaugeController.consumeSegment(0)) return;
    this.resolvePlayerThrow(this.gaugeController.classify(firstCenter), { effects, manual: false });
  }

  resolvePlayerThrow(result, { effects = this.getGameplayEffects(), manual = true } = {}) {
    if (manual) this.gameState.incrementStat('manualThrows');
    const nextCombo = getNextCombo(this.gameState.gameplay.combo, result, effects.comboUnlocked);
    this.gameState.setCombo(nextCombo);
    const comboMultiplier = effects.comboUnlocked ? calculateComboMultiplier(nextCombo, { maxBonus: effects.comboMaxBonus }) : 1;
    const throwData = this.throwController.resolvePlayerThrow({ result, boomerangCount: 1, targetCount: effects.targetCount });
    let damageDealt = 0;
    let challengeEnded = false;

    if (result === GAUGE_RESULT.MISS) {
      this.gameState.incrementStat('misses');
      const returnedImmediately = effects.missReturnChance > 0 && this.random() < effects.missReturnChance;
      if (!returnedImmediately) {
        this.currentPlayerBoomerangCount = Math.max(0, this.currentPlayerBoomerangCount - 1);
        if (this.challengeRules?.permanentMissLoss) {
          challengeEnded = this.currentPlayerBoomerangCount === 0;
        } else {
          this.missedBoomerangReloads.push(effects.missReloadSeconds);
        }
      }
    } else {
      this.gameState.incrementStat('hits');
      if (isCriticalResult(result)) this.gameState.incrementStat('criticals');
      this.gameState.incrementStat('targetsHit', throwData.rewardedTargetHits);
      if (this.challengeRules) {
        this.challengeHits += 1;
        const nextGaugeSeconds = this.challengeRules.getGaugeOneWaySeconds?.(this.challengeHits);
        if (Number.isFinite(nextGaugeSeconds) && nextGaugeSeconds > 0) {
          this.gaugeController.setBaseOneWaySeconds(nextGaugeSeconds);
          this.applyActiveSkillEffects();
        }
      }
      damageDealt = calculatePlayerReward({
        result,
        boomerangCount: 1,
        targetCount: effects.targetCount,
        globalTrainingMultiplier: effects.globalTrainingMultiplier,
        challengeDamageMultiplier: effects.challengeDamageMultiplier,
        criticalMultiplier: effects.criticalMultiplier,
        comboMultiplier,
        boomerangMasteryMultiplier: effects.boomerangMasteryMultiplier,
      });
      this.applyTargetDamage(damageDealt, effects.targetCount, {
        critical: isCriticalResult(result),
        reducedMotion: this.gameState.settings.reducedMotion,
      });
      this.gameState.addXp(damageDealt, 'player');
      if (this.finalChallengeActive && isCriticalResult(result)) this.completeFinalChallenge();
    }

    void this.gameScene.playPlayerThrow({ ...throwData, reducedMotion: this.gameState.settings.reducedMotion });
    this.gameScene.playResultFeedback(isCriticalResult(result) ? GAUGE_RESULT.CRITICAL : result);
    this.hud.showPlayerResult({ result, awardedXp: damageDealt, targetCount: effects.targetCount, reducedMotion: this.gameState.settings.reducedMotion });
    this.renderMirrors();
    if (challengeEnded) this.finishChallengeRun();
  }

  handleDogThrow({ critical }) {
    if (this.state === GAMEPLAY_STATE.PAUSED || this.finalChallengeActive || this.finalChallengePending || this.finalChallengeCompleting || this.challengeRunCompleting) return;
    const effects = this.getGameplayEffects();
    if (!effects.dogUnlocked) return;
    const throwData = this.throwController.resolveDogThrow({ targetCount: effects.targetCount, critical });
    const damageDealt = calculateDogReward({
      targetCount: effects.targetCount,
      dogXpFactor: effects.dogXpFactor,
      globalTrainingMultiplier: effects.globalTrainingMultiplier,
      challengeDamageMultiplier: effects.challengeDamageMultiplier,
      dogCritical: critical,
    });
    this.applyTargetDamage(damageDealt, effects.targetCount, { critical, reducedMotion: this.gameState.settings.reducedMotion });
    this.gameState.addXp(damageDealt, 'dog');
    this.gameState.incrementStat('dogThrows');
    this.gameState.incrementStat('targetsHit', effects.targetCount);
    if (critical) this.gameState.incrementStat('dogCriticals');
    void this.gameScene.playDogThrow({ ...throwData, reducedMotion: this.gameState.settings.reducedMotion });
    this.hud.showDogResult({ critical, awardedXp: damageDealt, targetCount: effects.targetCount, reducedMotion: this.gameState.settings.reducedMotion });
  }

  syncTargetHealth(targetCount) {
    this.hud.renderTargetHealth?.({ currentHp: this.targetHitPoints.slice(0, targetCount), maxHp: MAX_TARGET_HP });
  }

  applyTargetDamage(totalDamage, targetCount, { critical = false, reducedMotion = false } = {}) {
    const damages = distributeDamage(totalDamage, targetCount);
    damages.forEach((damage, index) => { this.targetHitPoints[index] = Math.max(0, this.targetHitPoints[index] - damage); });
    this.syncTargetHealth(targetCount);
    this.hud.showTargetDamage?.({ damages, critical, reducedMotion });
    return damages;
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
    if (this.state !== GAMEPLAY_STATE.PAUSED || this.challengeRunCompleting) return;
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
    this.currentPlayerBoomerangCount = Math.min(this.maxPlayerBoomerangCount, this.currentPlayerBoomerangCount + addedBoomerangs);
    this.gaugeController.setZoneWidths(effects.gaugeZoneWidths);
    this.applyActiveSkillEffects();
    if (addedBoomerangs > 0) this.gaugeController.setSegmentCount(this.currentPlayerBoomerangCount);
    this.gameScene.setPlayerBoomerangCount(effects.playerBoomerangCount);
    this.gameScene.setTargetCount(effects.targetCount);
    this.syncTargetHealth(effects.targetCount);
    this.gameScene.setDogVisible(effects.dogUnlocked);
    this.dogController.configure({ unlocked: effects.dogUnlocked, intervalSeconds: effects.dogIntervalSeconds, criticalChance: effects.dogCriticalChance });
    if (!this.challengeRules && this.progressionManager.hasUpgrade('grandmaster') && !this.gameState.progression.gameCompleted) this.startFinalChallenge();
  }

  finishChallengeRun() {
    if (!this.challengeRules || this.challengeRunCompleting) return;
    this.challengeRunCompleting = true;
    this.previousStateBeforePause = this.state;
    this.state = GAMEPLAY_STATE.PAUSED;
    this.pauseReason = 'challenge-complete';
    this.gaugeController.stop();
    this.dogController.pause();
    this.onChallengeFinished?.({ hits: this.challengeHits });
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
      challengeHits: this.challengeRules ? this.challengeHits : null,
      gaugeOneWaySeconds: this.challengeRules ? this.gaugeController.oneWaySeconds : null,
    });
    this.activeSkillBar?.render(this.getActiveSkillUiState());
  }
}
