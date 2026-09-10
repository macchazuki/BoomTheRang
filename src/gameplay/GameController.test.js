import { describe, expect, it, vi } from 'vitest';
import { GameController, GAMEPLAY_STATE } from './GameController.js';
import { GameState } from './GameState.js';
import { GaugeController, GAUGE_RESULT } from './GaugeController.js';
import { ThrowController } from './ThrowController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';
import { BALANCE } from '../progression/balance.js';

function createHarness({ ownedUpgrades = [] } = {}) {
  const gameState = new GameState();
  for (const upgradeId of ownedUpgrades) {
    gameState.upgrades[upgradeId] = true;
  }

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
  };
}

function tapAt(harness, position) {
  harness.gaugeController.position = position;
  harness.controller.handlePointerDown({ defaultPrevented: false });
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

  it.todo('Grandmaster completes only on a white result');
});
