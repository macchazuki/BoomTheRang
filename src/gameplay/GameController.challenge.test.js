import { describe, expect, it, vi } from 'vitest';
import { GameController, GAMEPLAY_STATE } from './GameController.js';
import { GameState } from './GameState.js';
import { GaugeController } from './GaugeController.js';
import { ThrowController } from './ThrowController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';

function createHarness() {
  const gameState = new GameState();
  const gaugeController = new GaugeController();
  const progressionManager = new ProgressionManager(gameState);
  const dogController = { configure: vi.fn(), pause: vi.fn(), resume: vi.fn(), update: vi.fn() };
  const gameScene = {
    bindInput: vi.fn(), setPlayerBoomerangCount: vi.fn(), setTargetCount: vi.fn(), setDogVisible: vi.fn(),
    playPlayerThrow: vi.fn(() => Promise.resolve()), playDogThrow: vi.fn(() => Promise.resolve()),
    playResultFeedback: vi.fn(), showGrandmasterTarget: vi.fn(), hideGrandmasterTarget: vi.fn(),
    playGrandmasterSequence: vi.fn(() => Promise.resolve()),
  };
  const hud = {
    render: vi.fn(), showPlayerResult: vi.fn(), showDogResult: vi.fn(),
    renderTargetHealth: vi.fn(), showTargetDamage: vi.fn(),
  };
  const gaugeView = { render: vi.fn() };
  const onChallengeFinished = vi.fn();
  const challengeRules = {
    permanentMissLoss: true,
    disableMissReturns: true,
    minGaugeOneWaySeconds: 0.10,
    getGaugeOneWaySeconds: (hits) => Math.max(0.10, 1.35 * (0.95 ** hits)),
  };
  const controller = new GameController({
    gameState,
    gaugeController,
    throwController: new ThrowController(),
    dogController,
    progressionManager,
    gameScene,
    hud,
    gaugeView,
    saveManager: { save: vi.fn() },
    challengeRules,
    onChallengeFinished,
  });
  controller.start();
  return { controller, gameState, gaugeController, onChallengeFinished };
}

describe('GameController challenge run', () => {
  it('counts hits and speeds up the gauge', () => {
    const harness = createHarness();
    const originalSeconds = harness.gaugeController.oneWaySeconds;
    harness.gaugeController.position = 0.5;

    harness.controller.handlePointerDown({ defaultPrevented: false });

    expect(harness.controller.challengeHits).toBe(1);
    expect(harness.gaugeController.oneWaySeconds).toBeLessThan(originalSeconds);
    expect(harness.gameState.xp).toBeGreaterThan(0);
  });

  it('permanently loses a missed boomerang and ends when none remain', () => {
    const harness = createHarness();
    harness.gaugeController.position = 0.05;

    harness.controller.handlePointerDown({ defaultPrevented: false });

    expect(harness.controller.currentPlayerBoomerangCount).toBe(0);
    expect(harness.controller.missedBoomerangReloads).toEqual([]);
    expect(harness.controller.state).toBe(GAMEPLAY_STATE.PAUSED);
    expect(harness.onChallengeFinished).toHaveBeenCalledWith({ hits: 0 });
  });
});
