import { describe, expect, it, vi } from 'vitest';
import { GameScene } from './GameScene.js';

function createEventTarget() {
  const handlers = new Map();
  return {
    addEventListener: vi.fn((type, handler) => handlers.set(type, handler)),
    removeEventListener: vi.fn((type, handler) => {
      if (handlers.get(type) === handler) handlers.delete(type);
    }),
    getHandler: (type) => handlers.get(type),
  };
}

function createInputFixture() {
  let gameplayHandler = null;
  const skillsButton = createEventTarget();
  const settingsButton = createEventTarget();
  const overlay = createEventTarget();
  const root = {
    addEventListener: vi.fn((type, handler) => {
      if (type === 'pointerdown') gameplayHandler = handler;
    }),
    removeEventListener: vi.fn(),
    querySelector: vi.fn((selector) => {
      if (selector === '[data-action="skills"]') return skillsButton;
      if (selector === '[data-action="settings"]') return settingsButton;
      if (selector === '[data-overlay]') return overlay;
      return null;
    }),
  };

  const scene = Object.create(GameScene.prototype);
  scene.root = root;
  scene.handleGameplayPointer = null;
  scene.handleSkillsClick = null;
  scene.handleSettingsClick = null;
  scene.handleOverlayPointer = null;

  const callbacks = {
    onGameplayPointer: vi.fn(),
    onOpenSkills: vi.fn(),
    onOpenSettings: vi.fn(),
  };
  scene.bindInput(callbacks);

  return { scene, callbacks, gameplayHandler, skillsButton, settingsButton, overlay };
}

function createAnimationFixture({ targetCount = 2, boomerangCount = 2 } = {}) {
  const scene = Object.create(GameScene.prototype);
  scene.playerView = {
    getWorldPosition: vi.fn(() => ({ x: 0, y: -5.5 })),
    playThrow: vi.fn(),
  };
  scene.dogView = {
    visible: true,
    getWorldPosition: vi.fn(() => ({ x: 1.8, y: -5.7 })),
    playThrow: vi.fn(),
  };
  scene.targetViews = Array.from({ length: targetCount }, (_, index) => ({
    getWorldPosition: vi.fn(() => ({ x: index === 0 ? -1 : 1, y: 5 })),
    playReaction: vi.fn(),
  }));
  scene.boomerangViews = Array.from({ length: boomerangCount }, () => ({
    playHitPath: vi.fn(),
    playMissPath: vi.fn(),
    reset: vi.fn(),
  }));
  scene.dogBoomerangView = { playHitPath: vi.fn() };
  scene.playerResultReducedMotion = false;
  scene.isReducedMotionRequested = vi.fn((value) => value);
  scene.dispatchImpact = vi.fn();
  return scene;
}

describe('GameScene pointer routing', () => {
  it('routes unobstructed primary left pointerdown through the gameplay callback', () => {
    const fixture = createInputFixture();
    const event = {
      defaultPrevented: false,
      isPrimary: true,
      button: 0,
      target: { closest: vi.fn(() => null) },
    };

    fixture.gameplayHandler(event);

    expect(fixture.callbacks.onGameplayPointer).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onGameplayPointer).toHaveBeenCalledWith(event);
  });

  it('does not route overlays, controls, secondary touches, or non-left mouse buttons into gameplay', () => {
    const fixture = createInputFixture();
    fixture.gameplayHandler({
      defaultPrevented: false,
      isPrimary: true,
      button: 0,
      target: { closest: vi.fn(() => ({})) },
    });
    fixture.gameplayHandler({
      defaultPrevented: false,
      isPrimary: false,
      button: 0,
      target: { closest: vi.fn(() => null) },
    });
    fixture.gameplayHandler({
      defaultPrevented: false,
      isPrimary: true,
      button: 2,
      target: { closest: vi.fn(() => null) },
    });

    expect(fixture.callbacks.onGameplayPointer).not.toHaveBeenCalled();
  });

  it('opens Upgrades and Settings through click handlers', () => {
    const fixture = createInputFixture();
    const skillsEvent = { stopPropagation: vi.fn() };
    const settingsEvent = { stopPropagation: vi.fn() };

    fixture.skillsButton.getHandler('click')(skillsEvent);
    fixture.settingsButton.getHandler('click')(settingsEvent);

    expect(skillsEvent.stopPropagation).toHaveBeenCalledOnce();
    expect(settingsEvent.stopPropagation).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onOpenSkills).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onOpenSettings).toHaveBeenCalledOnce();
  });
});

describe('GameScene gameplay presentation', () => {
  it('launches player boomerangs from the raised right-hand position', async () => {
    const scene = createAnimationFixture({ targetCount: 2, boomerangCount: 2 });

    await scene.playPlayerThrow({ result: 'HIT', targetCount: 2, boomerangCount: 2 });

    expect(scene.playerView.playThrow).toHaveBeenCalledOnce();
    expect(scene.boomerangViews[0].playHitPath).toHaveBeenCalledOnce();
    expect(scene.boomerangViews[1].playHitPath).toHaveBeenCalledOnce();
    const firstPath = scene.boomerangViews[0].playHitPath.mock.calls[0][0];
    expect(firstPath.points).toHaveLength(4);
    expect(firstPath.points[0].x).toBeGreaterThan(0.8);
    expect(firstPath.points[0].y).toBeGreaterThan(-5);
    expect(firstPath.delaySeconds).toBeCloseTo(0.215);
    expect(scene.boomerangViews[1].playHitPath.mock.calls[0][0].delaySeconds).toBeGreaterThan(firstPath.delaySeconds);
  });

  it('uses the shorter final-frame delay when reduced motion is enabled', async () => {
    const scene = createAnimationFixture({ targetCount: 1, boomerangCount: 1 });

    await scene.playPlayerThrow({
      result: 'HIT',
      targetCount: 1,
      boomerangCount: 1,
      reducedMotion: true,
    });

    expect(scene.boomerangViews[0].playHitPath.mock.calls[0][0].delaySeconds).toBeCloseTo(0.12);
  });

  it('uses a bypass path for MISS without triggering hit paths', async () => {
    const scene = createAnimationFixture({ targetCount: 2, boomerangCount: 1 });

    await scene.playPlayerThrow({ result: 'MISS', targetCount: 2, boomerangCount: 1 });

    expect(scene.boomerangViews[0].playMissPath).toHaveBeenCalledOnce();
    expect(scene.boomerangViews[0].playHitPath).not.toHaveBeenCalled();
    const missPoints = scene.boomerangViews[0].playMissPath.mock.calls[0][0].points;
    expect(Math.abs(missPoints[1].x)).toBeGreaterThan(1);
  });

  it('plays dog animation independently and reacts when the boomerang reaches each target', async () => {
    const scene = createAnimationFixture({ targetCount: 2, boomerangCount: 1 });

    await scene.playDogThrow({ targetCount: 2, critical: true, reducedMotion: false });

    expect(scene.dogView.playThrow).toHaveBeenCalledWith({ critical: true, reducedMotion: false });
    const pathOptions = scene.dogBoomerangView.playHitPath.mock.calls[0][0];
    expect(pathOptions.points).toHaveLength(4);

    pathOptions.onPathPoint(1);
    expect(scene.targetViews[0].playReaction).toHaveBeenCalledWith('CRITICAL', { reducedMotion: false });
    expect(scene.targetViews[1].playReaction).not.toHaveBeenCalled();

    pathOptions.onPathPoint(2);
    expect(scene.targetViews[1].playReaction).toHaveBeenCalledWith('CRITICAL', { reducedMotion: false });
  });
});
