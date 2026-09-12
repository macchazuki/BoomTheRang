import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { TargetDummyView } from './TargetDummyView.js';

const pendingLoader = () => ({ loadAsync: vi.fn(() => new Promise(() => {})) });

describe('TargetDummyView', () => {
  it('loads frame 1 of the four-frame sprite sheet as idle', async () => {
    const texture = new THREE.Texture();
    texture.image = { width: 800, height: 400 };
    const loader = { loadAsync: vi.fn().mockResolvedValue(texture) };
    const view = new TargetDummyView({ spriteUrl: '/target.png', loader });

    await view.spriteReady;

    expect(loader.loadAsync).toHaveBeenCalledWith('/target.png');
    expect(view.sprite).toBeInstanceOf(THREE.Sprite);
    expect(view.currentFrame).toBe(0);
    expect(texture.offset.x).toBeCloseTo(0.5 / 800);
    expect(texture.repeat.x).toBeCloseTo(199 / 800);
    expect(view.sprite.scale.y).toBeCloseTo(3.7);
    expect(view.sprite.scale.x).toBeCloseTo(1.85);

    view.dispose();
  });

  it('plays frames 2, 3 and 4 on hit before returning to frame 1', async () => {
    const texture = new THREE.Texture();
    texture.image = { width: 800, height: 400 };
    const loader = { loadAsync: vi.fn().mockResolvedValue(texture) };
    const view = new TargetDummyView({ loader });
    await view.spriteReady;

    view.playReaction('HIT');
    expect(view.currentFrame).toBe(1);

    view.update(0.09);
    expect(view.currentFrame).toBe(2);

    view.update(0.08);
    expect(view.currentFrame).toBe(3);

    view.update(0.08);
    expect(view.currentFrame).toBe(0);

    view.dispose();
  });

  it('does not animate on MISS', () => {
    const view = new TargetDummyView({ loader: pendingLoader() });

    view.playReaction('MISS');
    view.update(0.1);

    expect(view.currentFrame).toBe(0);
    expect(view.reactionRemaining).toBe(0);
  });

  it('keeps a longer hit animation for CRITICAL than HIT', () => {
    const hitView = new TargetDummyView({ loader: pendingLoader() });
    const criticalView = new TargetDummyView({ loader: pendingLoader() });

    hitView.playReaction('HIT');
    criticalView.playReaction('CRITICAL');

    expect(criticalView.reactionDuration).toBeGreaterThan(hitView.reactionDuration);

    hitView.dispose();
    criticalView.dispose();
  });

  it('shortens the animation when reduced motion is enabled', () => {
    const normalView = new TargetDummyView({ loader: pendingLoader() });
    const reducedView = new TargetDummyView({ loader: pendingLoader() });

    normalView.playReaction('HIT');
    reducedView.playReaction('HIT', { reducedMotion: true });

    expect(reducedView.reactionDuration).toBeLessThan(normalView.reactionDuration);

    normalView.dispose();
    reducedView.dispose();
  });
});
