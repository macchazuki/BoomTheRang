import { describe, expect, it, vi } from 'vitest';
import { TargetDummyView } from './TargetDummyView.js';

function createFixture() {
  const sprite = {
    frame: { height: 400 },
    setDepth: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setFrame: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    play: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
  const scene = { add: { sprite: vi.fn(() => sprite) } };
  const view = new TargetDummyView({
    scene,
    toScreenPoint: ({ x, y }) => ({ x: 100 + x, y: 200 - y }),
    worldScale: (value) => value * 10,
  });
  return { view, sprite, scene };
}

describe('TargetDummyView', () => {
  it('uses the Phaser target sprite and keeps world positioning separate', () => {
    const { view, sprite, scene } = createFixture();
    view.setPosition([1.5, 5]);

    expect(scene.add.sprite).toHaveBeenCalledWith(0, 0, 'target-dummy', 'target-0');
    expect(sprite.setPosition).toHaveBeenLastCalledWith(101.5, 195);
    expect(view.getWorldPosition()).toEqual({ x: 1.5, y: 5 });
  });

  it('selects the correct Phaser animation for hit variants', () => {
    const { view, sprite } = createFixture();

    view.playReaction('HIT');
    expect(sprite.play).toHaveBeenLastCalledWith('target-hit');

    view.playReaction('CRITICAL');
    expect(sprite.play).toHaveBeenLastCalledWith('target-critical');

    view.playReaction('HIT', { reducedMotion: true });
    expect(sprite.play).toHaveBeenLastCalledWith('target-hit-reduced');
  });

  it('does not animate on MISS', () => {
    const { view, sprite } = createFixture();
    view.playReaction('MISS');
    expect(sprite.play).not.toHaveBeenCalled();
  });
});
