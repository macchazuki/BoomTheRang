import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { GameScene } from './GameScene.js';

function createInputFixture() {
  let gameplayHandler = null;
  const skillsButton = { addEventListener: vi.fn() };
  const settingsButton = { addEventListener: vi.fn() };
  const root = {
    addEventListener: vi.fn((type, handler) => {
      if (type === 'pointerdown') gameplayHandler = handler;
    }),
    querySelector: vi.fn((selector) => {
      if (selector === '[data-action="skills"]') return skillsButton;
      if (selector === '[data-action="settings"]') return settingsButton;
      return null;
    }),
  };

  const scene = Object.create(GameScene.prototype);
  scene.root = root;
  scene.handleGameplayPointer = null;

  const callbacks = {
    onGameplayPointer: vi.fn(),
    onOpenSkills: vi.fn(),
    onOpenSettings: vi.fn(),
  };
  scene.bindInput(callbacks);

  return { scene, callbacks, gameplayHandler, skillsButton, settingsButton };
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
  it('routes unobstructed pointerdown through the single gameplay callback', () => {
    const fixture = createInputFixture();
    const event = { target: { closest: vi.fn(() => null) } };

    fixture.gameplayHandler(event);

    expect(fixture.callbacks.onGameplayPointer).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onGameplayPointer).toHaveBeenCalledWith(event);
  });

  it('does not route overlay or action-control pointers into gameplay', () => {
    const fixture = createInputFixture();
    const blockedEvent = { target: { closest: vi.fn(() => ({})) } };

    fixture.gameplayHandler(blockedEvent);

    expect(fixture.callbacks.onGameplayPointer).not.toHaveBeenCalled();
  });

  it('Skills and Settings consume pointerdown before opening their panels', () => {
    const fixture = createInputFixture();
    const skillsHandler = fixture.skillsButton.addEventListener.mock.calls[0][1];
    const settingsHandler = fixture.settingsButton.addEventListener.mock.calls[0][1];
    const skillsEvent = { stopPropagation: vi.fn() };
    const settingsEvent = { stopPropagation: vi.fn() };

    skillsHandler(skillsEvent);
    settingsHandler(settingsEvent);

    expect(skillsEvent.stopPropagation).toHaveBeenCalledOnce();
    expect(settingsEvent.stopPropagation).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onOpenSkills).toHaveBeenCalledOnce();
    expect(fixture.callbacks.onOpenSettings).toHaveBeenCalledOnce();
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
