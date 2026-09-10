import { describe, expect, it, vi } from 'vitest';
import { DogController } from '../gameplay/DogController.js';
import { GameController, GAMEPLAY_STATE } from '../gameplay/GameController.js';
import { GameState } from '../gameplay/GameState.js';
import { GaugeController, GAUGE_RESULT } from '../gameplay/GaugeController.js';
import { ThrowController } from '../gameplay/ThrowController.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';
import { BALANCE } from '../progression/balance.js';

function createGameplayFixture(ownedUpgrades = [], { realDog = false, rng = () => 1 } = {}) {
  const gameState = new GameState();
  for (const upgradeId of ownedUpgrades) {
    gameState.upgrades[upgradeId] = true;
  }

  const gaugeController = new GaugeController();
  const progressionManager = new ProgressionManager(gameState);
  let controller;
  const dogController = realDog
    ? new DogController({
        onThrow: (dogThrow) => controller?.handleDogThrow(dogThrow),
        rng,
      })
    : {
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
  const saveManager = { save: vi.fn() };

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

function tapAt(fixture, position) {
  fixture.gaugeController.position = position;
  fixture.controller.handlePointerDown({ defaultPrevented: false });
}

describe('gameplay integration contract', () => {
  it('white 1-boomerang/1-target throw awards expected XP', () => {
    const fixture = createGameplayFixture();

    tapAt(fixture, 0.5);

    expect(fixture.gameState.xp).toBe(20);
    expect(fixture.gameState.lifetimeXp).toBe(20);
    expect(fixture.gameState.stats.criticals).toBe(1);
    expect(fixture.gameState.stats.targetsHit).toBe(1);
    expect(fixture.hud.showPlayerResult).toHaveBeenCalledWith({
      result: GAUGE_RESULT.CRITICAL,
      awardedXp: 20,
    });
  });

  it('Twin Throw doubles rewarded player hits/reward', () => {
    const fixture = createGameplayFixture(['twinThrow']);

    tapAt(fixture, 0.5);

    expect(fixture.gameState.xp).toBe(40);
    expect(fixture.gameState.stats.targetsHit).toBe(2);
    expect(fixture.gameScene.playPlayerThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        result: GAUGE_RESULT.CRITICAL,
        boomerangCount: 2,
        targetCount: 1,
        rewardedTargetHits: 2,
      }),
    );
  });

  it('Twin Throw + Second Dummy yields four rewarded hits', () => {
    const fixture = createGameplayFixture(['twinThrow', 'secondDummy']);

    tapAt(fixture, 0.5);

    expect(fixture.gameState.xp).toBe(80);
    expect(fixture.gameState.stats.targetsHit).toBe(4);
    expect(fixture.gameScene.playPlayerThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        result: GAUGE_RESULT.CRITICAL,
        boomerangCount: 2,
        targetCount: 2,
        rewardedTargetHits: 4,
      }),
    );
  });

  it('red result awards zero and locks manual input for reload', () => {
    const fixture = createGameplayFixture();

    tapAt(fixture, 0.1);
    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.MISS_RELOAD);
    expect(fixture.gameState.xp).toBe(0);
    expect(fixture.gameState.gameplay.combo).toBe(0);

    tapAt(fixture, 0.5);
    tapAt(fixture, 0.5);

    expect(fixture.gameState.stats.manualThrows).toBe(1);
    expect(fixture.gameState.xp).toBe(0);
    expect(fixture.gameScene.playPlayerThrow).toHaveBeenCalledTimes(1);
  });

  it('dog rewards can occur without corrupting manual player state', () => {
    const fixture = createGameplayFixture(['dogCompanion', 'comboTraining']);

    tapAt(fixture, 0.4);
    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.PLAYER_THROW);
    expect(fixture.gameState.gameplay.combo).toBe(1);

    const playerXp = fixture.gameState.xp;
    fixture.controller.handleDogThrow({ critical: false });

    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.PLAYER_THROW);
    expect(fixture.gameState.gameplay.combo).toBe(1);
    expect(fixture.gameState.xp).toBe(playerXp + 3);
    expect(fixture.gameState.stats.dogThrows).toBe(1);
    expect(fixture.gameScene.playDogThrow).toHaveBeenCalledTimes(1);
  });

  it('automatic dog throws reward every target and use the global Training multiplier', () => {
    const fixture = createGameplayFixture(
      ['betterTraining1', 'secondDummy', 'dogCompanion'],
      { realDog: true },
    );

    fixture.controller.update(10);

    expect(fixture.gameState.xp).toBe(6);
    expect(fixture.gameState.stats.dogThrows).toBe(1);
    expect(fixture.gameState.stats.targetsHit).toBe(2);
    expect(fixture.gameScene.playDogThrow).toHaveBeenCalledWith({
      owner: 'dog',
      result: 'HIT',
      boomerangCount: 1,
      targetCount: 2,
      rewardedTargetHits: 2,
      critical: false,
      targetChain: [0, 1],
      reducedMotion: false,
    });
  });

  it('Fetch Mastery uses injected RNG, doubles dog XP, and emits GOOD BOY feedback', () => {
    const rng = vi.fn(() => 0.05);
    const fixture = createGameplayFixture(
      [
        'dogCompanion',
        'dogTraining1',
        'dogTraining2',
        'fastFetch1',
        'fastFetch2',
        'fetchMastery',
        'criticalMastery',
        'boomerangMastery',
        'comboTraining',
      ],
      { realDog: true, rng },
    );

    fixture.gameState.setCombo(20);
    fixture.controller.update(6);

    expect(rng).toHaveBeenCalledTimes(1);
    expect(fixture.gameState.xp).toBe(12);
    expect(fixture.gameState.stats.dogCriticals).toBe(1);
    expect(fixture.gameState.gameplay.combo).toBe(20);
    expect(fixture.hud.showDogResult).toHaveBeenCalledWith({
      critical: true,
      awardedXp: 12,
    });
  });

  it('automatic dog throws remain non-blocking during a player throw', () => {
    const fixture = createGameplayFixture(['dogCompanion', 'comboTraining'], { realDog: true });

    fixture.controller.update(9.5);
    tapAt(fixture, 0.4);

    const playerXp = fixture.gameState.xp;
    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.PLAYER_THROW);
    expect(fixture.gameState.gameplay.combo).toBe(1);

    fixture.controller.update(0.5);

    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.PLAYER_THROW);
    expect(fixture.gameState.gameplay.combo).toBe(1);
    expect(fixture.gameState.xp).toBe(playerXp + 3);
    expect(fixture.gameState.stats.dogThrows).toBe(1);
  });

  it('automatic dog throws remain non-blocking during miss reload', () => {
    const fixture = createGameplayFixture(['dogCompanion'], { realDog: true });

    fixture.controller.update(9.5);
    tapAt(fixture, 0.1);

    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.MISS_RELOAD);
    fixture.controller.update(0.5);

    expect(fixture.controller.state).toBe(GAMEPLAY_STATE.MISS_RELOAD);
    expect(fixture.controller.reloadRemainingSeconds).toBe(4.5);
    expect(fixture.gameState.xp).toBe(3);
    expect(fixture.gameState.stats.dogThrows).toBe(1);
  });

  it('upgrade purchase immediately changes calculations, runtime mirrors, and save snapshot', () => {
    const fixture = createGameplayFixture([
      'betterTraining1',
      'betterTraining2',
      'quickReload1',
      'quickReload2',
    ]);
    fixture.gameState.xp = BALANCE.upgradeCosts.twinThrow;
    fixture.gameState.lifetimeXp = BALANCE.upgradeCosts.twinThrow;

    const purchase = fixture.progressionManager.purchase('twinThrow');
    const effects = fixture.progressionManager.getDerivedEffects();
    fixture.controller.applyProgressionEffects(effects);
    fixture.saveManager.save(fixture.gameState.toSaveData());

    expect(purchase.ok).toBe(true);
    expect(effects.playerBoomerangCount).toBe(2);
    expect(fixture.gameScene.setPlayerBoomerangCount).toHaveBeenLastCalledWith(2);
    expect(fixture.gaugeController.zoneWidths).toEqual(effects.gaugeZoneWidths);
    expect(fixture.dogController.configure).toHaveBeenLastCalledWith({
      unlocked: false,
      intervalSeconds: 10,
      criticalChance: 0,
    });
    expect(fixture.saveManager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        xp: 0,
        upgrades: expect.objectContaining({ twinThrow: true }),
      }),
    );

    tapAt(fixture, 0.5);
    expect(fixture.gameState.xp).toBe(58);
    expect(fixture.gameState.stats.targetsHit).toBe(2);
  });
});
