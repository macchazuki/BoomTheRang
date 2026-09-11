import { describe, expect, it, vi } from 'vitest';
import { DogController } from '../gameplay/DogController.js';
import { GameController, GAMEPLAY_STATE } from '../gameplay/GameController.js';
import { GameState } from '../gameplay/GameState.js';
import { GaugeController, GAUGE_RESULT } from '../gameplay/GaugeController.js';
import { ThrowController } from '../gameplay/ThrowController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';

function createGameplayFixture(ownedUpgrades = [], { realDog = false, rng = () => 1 } = {}) {
  const gameState = new GameState();
  for (const upgradeId of ownedUpgrades) gameState.upgrades[upgradeId] = true;
  const gaugeController = new GaugeController();
  const progressionManager = new ProgressionManager(gameState);
  let controller;
  const dogController = realDog
    ? new DogController({ onThrow: (dogThrow) => controller?.handleDogThrow(dogThrow), rng })
    : { configure: vi.fn(), pause: vi.fn(), resume: vi.fn(), update: vi.fn() };
  const gameScene = {
    bindInput: vi.fn(), setPlayerBoomerangCount: vi.fn(), setTargetCount: vi.fn(), setDogVisible: vi.fn(),
    playPlayerThrow: vi.fn(() => Promise.resolve()), playDogThrow: vi.fn(() => Promise.resolve()),
    playResultFeedback: vi.fn(), showGrandmasterTarget: vi.fn(), hideGrandmasterTarget: vi.fn(),
    playGrandmasterSequence: vi.fn(() => Promise.resolve()),
  };
  const hud = { render: vi.fn(), showPlayerResult: vi.fn(), showDogResult: vi.fn() };
  controller = new GameController({
    gameState, gaugeController, throwController: new ThrowController(), dogController,
    progressionManager, gameScene, hud, gaugeView: { render: vi.fn() }, saveManager: { save: vi.fn() },
  });
  controller.start();
  return { controller, gameState, gaugeController, dogController, gameScene, hud };
}

function tapAt(fixture, position) {
  fixture.gaugeController.position = position;
  fixture.controller.handlePointerDown({ defaultPrevented: false });
}

describe('gameplay integration contract', () => {
  it('white 1-boomerang/1-target throw awards expected XP', () => {
    const fixture = createGameplayFixture();
    tapAt(fixture, 0.5);
    expect(fixture.gameState.xp).toBe(20);
    expect(fixture.gameState.stats.criticals).toBe(1);
    expect(fixture.gameState.stats.targetsHit).toBe(1);
  });

  it('Twin Throw creates two independent presses rather than one doubled throw', () => {
    const fixture = createGameplayFixture(['twinThrow']);
    tapAt(fixture, 0.25);
    expect(fixture.gameState.xp).toBe(20);
    expect(fixture.gameScene.playPlayerThrow).toHaveBeenLastCalledWith(expect.objectContaining({
      result: GAUGE_RESULT.CRITICAL, boomerangCount: 1, rewardedTargetHits: 1,
    }));
    tapAt(fixture, 0.75);
    expect(fixture.gameState.xp).toBe(40);
    expect(fixture.gameState.stats.targetsHit).toBe(2);
  });

  it('Twin Throw + Second Dummy rewards two targets on each independent boomerang', () => {
    const fixture = createGameplayFixture(['twinThrow', 'secondDummy']);
    tapAt(fixture, 0.25);
    tapAt(fixture, 0.75);
    expect(fixture.gameState.xp).toBe(80);
    expect(fixture.gameState.stats.targetsHit).toBe(4);
    expect(fixture.gameScene.playPlayerThrow).toHaveBeenCalledTimes(2);
  });

  it('double tapping a consumed area does not fire another boomerang', () => {
    const fixture = createGameplayFixture(['twinThrow']);
    tapAt(fixture, 0.25);
    tapAt(fixture, 0.26);
    expect(fixture.gameState.stats.manualThrows).toBe(1);
    expect(fixture.gameScene.playPlayerThrow).toHaveBeenCalledTimes(1);
  });

  it('red consumes only its current area and does not stop the gauge', () => {
    const fixture = createGameplayFixture(['twinThrow']);
    tapAt(fixture, 0.05);
    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.READY);
    expect(fixture.gaugeController.running).toBe(true);
    tapAt(fixture, 0.75);
    expect(fixture.gameState.stats.manualThrows).toBe(2);
  });

  it('dog rewards occur independently of the player gauge', () => {
    const fixture = createGameplayFixture(['dogCompanion']);
    fixture.controller.handleDogThrow({ critical: false });
    expect(fixture.gameState.xp).toBe(3);
    expect(fixture.gameState.stats.dogThrows).toBe(1);
    expect(fixture.gameState.stats.manualThrows).toBe(0);
  });

  it('automatic dog throws still reward every target', () => {
    const fixture = createGameplayFixture(['secondDummy', 'dogCompanion'], { realDog: true });
    fixture.controller.update(10);
    expect(fixture.gameState.stats.dogThrows).toBe(1);
    expect(fixture.gameState.stats.targetsHit).toBe(2);
  });
});
