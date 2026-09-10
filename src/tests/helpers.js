import { createDefaultSave } from '../persistence/defaultSave.js';
import { GameState } from '../gameplay/GameState.js';
import { ProgressionManager } from '../progression/ProgressionManager.js';

/** Build isolated state/progression objects for deterministic unit tests. */
export function createProgressionFixture(overrides = {}) {
  const save = createDefaultSave();
  Object.assign(save, overrides);
  const gameState = new GameState(save);
  const progressionManager = new ProgressionManager(gameState);
  return { gameState, progressionManager };
}

/** Purchase an upgrade directly in fixtures when a test is about derived behavior, not transaction rules. */
export function ownUpgrade(gameState, upgradeId) {
  gameState.upgrades[upgradeId] = true;
}
