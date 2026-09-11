import { describe, expect, it, vi } from 'vitest';
import { DogController } from '../gameplay/DogController.js';
import { GameController, GAMEPLAY_STATE } from '../gameplay/GameController.js';
import { GameState } from '../gameplay/GameState.js';
import { GaugeController } from '../gameplay/GaugeController.js';
import { ThrowController } from '../gameplay/ThrowController.js';
import { SaveManager } from '../persistence/SaveManager.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';
import { BALANCE } from '../progression/balance.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
  };
}

function createFixture({ storage, saveData, rng = () => 1 } = {}) {
  const saveManager = new SaveManager({ storage });
  const gameState = new GameState(saveData ?? saveManager.load());
  const progressionManager = new ProgressionManager(gameState);
  const gaugeController = new GaugeController();
  let controller;

  const dogController = new DogController({
    rng,
    onThrow: (dogThrow) => controller?.handleDogThrow(dogThrow),
  });
  const gameScene = {
    bindInput: vi.fn(),
    setPlayerBoomerangCount: vi.fn(),
    setTargetCount: vi.fn(),
    setDogVisible: vi.fn(),
    playPlayerThrow: vi.fn(() => Promise.resolve()),
    playDogThrow: vi.fn(() => Promise.resolve()),
    playResultFeedback: vi.fn(),
    showGrandmasterTarget: vi.fn(),
    hideGrandmasterTarget: vi.fn(),
    playGrandmasterSequence: vi.fn(() => Promise.resolve()),
  };
  const hud = {
    render: vi.fn(),
    showPlayerResult: vi.fn(),
    showDogResult: vi.fn(),
  };

  controller = new GameController({
    gameState,
    gaugeController,
    throwController: new ThrowController(),
    dogController,
    progressionManager,
    gameScene,
    hud,
    gaugeView: { render: vi.fn() },
    saveManager,
    onCompleted: () => controller.pause('completion-panel'),
  });
  controller.start();

  return {
    controller,
    dogController,
    gameScene,
    gameState,
    gaugeController,
    progressionManager,
    saveManager,
  };
}

function tapAt(fixture, position) {
  fixture.gaugeController.position = position;
  fixture.controller.handlePointerDown({ defaultPrevented: false });
}

function finishPlayerRecovery(fixture) {
  fixture.controller.update(fixture.gaugeController.oneWaySeconds);
}

function purchaseAndApply(fixture, upgradeId) {
  const result = fixture.progressionManager.purchase(upgradeId);
  expect(result.ok).toBe(true);
  fixture.controller.applyProgressionEffects(fixture.progressionManager.getDerivedEffects());
  return fixture.progressionManager.getDerivedEffects();
}

