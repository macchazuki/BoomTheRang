import { describe, expect, it, vi } from 'vitest';
import { PlayerView } from './PlayerView.js';

function createSprite() {
  return {
    frame: { height: 724 },
    setDepth: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setFrame: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    play: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

describe('PlayerView', () => {
  it('lays out the Phaser sprite in the legacy world position', () => {
    const sprite = createSprite();
    const scene = { add: { sprite: vi.fn(() => sprite) } };
    const view = new PlayerView({
      scene,
      toScreenPoint: ({ x, y }) => ({ x: 100 + x, y: 200 - y }),
      worldScale: (value) => value * 10,
    });

    expect(scene.add.sprite).toHaveBeenCalledWith(0, 0, 'hero', 'hero-0');
    expect(sprite.setPosition).toHaveBeenLastCalledWith(100, 205.5);
    expect(sprite.setScale).toHaveBeenLastCalledWith(32 / 724);
  });

  it('uses Phaser animations for normal and reduced-motion throws', () => {
    const sprite = createSprite();
    const scene = { add: { sprite: vi.fn(() => sprite) } };
    const view = new PlayerView({
      scene,
      toScreenPoint: () => ({ x: 0, y: 0 }),
      worldScale: (value) => value,
    });

    view.playThrow();
    expect(sprite.play).toHaveBeenLastCalledWith('hero-throw');

    view.playThrow({ reducedMotion: true });
    expect(sprite.play).toHaveBeenLastCalledWith('hero-throw-reduced');
  });
});
