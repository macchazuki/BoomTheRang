import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameController, GAMEPLAY_STATE } from './GameController.js';

function createUpdateHarness() {
  const controller = Object.create(GameController.prototype);
  controller.state = GAMEPLAY_STATE.READY;
  controller.gameState = { xp: 0, gameplay: { combo: 0 }, incrementStat: vi.fn() };
  controller.dogController = { update: vi.fn() };
  controller.gaugeController = { update: vi.fn(), getSnapshot: vi.fn(() => ({})) };
  controller.progressionManager = {
    getDerivedEffects: vi.fn(() => ({ comboUnlocked: false })),
  };
  controller.gaugeView = { render: vi.fn() };
  controller.hud = { render: vi.fn() };
  controller.reloadRemainingSeconds = 0;
  controller.currentPlayerBoomerangCount = 1;
  controller.maxPlayerBoomerangCount = 1;
  controller.missedBoomerangReloads = [];
  return controller;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GameController lifecycle', () => {
  it('does not advance active play or dog timing while the document is hidden', () => {
    const controller = createUpdateHarness();
    vi.stubGlobal('document', { hidden: true });

    controller.update(30);

    expect(controller.gameState.incrementStat).not.toHaveBeenCalled();
    expect(controller.dogController.update).not.toHaveBeenCalled();
    expect(controller.gaugeController.update).not.toHaveBeenCalled();

    document.hidden = false;
    controller.update(0.5);

    expect(controller.gameState.incrementStat).toHaveBeenCalledWith('activePlaySeconds', 0.5);
    expect(controller.dogController.update).toHaveBeenCalledWith(0.5);
    expect(controller.gaugeController.update).toHaveBeenCalledWith(0.5);
  });

  it('does not advance active play or dog timing while paused by a modal', () => {
    const controller = createUpdateHarness();
    vi.stubGlobal('document', { hidden: false });
    controller.state = GAMEPLAY_STATE.PAUSED;

    controller.update(30);

    expect(controller.gameState.incrementStat).not.toHaveBeenCalled();
    expect(controller.dogController.update).not.toHaveBeenCalled();
    expect(controller.gaugeController.update).not.toHaveBeenCalled();
  });
});
