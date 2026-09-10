import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameApp } from './GameApp.js';

function createLifecycleFixture({ pauseReason = null, modalOpen = false } = {}) {
  const app = Object.create(GameApp.prototype);
  app.previousFrameMs = 12;
  app.gameState = { toSaveData: vi.fn(() => ({ version: 1 })) };
  app.saveManager = { save: vi.fn() };
  app.upgradePanel = { isOpen: modalOpen };
  app.settingsPanel = { isOpen: false };
  app.completionPanel = { isOpen: false };
  app.gameController = {
    pauseReason,
    pause: vi.fn(function pause(reason) {
      if (this.pauseReason === null) this.pauseReason = reason;
    }),
    resume: vi.fn(),
  };
  return app;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GameApp gameplay visibility lifecycle', () => {
  it('pauses and saves when the document becomes hidden', () => {
    const app = createLifecycleFixture();
    vi.stubGlobal('document', { hidden: true });

    app.handleVisibilityChange();

    expect(app.gameController.pause).toHaveBeenCalledWith('document-hidden');
    expect(app.saveManager.save).toHaveBeenCalledWith({ version: 1 });
  });

  it('resumes when visibility was the reason gameplay paused', () => {
    const app = createLifecycleFixture({ pauseReason: 'document-hidden' });
    vi.stubGlobal('document', { hidden: false });
    vi.stubGlobal('performance', { now: vi.fn(() => 2500) });

    app.handleVisibilityChange();

    expect(app.previousFrameMs).toBe(2500);
    expect(app.gameController.resume).toHaveBeenCalledTimes(1);
  });

  it('does not resume through an open gameplay modal', () => {
    const app = createLifecycleFixture({ pauseReason: 'document-hidden', modalOpen: true });
    vi.stubGlobal('document', { hidden: false });
    vi.stubGlobal('performance', { now: vi.fn(() => 2500) });

    app.handleVisibilityChange();

    expect(app.previousFrameMs).toBe(2500);
    expect(app.gameController.resume).not.toHaveBeenCalled();
  });

  it('does not resume when an overlay pause reason is still authoritative', () => {
    const app = createLifecycleFixture({ pauseReason: 'settings-panel' });
    vi.stubGlobal('document', { hidden: false });
    vi.stubGlobal('performance', { now: vi.fn(() => 2500) });

    app.handleVisibilityChange();

    expect(app.gameController.resume).not.toHaveBeenCalled();
  });
});
