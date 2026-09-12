import { describe, expect, it } from 'vitest';
import { GameState } from '../gameplay/GameState.js';
import { BALANCE } from './balance.js';
import { ProgressionManager } from './ProgressionManager.js';
import { SKILL_BY_ID, SKILL_IDS } from './skillDefinitions.js';

describe('active skills progression', () => {
  it('defines both skills with three centralized levels', () => {
    expect(SKILL_IDS).toEqual(['rapidRecall', 'openingBullseye']);
    expect(SKILL_BY_ID.rapidRecall.learnCostXp).toBe(BALANCE.activeSkills.rapidRecall.learnCostXp);
    expect(SKILL_BY_ID.rapidRecall.levels).toHaveLength(3);
    expect(SKILL_BY_ID.openingBullseye.levels).toHaveLength(3);
  });

  it('learns at level 1 and upgrades transactionally', () => {
    const gameState = new GameState();
    gameState.xp = 1_000_000;
    gameState.lifetimeXp = 1_000_000;
    const manager = new ProgressionManager(gameState);
    expect(manager.learnSkill('rapidRecall').ok).toBe(true);
    expect(manager.getSkillLevel('rapidRecall')).toBe(1);
    expect(manager.upgradeSkill('rapidRecall').ok).toBe(true);
    expect(manager.getSkillLevel('rapidRecall')).toBe(2);
    expect(manager.upgradeSkill('rapidRecall').ok).toBe(true);
    expect(manager.getSkillLevel('rapidRecall')).toBe(3);
    expect(manager.getSkillUpgradeStatus('rapidRecall')).toEqual({ ok: false, reason: 'MAX_LEVEL' });
  });

  it('returns current runtime values for the learned level', () => {
    const gameState = new GameState();
    gameState.xp = 1_000_000;
    const manager = new ProgressionManager(gameState);
    manager.learnSkill('rapidRecall');
    expect(manager.getSkillRuntimeDefinition('rapidRecall')).toEqual(BALANCE.activeSkills.rapidRecall.levels[0]);
    manager.upgradeSkill('rapidRecall');
    expect(manager.getSkillRuntimeDefinition('rapidRecall')).toEqual(BALANCE.activeSkills.rapidRecall.levels[1]);
  });
});
