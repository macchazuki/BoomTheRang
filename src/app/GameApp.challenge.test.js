import { describe, expect, it, vi } from 'vitest';
import { GameApp } from './GameApp.js';
import { GameState } from '../gameplay/GameState.js';
import { ChallengeManager } from '../challenges/ChallengeManager.js';

function createHarness() {
  const app = Object.create(GameApp.prototype);
  app.accountGameState = new GameState();
  app.accountGameState.xp = 12_345;
  app.accountGameState.lifetimeXp = 50_000;
  app.accountGameState.upgrades.betterTraining1 = true;
  app.accountGameState.skills.rapidRecall = { learned: true, level: 2 };
  app.accountGameState.settings.reducedMotion = true;
  app.gameState = app.accountGameState;
  app.challengeManager = new ChallengeManager(app.accountGameState, { now: () => 10_000 });
  app.saveManager = { save: vi.fn() };
  app.startGameplay = vi.fn();
  app.challengePanel = { render: vi.fn() };
  app.activeChallenge = null;
  return app;
}

describe('GameApp challenge isolation', () => {
  it('starts a fresh temporary progression state without overwriting the account state', () => {
    const app = createHarness();

    const result = app.startChallenge('speedTrial');

    expect(result.ok).toBe(true);
    expect(app.gameState).not.toBe(app.accountGameState);
    expect(app.gameState.xp).toBe(0);
    expect(app.gameState.lifetimeXp).toBe(0);
    expect(app.gameState.upgrades.betterTraining1).toBe(false);
    expect(app.gameState.skills.rapidRecall).toEqual({ learned: false, level: 0 });
    expect(app.gameState.settings.reducedMotion).toBe(true);
    expect(app.accountGameState.xp).toBe(12_345);
    expect(app.accountGameState.upgrades.betterTraining1).toBe(true);
    expect(app.accountGameState.skills.rapidRecall).toEqual({ learned: true, level: 2 });
    expect(app.accountGameState.challenges.speedTrial.cooldownUntil).toBeGreaterThan(10_000);
    expect(app.saveManager.save).toHaveBeenCalledTimes(1);
    expect(app.startGameplay).toHaveBeenCalledWith({ challengeDefinition: result.definition });
  });
});
