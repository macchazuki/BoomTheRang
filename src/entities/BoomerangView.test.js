import { describe, expect, it, vi } from 'vitest';
import { BoomerangView } from './BoomerangView.js';

function createFixture({ index = 0 } = {}) {
  const sprites = [];
  const scene = {
    add: {
      sprite: vi.fn(() => {
        const sprite = {
          frame: { height: 100 },
          visible: false,
          setDepth: vi.fn().mockReturnThis(),
          setVisible: vi.fn(function setVisible(value) { this.visible = value; return this; }),
          setTint: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          setFrame: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        };
        sprites.push(sprite);
        return sprite;
      }),
    },
    tweens: {
      add: vi.fn((config) => ({ config, stop: vi.fn(), remove: vi.fn() })),
    },
  };
  const view = new BoomerangView({
    scene,
    index,
    toScreenPoint: ({ x, y }) => ({ x: x * 10, y: y * -10 }),
    worldScale: (value) => value * 10,
  });
  return { view, sprite: sprites[0], sprites, scene };
}

describe('BoomerangView', () => {
  it('uses a Phaser sprite and tween for flight', () => {
    const { view, scene } = createFixture();

    view.playHitPath({
      points: [{ x: 2, y: 0 }, { x: 2, y: 4 }],
      durationSeconds: 1,
      delaySeconds: 0.2,
    });

    expect(scene.tweens.add).toHaveBeenCalledOnce();
    const tweenConfig = scene.tweens.add.mock.calls[0][0];
    expect(tweenConfig.duration).toBe(1000);
    expect(tweenConfig.delay).toBe(200);
  });

  it('keeps an earlier boomerang rendered when another throw starts', () => {
    const { view, sprites, scene } = createFixture();
    const path = {
      points: [{ x: 2, y: 0 }, { x: 2, y: 4 }],
      durationSeconds: 1,
    };

    view.playHitPath(path);
    const firstTween = view.tween;
    view.playHitPath(path);

    expect(scene.add.sprite).toHaveBeenCalledTimes(2);
    expect(scene.tweens.add).toHaveBeenCalledTimes(2);
    expect(view.tween).toBe(firstTween);
    expect(sprites[0].destroy).not.toHaveBeenCalled();
  });

  it('keeps the throwing-hand launch offset for player paths only', () => {
    const player = createFixture().view;
    player.playHitPath({
      points: [{ x: 0, y: -5.5 }, { x: 0, y: 5 }, { x: 0, y: -5.5 }],
      durationSeconds: 1,
    });
    expect(player.pathPoints[0].x).toBeCloseTo(0.55);
    expect(player.pathPoints[2].x).toBeCloseTo(0.55);

    const dog = createFixture().view;
    dog.playHitPath({
      points: [{ x: 1.8, y: -5.7 }, { x: 0, y: 5 }, { x: 1.8, y: -5.7 }],
      durationSeconds: 1,
    });
    expect(dog.pathPoints[0].x).toBeCloseTo(1.8);
  });

  it('fires path-point callbacks as the Phaser tween advances', () => {
    const { view } = createFixture();
    const onPathPoint = vi.fn();
    view.playHitPath({
      points: [{ x: 2, y: 0 }, { x: 2, y: 2 }, { x: 4, y: 2 }],
      durationSeconds: 1,
      onPathPoint,
    });

    view.renderProgress(0.6);
    expect(onPathPoint).toHaveBeenCalledWith(1);
  });

  it('uses a compact owner-local path for reduced motion', () => {
    const { view } = createFixture({ index: 1 });
    view.playHitPath({
      points: [{ x: 2, y: 0 }, { x: 2, y: 10 }, { x: 2, y: 0 }],
      durationSeconds: 1,
      reducedMotion: true,
    });

    const midpoint = view.samplePath(0.5);
    expect(Math.hypot(midpoint.x - 2, midpoint.y)).toBeLessThan(0.7);
  });
});
