import { describe, expect, it } from 'vitest';
import { GameState } from '../gameplay/GameState.js';
import { createDefaultSave } from '../persistence/defaultSave.js';
import { BALANCE } from './balance.js';
import { ProgressionManager } from './ProgressionManager.js';
import { UPGRADE_BY_ID, UPGRADE_DEFINITIONS } from './upgradeDefinitions.js';

const EXPECTED_UPGRADES = [
  ['betterTraining1', [], 'globalTrainingBonus', 0.20],
  ['betterTraining2', ['betterTraining1'], 'globalTrainingBonus', 0.25],
  ['betterTraining3', ['betterTraining2'], 'globalTrainingBonus', 0.35],
  ['criticalTraining1', ['betterTraining2'], 'criticalMultiplier', 2.25],
  ['criticalTraining2', ['criticalTraining1', 'thirdDummy'], 'criticalMultiplier', 2.5],
  ['criticalMastery', ['criticalTraining2'], 'criticalMultiplier', 3],
  ['megaCritical', ['criticalMastery'], 'criticalMultiplier', 4],
  ['ultraCritical', ['megaCritical', 'quadThrow'], 'criticalMultiplier', 6],
  ['omegaCritical', ['ultraCritical', 'fourthDummy'], 'criticalMultiplier', 10],
  ['quickReload1', ['betterTraining1'], 'missReloadSeconds', 4.5],
  ['quickReload2', ['quickReload1'], 'missReloadSeconds', 4],
  ['quickReload3', ['quickReload2'], 'missReloadSeconds', 3],
  ['recoveryMastery', ['quickReload3'], 'missReloadSeconds', 2],
  ['steadyHands1', ['betterTraining1'], 'greenWidth', 0.19],
  ['steadyHands2', ['steadyHands1'], 'greenWidth', 0.21],
  ['perfectWindow1', ['steadyHands2'], 'whiteWidth', 0.04],
  ['perfectWindow2', ['perfectWindow1'], 'whiteWidth', 0.05],
  ['twinThrow', ['betterTraining1'], 'playerBoomerangs', 2],
  ['secondDummy', ['twinThrow'], 'targets', 2],
  ['tripleThrow', ['secondDummy'], 'playerBoomerangs', 3],
  ['thirdDummy', ['tripleThrow'], 'targets', 3],
  ['quadThrow', ['comboTraining', 'thirdDummy'], 'playerBoomerangs', 4],
  ['fourthDummy', ['quadThrow'], 'targets', 4],
  ['boomerangMastery', ['fourthDummy', 'comboMastery'], 'boomerangMasteryMultiplier', 1.5],
  ['comboTraining', ['secondDummy'], 'comboUnlocked', true],
  ['comboMastery', ['fourthDummy', 'comboTraining'], 'comboMaxBonus', 0.50],
  ['dogCompanion', ['secondDummy'], 'dogUnlocked', true],
  ['dogTraining1', ['dogCompanion'], 'dogXpFactor', 0.40],
  ['dogTraining2', ['dogTraining1'], 'dogXpFactor', 0.60],
  ['fastFetch1', ['dogCompanion'], 'dogIntervalSeconds', 8],
  ['fastFetch2', ['fastFetch1'], 'dogIntervalSeconds', 6],
  ['fetchMastery', ['dogTraining2', 'fastFetch2'], 'dogCriticalChance', 0.10],
  ['dogTraining3', ['fetchMastery'], 'dogXpFactor', 1.00],
  ['fastFetch3', ['fetchMastery'], 'dogIntervalSeconds', 4],
  ['grandmaster', ['boomerangMastery', 'fetchMastery', 'fourthDummy'], 'finalChallenge', true],
];

function createFixture({ xp = 0, lifetimeXp = xp, owned = [] } = {}) {
  const gameState = new GameState();
  gameState.xp = xp;
  gameState.lifetimeXp = lifetimeXp;
  for (const upgradeId of owned) gameState.upgrades[upgradeId] = true;

  return {
    gameState,
    manager: new ProgressionManager(gameState),
  };
}

function effectsFor(owned) {
  return createFixture({ owned }).manager.getDerivedEffects();
}