async function flushCompletion() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('v1 release acceptance', () => {
  it('runs a fresh save through progression, persistence, Grandmaster, and continued play', async () => {
    const storage = createStorage();
    const fixture = createFixture({ storage, rng: () => 0 });

    expect(fixture.gameState.xp).toBe(0);
    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.READY);

    tapAt(fixture, 0.1);
    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(fixture.gameState.xp).toBe(0);
    finishPlayerRecovery(fixture);

    tapAt(fixture, 0.4);
    expect(fixture.gameState.xp).toBe(10);
    finishPlayerRecovery(fixture);

    tapAt(fixture, 0.5);
    expect(fixture.gameState.xp).toBe(30);
    const xpAfterCritical = fixture.gameState.xp;
    tapAt(fixture, 0.5);
    expect(fixture.gameState.xp).toBe(xpAfterCritical);
    finishPlayerRecovery(fixture);

    fixture.gameState.addXp(20_000_000);
    const lifetimeBeforePurchase = fixture.gameState.lifetimeXp;
    const spendableBeforePurchase = fixture.gameState.xp;
    let effects = purchaseAndApply(fixture, 'betterTraining1');
    expect(fixture.gameState.xp).toBe(spendableBeforePurchase - BALANCE.upgradeCosts.betterTraining1);
    expect(fixture.gameState.lifetimeXp).toBe(lifetimeBeforePurchase);

    purchaseAndApply(fixture, 'betterTraining2');
    purchaseAndApply(fixture, 'criticalTraining1');
    purchaseAndApply(fixture, 'quickReload1');
    purchaseAndApply(fixture, 'quickReload2');

    effects = purchaseAndApply(fixture, 'twinThrow');
    expect(effects.playerBoomerangCount).toBe(2);
    effects = purchaseAndApply(fixture, 'secondDummy');
    expect(effects.targetCount).toBe(2);

    purchaseAndApply(fixture, 'betterTraining3');
    purchaseAndApply(fixture, 'dogCompanion');
    purchaseAndApply(fixture, 'dogTraining1');
    purchaseAndApply(fixture, 'fastFetch1');

    effects = purchaseAndApply(fixture, 'tripleThrow');
    expect(effects.playerBoomerangCount).toBe(3);
    effects = purchaseAndApply(fixture, 'thirdDummy');
    expect(effects.targetCount).toBe(3);

    purchaseAndApply(fixture, 'criticalTraining2');
    purchaseAndApply(fixture, 'criticalMastery');
    purchaseAndApply(fixture, 'comboTraining');
    purchaseAndApply(fixture, 'dogTraining2');
    purchaseAndApply(fixture, 'fastFetch2');

    tapAt(fixture, (1 + 0.4) / 3);
    expect(fixture.gameState.gameplay.combo).toBe(1);
    finishPlayerRecovery(fixture);
    tapAt(fixture, 0.5);
    expect(fixture.gameState.gameplay.combo).toBe(3);
    finishPlayerRecovery(fixture);

    effects = purchaseAndApply(fixture, 'quadThrow');
    expect(effects.playerBoomerangCount).toBe(4);
    effects = purchaseAndApply(fixture, 'fourthDummy');
    expect(effects.targetCount).toBe(4);
    purchaseAndApply(fixture, 'comboMastery');
    purchaseAndApply(fixture, 'boomerangMastery');
    purchaseAndApply(fixture, 'fetchMastery');
    purchaseAndApply(fixture, 'dogTraining3');
    effects = purchaseAndApply(fixture, 'fastFetch3');

    expect(effects.dogUnlocked).toBe(true);
    expect(effects.dogIntervalSeconds).toBe(4);
    expect(effects.dogXpFactor).toBe(1);
    expect(effects.dogCriticalChance).toBe(0.1);

    const dogThrowsBeforePause = fixture.gameState.stats.dogThrows;
    fixture.controller.pause('upgrade-panel');
    fixture.controller.update(60 * 60);
    expect(fixture.gameState.stats.dogThrows).toBe(dogThrowsBeforePause);
    fixture.controller.resume();
    fixture.controller.update(4);
    expect(fixture.gameState.stats.dogThrows).toBe(dogThrowsBeforePause + 1);
    expect(fixture.gameState.stats.dogCriticals).toBeGreaterThan(0);

    fixture.controller.pause('settings-panel');
    const activeSecondsWhilePaused = fixture.gameState.stats.activePlaySeconds;
    fixture.controller.update(30);
    expect(fixture.gameState.stats.activePlaySeconds).toBe(activeSecondsWhilePaused);
    fixture.controller.resume();

    expect(fixture.saveManager.save(fixture.gameState.toSaveData())).toBe(true);
    const reloaded = createFixture({ storage, rng: () => 0 });
    expect(reloaded.gameState.upgrades.fourthDummy).toBe(true);
    expect(reloaded.gameState.upgrades.fetchMastery).toBe(true);
    expect(reloaded.progressionManager.getDerivedEffects().playerBoomerangCount).toBe(4);
    expect(reloaded.progressionManager.getDerivedEffects().targetCount).toBe(4);

    reloaded.controller.pause('upgrade-panel');
    purchaseAndApply(reloaded, 'grandmaster');
    expect(reloaded.controller.finalChallengePending).toBe(true);
    expect(reloaded.controller.state).toBe(GAMEPLAY_STATE.PAUSED);
    reloaded.controller.resume();
    expect(reloaded.controller.state).toBe(GAMEPLAY_STATE.FINAL_CHALLENGE);

    tapAt(reloaded, 0.625);
    expect(reloaded.gameState.progression.gameCompleted).toBe(true);
    const throwsAtCompletion = reloaded.gameState.stats.manualThrows;
    await flushCompletion();

    expect(reloaded.controller.state).toBe(GAMEPLAY_STATE.PAUSED);
    expect(reloaded.controller.pauseReason).toBe('completion-panel');
    reloaded.controller.resume();
    expect(reloaded.controller.state).toBe(GAMEPLAY_STATE.READY);

    const xpBeforeContinuedPlay = reloaded.gameState.xp;
    tapAt(reloaded, 0.625);
    expect(reloaded.gameState.stats.manualThrows).toBe(throwsAtCompletion + 1);
    expect(reloaded.gameState.xp).toBeGreaterThan(xpBeforeContinuedPlay);

    expect(reloaded.saveManager.save(reloaded.gameState.toSaveData())).toBe(true);
    const completedReload = createFixture({ storage });
    expect(completedReload.gameState.progression.gameCompleted).toBe(true);
    expect(completedReload.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(completedReload.gameScene.showGrandmasterTarget).not.toHaveBeenCalled();
  });
});
