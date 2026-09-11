import { describe, expect, it, vi } from 'vitest';
import { GameController, MAX_TARGET_HP, distributeDamage } from './GameController.js';

describe('target dummy HP and damage', () => {
  it('uses signed 32-bit max int HP', () => {
    expect(MAX_TARGET_HP).toBe(2_147_483_647);
  });

  it('splits integer damage across targets without changing total damage', () => {
    const damages = distributeDamage(41, 3);
    expect(damages).toEqual([14, 14, 13]);
    expect(damages.reduce((sum, damage) => sum + damage, 0)).toBe(41);
  });

  it('subtracts damage from each target and mirrors HP plus popup values to the HUD', () => {
    const controller = Object.create(GameController.prototype);
    controller.targetHitPoints = Array.from({ length: 4 }, () => MAX_TARGET_HP);
    controller.hud = {
      renderTargetHealth: vi.fn(),
      showTargetDamage: vi.fn(),
    };

    const damages = controller.applyTargetDamage(40, 2, { critical: true, reducedMotion: false });

    expect(damages).toEqual([20, 20]);
    expect(controller.targetHitPoints.slice(0, 2)).toEqual([
      MAX_TARGET_HP - 20,
      MAX_TARGET_HP - 20,
    ]);
    expect(controller.hud.renderTargetHealth).toHaveBeenLastCalledWith({
      currentHp: [MAX_TARGET_HP - 20, MAX_TARGET_HP - 20],
      maxHp: MAX_TARGET_HP,
    });
    expect(controller.hud.showTargetDamage).toHaveBeenLastCalledWith({
      damages: [20, 20],
      critical: true,
      reducedMotion: false,
    });
  });
});
