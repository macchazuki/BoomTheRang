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
