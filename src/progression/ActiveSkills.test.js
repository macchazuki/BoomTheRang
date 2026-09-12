import { describe, expect, it } from 'vitest';
import { GameState } from '../gameplay/GameState.js';
import { BALANCE } from './balance.js';
import { ProgressionManager } from './ProgressionManager.js';
import { SKILL_BY_ID, SKILL_IDS } from './skillDefinitions.js';

describe('active skills progression', () => {
  it('defines both active skills with centralized costs', () => {
    expect(SKILL_IDS).toEqual(['rapidRecall', 'openingBullseye']);
    expect(SKILL_BY_ID.rapidRecall.costXp).toBe(BALANCE.activeSkills.rapidRecall.costXp);
    expect(SKILL_BY_ID.openingBullseye.costXp).toBe(BALANCE.activeSkills.openingBullseye.costXp);
  });

  it('learns skills transactionally and enables them immediately', () => {
    const gameState = new GameState();
    gameState.xp = 100_000;
    gameState.lifetimeXp = 100_000;
    const manager = new ProgressionManager(gameState);

    const beforeXp = gameState.xp;
    expect(manager.learnSkill('rapidRecall').ok).toBe(true);
    expect(gameState.xp).toBe(beforeXp - BALANCE.activeSkills.rapidRecall.costXp);
    expect(manager.hasSkill('rapidRecall')).toBe(true);
    expect(manager.isSkillActive('rapidRecall')).toBe(true);
    expect(manager.getSkillLearnStatus('rapidRecall')).toEqual({
      ok: false,
      reason: 'ALREADY_LEARNED',
    });
  });

  it('derives only the effects of skills that are currently active', () => {
    const gameState = new GameState();
    gameState.xp = 100_000;
    gameState.lifetimeXp = 100_000;
    const manager = new ProgressionManager(gameState);

    manager.learnSkill('rapidRecall');
    manager.learnSkill('openingBullseye');

    expect(manager.getDerivedEffects()).toMatchObject({
      missReturnChance: BALANCE.activeSkills.rapidRecall.missReturnChance,
      gaugeSpeedMultiplier: 1 + BALANCE.activeSkills.rapidRecall.gaugeSpeedBonus,
      autoFirstBoomerang: true,
    });

    expect(manager.setSkillActive('rapidRecall', false)).toEqual({
      ok: true,
      reason: null,
      active: false,
    });
    expect(manager.getDerivedEffects()).toMatchObject({
      missReturnChance: 0,
      gaugeSpeedMultiplier: 1,
      autoFirstBoomerang: true,
    });

    manager.setSkillActive('openingBullseye', false);
    expect(manager.getDerivedEffects()).toMatchObject({
      missReturnChance: 0,
      gaugeSpeedMultiplier: 1,
      autoFirstBoomerang: false,
    });
  });

  it('rejects unknown skills, unaffordable learning, and activating unlearned skills', () => {
    const gameState = new GameState();
    const manager = new ProgressionManager(gameState);

    expect(manager.getSkillLearnStatus('missing')).toEqual({ ok: false, reason: 'UNKNOWN_SKILL' });
    expect(manager.getSkillLearnStatus('rapidRecall')).toEqual({ ok: false, reason: 'INSUFFICIENT_XP' });
    expect(manager.setSkillActive('rapidRecall', true)).toEqual({ ok: false, reason: 'NOT_LEARNED' });
  });
});
