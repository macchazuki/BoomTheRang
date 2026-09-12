import { describe, expect, it, vi } from 'vitest';
import { GameController, GAMEPLAY_STATE } from './GameController.js';
import { GameState } from './GameState.js';
import { GaugeController, GAUGE_RESULT } from './GaugeController.js';
import { ThrowController } from './ThrowController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';

function createHarness({ ownedUpgrades = [], gameCompleted = false } = {}) {
  const gameState = new GameState();
  for (const upgradeId of ownedUpgrades) gameState.upgrades[upgradeId] = true;
  gameState.progression.gameCompleted = gameCompleted;
  const gaugeController = new GaugeController();
  const progressionManager = new ProgressionManager(gameState);
  const dogController = { configure: vi.fn(), pause: vi.fn(), resume: vi.fn(), update: vi.fn() };
  const gameScene = {
    bindInput: vi.fn(), setPlayerBoomerangCount: vi.fn(), setTargetCount: vi.fn(), setDogVisible: vi.fn(),
    playPlayerThrow: vi.fn(() => Promise.resolve()), playDogThrow: vi.fn(() => Promise.resolve()),
    playResultFeedback: vi.fn(), showGrandmasterTarget: vi.fn(), hideGrandmasterTarget: vi.fn(),
    playGrandmasterSequence: vi.fn(() => Promise.resolve()),
  };
  const hud = { render: vi.fn(), showPlayerResult: vi.fn(), showDogResult: vi.fn() };
  const gaugeView = { render: vi.fn() };
  const saveManager = { save: vi.fn() };
  const controller = new GameController({
    gameState, gaugeController, throwController: new ThrowController(), dogController,
    progressionManager, gameScene, hud, gaugeView, saveManager,
  });
  controller.start();
  return { controller, gameState, gaugeController, progressionManager, dogController, gameScene, hud, saveManager };
}

function tapAt(harness, position) {
  harness.gaugeController.position = position;
  harness.controller.handlePointerDown({ defaultPrevented: false });
}

describe('GameController multi-boomerang gauge', () => {
  it('starts ready with one timing area per owned boomerang', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow'] });
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.gaugeController.segmentCount).toBe(2);
    expect(harness.gaugeController.running).toBe(true);
  });

  it('fires one boomerang per press at the single target while the gauge keeps moving', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow'] });
    tapAt(harness, 0.25);
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.gaugeController.running).toBe(true);
    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.gameState.stats.targetsHit).toBe(1);
    expect(harness.gameState.xp).toBe(20);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenLastCalledWith({
      owner: 'player', result: GAUGE_RESULT.CRITICAL, boomerangCount: 1,
      targetCount: 1, rewardedTargetHits: 1, targetChain: [0], reducedMotion: false,
    });

    tapAt(harness, 0.75);
    expect(harness.gameState.stats.manualThrows).toBe(2);
    expect(harness.gameState.stats.targetsHit).toBe(2);
    expect(harness.gameState.xp).toBe(40);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledTimes(2);
  });

  it('clears a used area and rejects a double tap in that same area', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow'] });
    tapAt(harness, 0.25);
    tapAt(harness, 0.26);
    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledTimes(1);
    expect(harness.gaugeController.getSnapshot().consumedSegments).toEqual([0]);
  });

  it('restores successful boomerang timing areas when the gauge reaches the end', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow'] });
    tapAt(harness, 0.25);
    harness.gaugeController.position = 0.9;
    harness.controller.update(harness.gaugeController.oneWaySeconds * 0.1);
    expect(harness.gaugeController.position).toBeCloseTo(0);
    expect(harness.gaugeController.segmentCount).toBe(2);
    expect(harness.gaugeController.getSnapshot().consumedSegments).toEqual([]);
  });

  it('does not restore a lost boomerang when the gauge reaches the end', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow'] });
    tapAt(harness, 0.05);
    expect(harness.controller.currentPlayerBoomerangCount).toBe(1);

    harness.gaugeController.position = 0.9;
    harness.controller.update(harness.gaugeController.oneWaySeconds * 0.1);

    expect(harness.gaugeController.position).toBeCloseTo(0);
    expect(harness.gaugeController.segmentCount).toBe(1);
    expect(harness.controller.currentPlayerBoomerangCount).toBe(1);
  });

  it('shows no timing areas if every boomerang is lost, then restores them after reload', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow'] });
    tapAt(harness, 0.05);
    tapAt(harness, 0.55);
    expect(harness.controller.currentPlayerBoomerangCount).toBe(0);

    harness.gaugeController.position = 0.9;
    harness.controller.update(harness.gaugeController.oneWaySeconds * 0.1);
    expect(harness.gaugeController.segmentCount).toBe(0);

    harness.controller.update(5);
    expect(harness.controller.currentPlayerBoomerangCount).toBe(2);
    expect(harness.gaugeController.segmentCount).toBe(2);
  });

  it('consumes a red miss without stopping the rest of the sweep', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow'] });
    tapAt(harness, 0.05);
    expect(harness.gameState.stats.misses).toBe(1);
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.gaugeController.running).toBe(true);
    tapAt(harness, 0.75);
    expect(harness.gameState.stats.manualThrows).toBe(2);
  });

  it('ignores prevented pointers and pauses/resumes the moving gauge', () => {
    const harness = createHarness();
    harness.controller.handlePointerDown({ defaultPrevented: true });
    expect(harness.gameState.stats.manualThrows).toBe(0);
    harness.controller.pause('settings');
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.PAUSED);
    expect(harness.gaugeController.running).toBe(false);
    harness.controller.resume();
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(harness.gaugeController.running).toBe(true);
  });

  it('keeps dog throws independent from the player gauge', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow', 'dogCompanion'] });
    harness.controller.handleDogThrow({ critical: false });
    expect(harness.gameState.stats.dogThrows).toBe(1);
    expect(harness.gameState.stats.manualThrows).toBe(0);
  });
});
