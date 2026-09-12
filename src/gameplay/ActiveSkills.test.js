import { describe, expect, it, vi } from 'vitest';
import { GameController } from './GameController.js';
import { GameState } from './GameState.js';
import { GaugeController, GAUGE_RESULT } from './GaugeController.js';
import { ThrowController } from './ThrowController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';
import { BALANCE } from '../progression/balance.js';

function createHarness({
  ownedUpgrades = [],
  learnedSkills = [],
  activeSkills = learnedSkills,
  random = () => 0.5,
} = {}) {
  const gameState = new GameState();
  for (const upgradeId of ownedUpgrades) gameState.upgrades[upgradeId] = true;
  for (const skillId of learnedSkills) {
    gameState.skills[skillId] = {
      learned: true,
      active: activeSkills.includes(skillId),
    };
  }

  const gaugeController = new GaugeController();
  const progressionManager = new ProgressionManager(gameState);
  const dogController = { configure: vi.fn(), pause: vi.fn(), resume: vi.fn(), update: vi.fn() };
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
    renderTargetHealth: vi.fn(),
    showTargetDamage: vi.fn(),
    showPlayerResult: vi.fn(),
    showDogResult: vi.fn(),
  };
  const controller = new GameController({
    gameState,
    gaugeController,
    throwController: new ThrowController(),
    dogController,
    progressionManager,
    gameScene,
    hud,
    gaugeView: { render: vi.fn() },
    saveManager: { save: vi.fn() },
    random,
  });
  controller.start();

  return { controller, gameState, gaugeController, gameScene };
}

function tapAt(harness, position) {
  harness.gaugeController.position = position;
  harness.controller.handlePointerDown({ defaultPrevented: false });
}

describe('active skill gameplay', () => {
  it('Rapid Recall speeds up the gauge and can immediately return a missed boomerang', () => {
    const harness = createHarness({
      learnedSkills: ['rapidRecall'],
      random: () => 0.1,
    });

    expect(harness.gaugeController.speedMultiplier).toBeCloseTo(
      1 + BALANCE.activeSkills.rapidRecall.gaugeSpeedBonus,
    );
    expect(harness.gaugeController.oneWaySeconds).toBeCloseTo(
      BALANCE.gaugeOneWaySeconds / (1 + BALANCE.activeSkills.rapidRecall.gaugeSpeedBonus),
    );

    tapAt(harness, 0.05);

    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.gameState.stats.misses).toBe(1);
    expect(harness.controller.currentPlayerBoomerangCount).toBe(1);
    expect(harness.controller.missedBoomerangReloads).toEqual([]);
  });

  it('Rapid Recall still loses the boomerang when the return roll fails', () => {
    const harness = createHarness({
      learnedSkills: ['rapidRecall'],
      random: () => 0.9,
    });

    tapAt(harness, 0.05);

    expect(harness.controller.currentPlayerBoomerangCount).toBe(0);
    expect(harness.controller.missedBoomerangReloads).toHaveLength(1);
  });

  it('Opening Bullseye auto-fires the first area at centre and ignores manual taps there', () => {
    const harness = createHarness({
      ownedUpgrades: ['twinThrow'],
      learnedSkills: ['openingBullseye'],
    });

    expect(harness.gaugeController.segmentCount).toBe(2);

    tapAt(harness, 0.1);
    expect(harness.gameState.stats.manualThrows).toBe(0);
    expect(harness.gameScene.playPlayerThrow).not.toHaveBeenCalled();
    expect(harness.gaugeController.getSnapshot().consumedSegments).toEqual([]);

    harness.controller.update(harness.gaugeController.oneWaySeconds * 0.16);

    expect(harness.gameState.stats.manualThrows).toBe(0);
    expect(harness.gameState.stats.hits).toBe(1);
    expect(harness.gameState.stats.criticals).toBe(1);
    expect(harness.gameState.xp).toBe(20);
    expect(harness.gaugeController.getSnapshot().consumedSegments).toEqual([0]);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledWith(
      expect.objectContaining({ result: GAUGE_RESULT.CRITICAL, boomerangCount: 1 }),
    );

    tapAt(harness, 0.2);
    expect(harness.gameState.stats.manualThrows).toBe(0);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledTimes(1);

    tapAt(harness, 0.75);
    expect(harness.gameState.stats.manualThrows).toBe(1);
    expect(harness.gameState.stats.hits).toBe(2);
    expect(harness.gameState.xp).toBe(40);
    expect(harness.gaugeController.getSnapshot().consumedSegments).toEqual([0, 1]);
  });

  it('Opening Bullseye fires again after the next gauge sweep starts', () => {
    const harness = createHarness({
      ownedUpgrades: ['twinThrow'],
      learnedSkills: ['openingBullseye'],
    });

    harness.controller.update(harness.gaugeController.oneWaySeconds * 0.26);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledTimes(1);

    harness.gaugeController.position = 0.95;
    harness.controller.update(harness.gaugeController.oneWaySeconds * 0.1);
    expect(harness.gaugeController.getSnapshot().consumedSegments).toEqual([]);

    harness.controller.update(harness.gaugeController.oneWaySeconds * 0.2);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledTimes(2);
    expect(harness.gameState.stats.manualThrows).toBe(0);
  });
});
