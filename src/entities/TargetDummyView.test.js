import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { TargetDummyView } from './TargetDummyView.js';

const pendingLoader = () => ({ loadAsync: vi.fn(() => new Promise(() => {})) });

describe('TargetDummyView', () => {
  it('loads the authored 2D target sprite', async () => {
    const texture = new THREE.Texture();
    texture.image = { width: 200, height: 400 };
    const loader = { loadAsync: vi.fn().mockResolvedValue(texture) };
    const view = new TargetDummyView({ spriteUrl: '/target.png', loader });

    await view.spriteReady;

    expect(loader.loadAsync).toHaveBeenCalledWith('/target.png');
    expect(view.sprite).toBeInstanceOf(THREE.Sprite);
    expect(view.sprite.scale.y).toBeCloseTo(3.7);
    expect(view.sprite.scale.x).toBeCloseTo(1.85);

    view.dispose();
  });

  it('does not recoil on MISS', () => {
    const view = new TargetDummyView({ loader: pendingLoader() });

    view.playReaction('MISS');
    view.update(0.1);

    expect(view.object3d.rotation.z).toBe(0);
    expect(view.object3d.scale.x).toBe(1);
    expect(view.reactionRemaining).toBe(0);
  });

  it('makes CRITICAL feedback stronger than HIT feedback', () => {
    const hitView = new TargetDummyView({ index: 0, loader: pendingLoader() });
    const criticalView = new TargetDummyView({ index: 0, loader: pendingLoader() });

    hitView.playReaction('HIT');
    criticalView.playReaction('CRITICAL');
    hitView.update(0.1);
    criticalView.update(0.1);

    expect(Math.abs(criticalView.object3d.rotation.z)).toBeGreaterThan(
      Math.abs(hitView.object3d.rotation.z),
    );

    hitView.dispose();
    criticalView.dispose();
  });

  it('reduces recoil amplitude when reduced motion is enabled', () => {
    const normalView = new TargetDummyView({ index: 0, loader: pendingLoader() });
    const reducedView = new TargetDummyView({ index: 0, loader: pendingLoader() });

    normalView.playReaction('CRITICAL');
    reducedView.playReaction('CRITICAL', { reducedMotion: true });
    normalView.update(0.07);
    reducedView.update(0.07);

    expect(Math.abs(reducedView.object3d.rotation.z)).toBeLessThan(
      Math.abs(normalView.object3d.rotation.z),
    );

    normalView.dispose();
    reducedView.dispose();
  });
});
