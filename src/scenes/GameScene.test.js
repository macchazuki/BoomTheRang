import * as THREE from 'three';
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
    object3d: { position: new THREE.Vector3(0, -5.5, 0) },
    playThrow: vi.fn(),
  };
  scene.dogView = {
    object3d: { position: new THREE.Vector3(1.8, -5.7, 0), visible: true },
    playThrow: vi.fn(),
  };
  scene.targetViews = Array.from({ length: targetCount }, (_, index) => ({
    object3d: { position: new THREE.Vector3(index === 0 ? -1 : 1, 5, 0) },
    playReaction: vi.fn(),
  }));
  scene.boomerangViews = Array.from({ length: boomerangCount }, () => ({
    playHitPath: vi.fn(),
    playMissPath: vi.fn(),
    reset: vi.fn(),
  }));
  scene.dogBoomerangView = {
    playHitPath: vi.fn(),
  };
  scene.playerResultReducedMotion = false;
  scene.isReducedMotionRequested = vi.fn((value) => value);
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
    const blockedByControl = {
      defaultPrevented: false,
      isPrimary: true,
      button: 0,
      target: { closest: vi.fn(() => ({})) },
    };
    const secondaryTouch = {
      defaultPrevented: false,
      isPrimary: false,
      button: 0,
      target: { closest: vi.fn(() => null) },
    };
    const rightClick = {
      defaultPrevented: false,
      isPrimary: true,
      button: 2,
      target: { closest: vi.fn(() => null) },
    };

    fixture.gameplayHandler(blockedByControl);
    fixture.gameplayHandler(secondaryTouch);
    fixture.gameplayHandler(rightClick);

    expect(fixture.callbacks.onGameplayPointer).not.toHaveBeenCalled();
  });

  it('opens Skills and Settings through keyboard/touch-compatible click handlers', () => {
    const fixture = createInputFixture();
    const skillsEvent = { stopPropagation: vi.fn() };
    const settingsEvent = { stopPropagation: vi.fn() };

    fixture.skillsButton.getHandler('click')(skillsEvent);
    fixture.settingsButton.getHandler('click')(settingsEvent);

    expect(skillsEvent.stopPropagation).toHaveBeenCalledOnce();
    expect(settingsEvent.stopPropagation).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onOpenSkills).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onOpenSettings).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onGameplayPointer).not.toHaveBeenCalled();
  });

  it('stops overlay pointerdown before it can reach the gameplay boundary', () => {
    const fixture = createInputFixture();
    const event = { stopPropagation: vi.fn() };

    fixture.overlay.getHandler('pointerdown')(event);

    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onGameplayPointer).not.toHaveBeenCalled();
  });
});

describe('GameScene gameplay presentation', () => {
  it('chains each successful player boomerang through every target and back to the player', async () => {
    const scene = createAnimationFixture({ targetCount: 2, boomerangCount: 2 });

    await scene.playPlayerThrow({ result: 'HIT', targetCount: 2, boomerangCount: 2 });

    expect(scene.playerView.playThrow).toHaveBeenCalledOnce();
    expect(scene.boomerangViews[0].playHitPath).toHaveBeenCalledOnce();
    expect(scene.boomerangViews[1].playHitPath).toHaveBeenCalledOnce();
    const firstPath = scene.boomerangViews[0].playHitPath.mock.calls[0][0];
    expect(firstPath.points).toHaveLength(4);
    expect(firstPath.delaySeconds).toBe(0);
    expect(scene.boomerangViews[1].playHitPath.mock.calls[0][0].delaySeconds).toBeGreaterThan(0);
  });

  it('uses a bypass path for MISS without triggering hit paths', async () => {
    const scene = createAnimationFixture({ targetCount: 2, boomerangCount: 1 });

    await scene.playPlayerThrow({ result: 'MISS', targetCount: 2, boomerangCount: 1 });

    expect(scene.boomerangViews[0].playMissPath).toHaveBeenCalledOnce();
    expect(scene.boomerangViews[0].playHitPath).not.toHaveBeenCalled();
    const missPoints = scene.boomerangViews[0].playMissPath.mock.calls[0][0].points;
    expect(Math.abs(missPoints[1].x)).toBeGreaterThan(1);
  });

  it('plays dog animation independently and chains its boomerang through all targets', async () => {
    const scene = createAnimationFixture({ targetCount: 2, boomerangCount: 1 });

    await scene.playDogThrow({ targetCount: 2, critical: true, reducedMotion: false });

    expect(scene.dogView.playThrow).toHaveBeenCalledWith({ critical: true, reducedMotion: false });
    expect(scene.dogBoomerangView.playHitPath).toHaveBeenCalledOnce();
    expect(scene.dogBoomerangView.playHitPath.mock.calls[0][0].points).toHaveLength(4);
    expect(scene.targetViews[0].playReaction).toHaveBeenCalledWith('CRITICAL', {
      reducedMotion: false,
    });
  });
});
