import { describe, expect, it, vi } from 'vitest';
import { GameController, GAMEPLAY_STATE } from './GameController.js';
import { GameState } from './GameState.js';
import { GaugeController, GAUGE_RESULT } from './GaugeController.js';
import { ThrowController } from './ThrowController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';
import { BALANCE } from '../progression/balance.js';

function createHarness({ ownedUpgrades = [], gameCompleted = false } = {}) {
  const gameState = new GameState();
  for (const upgradeId of ownedUpgrades) {
    gameState.upgrades[upgradeId] = true;
  }
  gameState.progression.gameCompleted = gameCompleted;

  const gaugeController = new GaugeController();
  const progressionManager = new ProgressionManager(gameState);
  const dogController = {
    configure: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    update: vi.fn(),
  };
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
  const gaugeView = { render: vi.fn() };
  const saveManager = { save: vi.fn() };

  const controller = new GameController({
    gameState,
    gaugeController,
    throwController: new ThrowController(),
    dogController,
    progressionManager,
    gameScene,
    hud,
    gaugeView,
    saveManager,
  });
  controller.start();

  return {
    controller,
    gameState,
    gaugeController,
    progressionManager,
    dogController,
    gameScene,
    hud,
    saveManager,
  };
}

function tapAt(harness, position) {
  harness.gaugeController.position = position;
  harness.controller.handlePointerDown({ defaultPrevented: false });
}

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('GameController contract', () => {
  it('starts in READY with the gauge running from the edge', () => {
    const harness = createHarness();

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.gaugeController.position).toBe(0);
    expect(harness.gaugeController.running).toBe(true);
  });

  it('miss enters MISS_RELOAD and ignores taps until cooldown completes', () => {
    const harness = createHarness();

    tapAt(harness, 0.1);

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.MISS_RELOAD);
    expect(harness.controller.reloadRemainingSeconds).toBe(BALANCE.missReloadSeconds);
    expect(harness.gaugeController.running).toBe(false);
    expect(harness.gameState.xp).toBe(0);
    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.gameState.stats.misses).toBe(1);

    tapAt(harness, 0.5);
    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.gameState.xp).toBe(0);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledTimes(1);

    harness.controller.update(2);
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.MISS_RELOAD);
    expect(harness.controller.reloadRemainingSeconds).toBe(3);
    expect(harness.hud.render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        state: GAMEPLAY_STATE.MISS_RELOAD,
        reloadRemainingSeconds: 3,
      }),
    );

    harness.controller.update(3);
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.controller.reloadRemainingSeconds).toBe(0);
    expect(harness.gaugeController.position).toBe(0);
    expect(harness.gaugeController.running).toBe(true);
  });

  it.each([
    [[], 5],
    [['quickReload1'], 4.5],
    [['quickReload1', 'quickReload2'], 4],
    [['quickReload1', 'quickReload2', 'quickReload3'], 3],
    [['quickReload1', 'quickReload2', 'quickReload3', 'recoveryMastery'], 2],
  ])('uses the currently derived miss reload duration: %ss', (ownedUpgrades, expectedSeconds) => {
    const harness = createHarness({ ownedUpgrades });

    tapAt(harness, 0.1);

    expect(harness.controller.reloadRemainingSeconds).toBe(expectedSeconds);
  });

  it('one player tap produces one result shared by all boomerangs and targets', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow', 'secondDummy'] });

    tapAt(harness, 0.5);

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.PLAYER_THROW);
    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.gameState.stats.targetsHit).toBe(4);
    expect(harness.gameState.xp).toBe(80);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledTimes(1);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledWith({
      owner: 'player',
      result: GAUGE_RESULT.CRITICAL,
      boomerangCount: 2,
      targetCount: 2,
      rewardedTargetHits: 4,
      targetChain: [0, 1],
      reducedMotion: false,
    });

    tapAt(harness, 0.5);
    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.gameState.xp).toBe(80);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledTimes(1);
  });

  it('successful throw returns to READY after the configured recovery', () => {
    const harness = createHarness();

    tapAt(harness, 0.4);
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.PLAYER_THROW);
    expect(harness.gaugeController.running).toBe(false);

    harness.controller.update(BALANCE.successRecoverySeconds);

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.controller.successRecoveryRemainingSeconds).toBe(0);
    expect(harness.gaugeController.position).toBe(0);
    expect(harness.gaugeController.running).toBe(true);
  });

  it('dog throw does not modify manual state or combo', () => {
    const harness = createHarness({ ownedUpgrades: ['dogCompanion'] });
    harness.controller.state = GAMEPLAY_STATE.PLAYER_THROW;
    harness.gameState.setCombo(7);

    harness.controller.handleDogThrow({ critical: false });

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.PLAYER_THROW);
    expect(harness.gameState.gameplay.combo).toBe(7);
    expect(harness.gameState.stats.manualThrows).toBe(0);
    expect(harness.gameState.stats.dogThrows).toBe(1);
    expect(harness.gameState.xp).toBe(3);
  });

  it('pause preserves the exact pre-pause state and freezes elapsed timers', () => {
    const harness = createHarness();

    tapAt(harness, 0.1);
    harness.controller.update(1);
    expect(harness.controller.reloadRemainingSeconds).toBe(4);

    const dogUpdatesBeforePause = harness.dogController.update.mock.calls.length;
    harness.controller.pause('settings-panel');
    tapAt(harness, 0.5);
    harness.controller.update(100);

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.PAUSED);
    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.controller.reloadRemainingSeconds).toBe(4);
    expect(harness.dogController.update).toHaveBeenCalledTimes(dogUpdatesBeforePause);

    harness.controller.resume();
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.MISS_RELOAD);
    expect(harness.controller.reloadRemainingSeconds).toBe(4);

    harness.controller.update(4);
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
  });

  it('ignores prevented gameplay pointers', () => {
    const harness = createHarness();
    harness.gaugeController.position = 0.5;

    harness.controller.handlePointerDown({ defaultPrevented: true });

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.gameState.stats.manualThrows).toBe(0);
    expect(harness.gameState.xp).toBe(0);
  });

  it('Grandmaster red miss reloads and returns to the challenge without completing', () => {
    const harness = createHarness({ ownedUpgrades: ['grandmaster'] });

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.FINAL_CHALLENGE);
    tapAt(harness, 0.1);

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.MISS_RELOAD);
    expect(harness.gameState.progression.gameCompleted).toBe(false);
    expect(harness.saveManager.save).not.toHaveBeenCalled();

    harness.controller.update(BALANCE.missReloadSeconds);
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.FINAL_CHALLENGE);
    expect(harness.dogController.pause).toHaveBeenCalled();
  });

  it('Grandmaster green hit recovers back into the challenge without completing', () => {
    const harness = createHarness({ ownedUpgrades: ['grandmaster'] });

    tapAt(harness, 0.4);

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.PLAYER_THROW);
    expect(harness.gameState.progression.gameCompleted).toBe(false);
    expect(harness.saveManager.save).not.toHaveBeenCalled();

    harness.controller.update(BALANCE.successRecoverySeconds);
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.FINAL_CHALLENGE);
  });

  it('Grandmaster white completes once and saves the completion flag immediately', async () => {
    const harness = createHarness({ ownedUpgrades: ['grandmaster'] });
    harness.gameScene.playGrandmasterSequence.mockClear();

    tapAt(harness, 0.5);
    tapAt(harness, 0.5);

    expect(harness.gameState.progression.gameCompleted).toBe(true);
    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.saveManager.save).toHaveBeenCalledTimes(1);
    expect(harness.saveManager.save).toHaveBeenCalledWith(
      expect.objectContaining({ progression: { gameCompleted: true } }),
    );

    await flushPromises();
    expect(harness.gameScene.playGrandmasterSequence).toHaveBeenCalledTimes(1);
  });

  it('does not retrigger Grandmaster for an already completed save', () => {
    const harness = createHarness({
      ownedUpgrades: ['grandmaster'],
      gameCompleted: true,
    });

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.controller.finalChallengeActive).toBe(false);
    expect(harness.gameScene.showGrandmasterTarget).not.toHaveBeenCalled();
  });

  it('defers a Grandmaster purchase while an upgrade modal owns PAUSED', () => {
    const harness = createHarness();
    harness.controller.pause('upgrade-panel');
    const activePlayBeforePurchase = harness.gameState.stats.activePlaySeconds;
    const dogUpdatesBeforePurchase = harness.dogController.update.mock.calls.length;

    harness.gameState.upgrades.grandmaster = true;
    harness.controller.applyProgressionEffects(harness.progressionManager.getDerivedEffects());
    harness.controller.update(30);

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.PAUSED);
    expect(harness.controller.pauseReason).toBe('upgrade-panel');
    expect(harness.controller.finalChallengePending).toBe(true);
    expect(harness.gameScene.showGrandmasterTarget).not.toHaveBeenCalled();
    expect(harness.gameState.stats.activePlaySeconds).toBe(activePlayBeforePurchase);
    expect(harness.dogController.update).toHaveBeenCalledTimes(dogUpdatesBeforePurchase);

    harness.controller.resume();

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.FINAL_CHALLENGE);
    expect(harness.controller.finalChallengePending).toBe(false);
    expect(harness.gameScene.showGrandmasterTarget).toHaveBeenCalledTimes(1);
  });

  it('keeps the dog paused through Grandmaster and resumes it after Continue Playing', async () => {
    const harness = createHarness({ ownedUpgrades: ['dogCompanion', 'grandmaster'] });
    harness.dogController.pause.mockClear();
    harness.dogController.resume.mockClear();
    harness.controller.onCompleted = () => harness.controller.pause('completion-panel');

    harness.controller.handleDogThrow({ critical: false });
    expect(harness.gameState.stats.dogThrows).toBe(0);

    tapAt(harness, 0.5);
    await flushPromises();

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.PAUSED);
    expect(harness.controller.pauseReason).toBe('completion-panel');
    expect(harness.dogController.resume).not.toHaveBeenCalled();

    harness.controller.resume();

    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.dogController.resume).toHaveBeenCalledTimes(1);
  });
});