describe('ProgressionManager contract', () => {
  it('keeps the complete upgrade graph, costs, and prerequisite IDs in sync', () => {
    const expectedIds = EXPECTED_UPGRADES.map(([id]) => id);

    expect(UPGRADE_DEFINITIONS).toHaveLength(EXPECTED_UPGRADES.length);
    expect(new Set(UPGRADE_DEFINITIONS.map(({ id }) => id)).size).toBe(EXPECTED_UPGRADES.length);
    expect(UPGRADE_DEFINITIONS.map(({ id }) => id)).toEqual(expectedIds);
    expect(Object.keys(BALANCE.upgradeCosts).sort()).toEqual([...expectedIds].sort());
    for (const gatedId of Object.keys(BALANCE.unlockLifetimeXp)) {
      expect(UPGRADE_BY_ID[gatedId]).toBeDefined();
    }

    for (const [id, prerequisites, effectKey, effectValue] of EXPECTED_UPGRADES) {
      const definition = UPGRADE_BY_ID[id];
      expect(definition).toBeDefined();
      expect(definition.prerequisites).toEqual(prerequisites);
      expect(definition.effectKey).toBe(effectKey);
      expect(definition.effectValue).toBe(effectValue);
      expect(definition.costXp).toBe(BALANCE.upgradeCosts[id]);
      expect(definition.unlockLifetimeXp).toBe(BALANCE.unlockLifetimeXp[id] ?? 0);

      for (const prerequisiteId of prerequisites) {
        expect(UPGRADE_BY_ID[prerequisiteId]).toBeDefined();
      }
    }
  });

  it('rejects unknown upgrades', () => {
    const { manager } = createFixture({ xp: 1_000_000 });

    expect(manager.getPurchaseStatus('notAnUpgrade')).toEqual({
      ok: false,
      reason: 'UNKNOWN_UPGRADE',
    });
    expect(manager.purchase('notAnUpgrade')).toEqual({
      ok: false,
      reason: 'UNKNOWN_UPGRADE',
    });
  });

  it('rejects purchases without enough XP', () => {
    const cost = BALANCE.upgradeCosts.betterTraining1;
    const { manager } = createFixture({ xp: cost - 1, lifetimeXp: cost });

    expect(manager.canPurchase('betterTraining1')).toBe(false);
    expect(manager.getPurchaseStatus('betterTraining1')).toEqual({
      ok: false,
      reason: 'INSUFFICIENT_XP',
    });
  });

  it('rejects purchases without prerequisites', () => {
    const cost = BALANCE.upgradeCosts.twinThrow;
    const { manager } = createFixture({ xp: cost, lifetimeXp: cost });

    expect(manager.getPurchaseStatus('twinThrow')).toEqual({
      ok: false,
      reason: 'PREREQUISITES',
    });
  });

  it('deducts spendable XP without reducing lifetime XP', () => {
    const cost = BALANCE.upgradeCosts.betterTraining1;
    const { gameState, manager } = createFixture({ xp: cost + 250, lifetimeXp: 12_345 });

    expect(manager.purchase('betterTraining1').ok).toBe(true);
    expect(gameState.xp).toBe(250);
    expect(gameState.lifetimeXp).toBe(12_345);
    expect(gameState.hasUpgrade('betterTraining1')).toBe(true);
  });

  it('rejects duplicate purchases', () => {
    const cost = BALANCE.upgradeCosts.betterTraining1;
    const { gameState, manager } = createFixture({ xp: cost * 2, lifetimeXp: cost * 2 });

    expect(manager.purchase('betterTraining1').ok).toBe(true);
    const xpAfterFirstPurchase = gameState.xp;

    expect(manager.purchase('betterTraining1')).toEqual({
      ok: false,
      reason: 'ALREADY_PURCHASED',
    });
    expect(gameState.xp).toBe(xpAfterFirstPurchase);
  });

  it('derives training, critical, and reload upgrades at every level', () => {
    expect(effectsFor([])).toMatchObject({
      globalTrainingMultiplier: 1,
      criticalMultiplier: 2,
      missReloadSeconds: 5,
    });
    expect(effectsFor(['betterTraining1']).globalTrainingMultiplier).toBeCloseTo(1.2);
    expect(effectsFor(['betterTraining1', 'betterTraining2']).globalTrainingMultiplier).toBeCloseTo(1.45);
    expect(effectsFor(['betterTraining1', 'betterTraining2', 'betterTraining3']).globalTrainingMultiplier).toBeCloseTo(1.8);

    expect(effectsFor(['criticalTraining1']).criticalMultiplier).toBe(2.25);
    expect(effectsFor(['criticalTraining1', 'criticalTraining2']).criticalMultiplier).toBe(2.5);
    expect(effectsFor(['criticalTraining1', 'criticalTraining2', 'criticalMastery']).criticalMultiplier).toBe(3);
    expect(effectsFor(['criticalTraining1', 'criticalTraining2', 'criticalMastery', 'megaCritical']).criticalMultiplier).toBe(4);
    expect(effectsFor(['criticalTraining1', 'criticalTraining2', 'criticalMastery', 'megaCritical', 'ultraCritical']).criticalMultiplier).toBe(6);
    expect(effectsFor(['criticalTraining1', 'criticalTraining2', 'criticalMastery', 'megaCritical', 'ultraCritical', 'omegaCritical']).criticalMultiplier).toBe(10);

    expect(effectsFor(['quickReload1']).missReloadSeconds).toBe(4.5);
    expect(effectsFor(['quickReload1', 'quickReload2']).missReloadSeconds).toBe(4);
    expect(effectsFor(['quickReload1', 'quickReload2', 'quickReload3']).missReloadSeconds).toBe(3);
    expect(effectsFor(['quickReload1', 'quickReload2', 'quickReload3', 'recoveryMastery']).missReloadSeconds).toBe(2);
  });

  it('derives every precision upgrade while keeping total gauge width at 1', () => {
    const cases = [
      [[], { red: 0.80, green: 0.17, white: 0.03 }],
      [['steadyHands1'], { red: 0.78, green: 0.19, white: 0.03 }],
      [['steadyHands1', 'steadyHands2'], { red: 0.76, green: 0.21, white: 0.03 }],
      [['steadyHands1', 'steadyHands2', 'perfectWindow1'], { red: 0.76, green: 0.20, white: 0.04 }],
      [['steadyHands1', 'steadyHands2', 'perfectWindow1', 'perfectWindow2'], { red: 0.76, green: 0.19, white: 0.05 }],
    ];

    for (const [owned, expected] of cases) {
      const widths = effectsFor(owned).gaugeZoneWidths;
      expect(widths.red).toBeCloseTo(expected.red, 12);
      expect(widths.green).toBeCloseTo(expected.green, 12);
      expect(widths.white).toBeCloseTo(expected.white, 12);
      expect(widths.red + widths.green + widths.white).toBeCloseTo(1, 12);
    }
  });

  it('Twin Throw + Second Dummy derives 2 boomerangs and 2 targets', () => {
    expect(effectsFor(['twinThrow', 'secondDummy'])).toMatchObject({
      playerBoomerangCount: 2,
      targetCount: 2,
    });
  });

  it('derives all player-count, combo, mastery, dog, and Grandmaster effects', () => {
    expect(effectsFor(['tripleThrow']).playerBoomerangCount).toBe(3);
    expect(effectsFor(['quadThrow']).playerBoomerangCount).toBe(4);
    expect(effectsFor(['thirdDummy']).targetCount).toBe(3);
    expect(effectsFor(['fourthDummy']).targetCount).toBe(4);

    expect(effectsFor(['comboTraining'])).toMatchObject({
      comboUnlocked: true,
      comboMaxBonus: 0.20,
    });
    expect(effectsFor(['comboTraining', 'comboMastery']).comboMaxBonus).toBe(0.50);
    expect(effectsFor(['boomerangMastery']).boomerangMasteryMultiplier).toBe(1.5);

    expect(effectsFor(['dogCompanion'])).toMatchObject({
      dogUnlocked: true,
      dogXpFactor: 0.25,
      dogIntervalSeconds: 10,
      dogCriticalChance: 0,
    });
    expect(effectsFor(['dogTraining1']).dogXpFactor).toBe(0.40);
    expect(effectsFor(['dogTraining1', 'dogTraining2']).dogXpFactor).toBe(0.60);
    expect(effectsFor(['dogTraining3']).dogXpFactor).toBe(1);
    expect(effectsFor(['fastFetch1']).dogIntervalSeconds).toBe(8);
    expect(effectsFor(['fastFetch1', 'fastFetch2']).dogIntervalSeconds).toBe(6);
    expect(effectsFor(['fastFetch3']).dogIntervalSeconds).toBe(4);
    expect(effectsFor(['fetchMastery']).dogCriticalChance).toBe(0.10);
    expect(effectsFor(['grandmaster']).finalChallengeUnlocked).toBe(true);
  });

  it('rebuilds derived effects from loaded upgrade ownership', () => {
    const save = createDefaultSave();
    save.upgrades.twinThrow = true;
    save.upgrades.secondDummy = true;
    save.upgrades.dogCompanion = true;
    save.upgrades.fastFetch1 = true;

    const manager = new ProgressionManager(new GameState(save));

    expect(manager.getDerivedEffects()).toMatchObject({
      playerBoomerangCount: 2,
      targetCount: 2,
      dogUnlocked: true,
      dogIntervalSeconds: 8,
    });
  });
});
