import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameApp } from './GameApp.js';

function createLifecycleHarness() {
  const app = Object.create(GameApp.prototype);
  app.previousFrameMs = 1000;
  app.lastPeriodicSaveSeconds = 0;
  app.animationFrameId = null;
  app.gameState = { toSaveData: vi.fn(() => ({ version: 1 })) };
  app.saveManager = { save: vi.fn() };
  app.gameController = {
    pauseReason: null,
    pause: vi.fn(function pause(reason) {
      this.pauseReason = reason;
    }),
    resume: vi.fn(),
    update: vi.fn(),
    isActivePlay: vi.fn(() => true),
  };
  app.gameScene = { update: vi.fn() };
  app.upgradePanel = { isOpen: false };
  app.settingsPanel = { isOpen: false };
  app.completionPanel = { isOpen: false };
  return app;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GameApp lifecycle', () => {
  it('pauses and saves when hidden, then resets frame timing before resume', () => {
    const documentState = { hidden: true };
    vi.stubGlobal('document', documentState);
    vi.stubGlobal('performance', { now: vi.fn(() => 9000) });

    const app = createLifecycleHarness();
    app.handleVisibilityChange();

    expect(app.gameController.pause).toHaveBeenCalledWith('document-hidden');
    expect(app.saveManager.save).toHaveBeenCalledWith({ version: 1 });

    documentState.hidden = false;
    app.handleVisibilityChange();

    expect(app.previousFrameMs).toBe(9000);
    expect(app.gameController.resume).toHaveBeenCalledTimes(1);
  });

  it('does not resume through a modal that was already pausing gameplay', () => {
    vi.stubGlobal('document', { hidden: false });
    vi.stubGlobal('performance', { now: vi.fn(() => 2000) });

    const app = createLifecycleHarness();
    app.gameController.pauseReason = 'settings-panel';
    app.settingsPanel.isOpen = true;

    app.handleVisibilityChange();

    expect(app.previousFrameMs).toBe(2000);
    expect(app.gameController.resume).not.toHaveBeenCalled();
  });

  it('accumulates periodic-save time only during active gameplay', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 123));

    const app = createLifecycleHarness();
    app.gameController.isActivePlay.mockReturnValue(false);
    app.frame(1100);

    expect(app.lastPeriodicSaveSeconds).toBe(0);
    expect(app.saveManager.save).not.toHaveBeenCalled();

    app.gameController.isActivePlay.mockReturnValue(true);
    app.lastPeriodicSaveSeconds = 19.95;
    app.frame(1200);

    expect(app.saveManager.save).toHaveBeenCalledWith({ version: 1 });
    expect(app.lastPeriodicSaveSeconds).toBe(0);
  });
});
