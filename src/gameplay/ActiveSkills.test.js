import { describe, expect, it, vi } from 'vitest';
import { GameController } from './GameController.js';
import { GameState } from './GameState.js';
import { GaugeController, GAUGE_RESULT } from './GaugeController.js';
import { ThrowController } from './ThrowController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';
import { BALANCE } from '../progression/balance.js';

function createHarness({ ownedUpgrades = [], skills = {}, random = () => 0.5 } = {}) {
  const gameState = new GameState();
  for (const upgradeId of ownedUpgrades) gameState.upgrades[upgradeId] = true;
  for (const [skillId, level] of Object.entries(skills)) gameState.skills[skillId] = { learned: true, level };
  const gaugeController = new GaugeController();
  const progressionManager = new ProgressionManager(gameState);
  const dogController = { configure: vi.fn(), pause: vi.fn(), resume: vi.fn(), update: vi.fn() };
  const gameScene = {
    bindInput: vi.fn(), setPlayerBoomerangCount: vi.fn(), setTargetCount: vi.fn(), setDogVisible: vi.fn(),
    playPlayerThrow: vi.fn(() => Promise.resolve()), playDogThrow: vi.fn(() => Promise.resolve()),
    playResultFeedback: vi.fn(), showGrandmasterTarget: vi.fn(), hideGrandmasterTarget: vi.fn(),
    playGrandmasterSequence: vi.fn(() => Promise.resolve()),
  };
  const hud = { render: vi.fn(), renderTargetHealth: vi.fn(), showTargetDamage: vi.fn(), showPlayerResult: vi.fn(), showDogResult: vi.fn() };
  const activeSkillBar = { render: vi.fn() };
  const controller = new GameController({
    gameState, gaugeController, throwController: new ThrowController(), dogController,
    progressionManager, gameScene, hud, gaugeView: { render: vi.fn() }, activeSkillBar,
    saveManager: { save: vi.fn() }, random,
  });
  controller.start();
  return { controller, gameState, gaugeController, gameScene, activeSkillBar };
}

function tapAt(harness, position) {
  harness.gaugeController.position = position;
  harness.controller.handlePointerDown({ defaultPrevented: false });
}

describe('timed active skill gameplay', () => {
  it('Rapid Recall only applies after HUD activation and enters cooldown when duration ends', () => {
    const harness = createHarness({ skills: { rapidRecall: 1 }, random: () => 0.1 });
    const level = BALANCE.activeSkills.rapidRecall.levels[0];
    expect(harness.gaugeController.speedMultiplier).toBe(1);
    expect(harness.controller.activateSkill('rapidRecall')).toBe(true);
    expect(harness.gaugeController.speedMultiplier).toBeCloseTo(1 + level.gaugeSpeedBonus);

    tapAt(harness, 0.05);
    expect(harness.controller.currentPlayerBoomerangCount).toBe(1);
    expect(harness.controller.missedBoomerangReloads).toEqual([]);

    harness.controller.update(level.durationSeconds);
    expect(harness.gaugeController.speedMultiplier).toBe(1);
    expect(harness.controller.skillRuntime.rapidRecall.cooldownRemainingSeconds).toBe(level.cooldownSeconds);
    expect(harness.controller.activateSkill('rapidRecall')).toBe(false);

    harness.controller.update(level.cooldownSeconds);
    expect(harness.controller.activateSkill('rapidRecall')).toBe(true);
  });

  it('skill timers do not tick while gameplay is paused', () => {
    const harness = createHarness({ skills: { rapidRecall: 1 } });
    harness.controller.activateSkill('rapidRecall');
    const before = harness.controller.skillRuntime.rapidRecall.activeRemainingSeconds;
    harness.controller.pause('upgrade-panel');
    harness.controller.update(5);
    expect(harness.controller.skillRuntime.rapidRecall.activeRemainingSeconds).toBe(before);
  });

  it('Opening Bullseye blocks manual first-area taps and auto-fires centre while active', () => {
    const harness = createHarness({ ownedUpgrades: ['twinThrow'], skills: { openingBullseye: 1 } });
    expect(harness.controller.activateSkill('openingBullseye')).toBe(true);
    tapAt(harness, 0.1);
    expect(harness.gameState.stats.manualThrows).toBe(0);
    harness.controller.update(harness.gaugeController.oneWaySeconds * 0.3);
    expect(harness.gameState.stats.criticals).toBe(1);
    expect(harness.gameScene.playPlayerThrow).toHaveBeenCalledWith(expect.objectContaining({ result: GAUGE_RESULT.CRITICAL }));
    tapAt(harness, 0.75);
    expect(harness.gameState.stats.manualThrows).toBe(1);
  });

  it('higher Rapid Recall levels use upgraded effect values and duration', () => {
    const harness = createHarness({ skills: { rapidRecall: 3 } });
    const level = BALANCE.activeSkills.rapidRecall.levels[2];
    harness.controller.activateSkill('rapidRecall');
    expect(harness.controller.skillRuntime.rapidRecall.activeRemainingSeconds).toBe(level.durationSeconds);
    expect(harness.controller.getGameplayEffects().missReturnChance).toBe(level.missReturnChance);
    expect(harness.gaugeController.speedMultiplier).toBeCloseTo(1 + level.gaugeSpeedBonus);
  });
});
