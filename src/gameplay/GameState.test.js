import { describe, expect, it } from 'vitest';
import { GameState } from './GameState.js';

describe('GameState core XP contract', () => {
  it('adds spendable/lifetime XP and source statistics consistently', () => {
    const state = new GameState();

    expect(state.addXp(12, 'player')).toBe(12);
    expect(state.addXp(3, 'dog')).toBe(3);

    expect(state.xp).toBe(15);
    expect(state.lifetimeXp).toBe(15);
    expect(state.stats.xpEarnedFromPlayer).toBe(12);
    expect(state.stats.xpEarnedFromDog).toBe(3);
  });

  it('spending XP never reduces lifetime XP', () => {
    const state = new GameState();
    state.addXp(100, 'player');

    expect(state.spendXp(40)).toBe(true);
    expect(state.xp).toBe(60);
    expect(state.lifetimeXp).toBe(100);
  });
});
