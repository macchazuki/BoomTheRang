import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BoomerangView } from './BoomerangView.js';

const pendingLoader = () => ({ loadAsync: vi.fn(() => new Promise(() => {})) });

describe('BoomerangView', () => {
  it('loads the authored 2D boomerang sprite', async () => {
    const texture = new THREE.Texture();
    texture.image = { width: 300, height: 150 };
    const loader = { loadAsync: vi.fn().mockResolvedValue(texture) };
    const view = new BoomerangView({ spriteUrl: '/boomerang.png', loader });

    await view.spriteReady;

    expect(loader.loadAsync).toHaveBeenCalledWith('/boomerang.png');
    expect(view.object3d).toBeInstanceOf(THREE.Sprite);
    expect(view.object3d.scale.x).toBeCloseTo(1.8);
    expect(view.object3d.scale.y).toBeCloseTo(0.9);
    expect(view.material.map).toBe(texture);

    view.dispose();
  });

  it('interpolates a deterministic path and resets after returning', () => {
    const view = new BoomerangView({ loader: pendingLoader() });
    const owner = new THREE.Vector3(0, 0, 0);

    view.playHitPath({
      points: [owner, new THREE.Vector3(0, 2, 0), new THREE.Vector3(2, 2, 0), owner],
      durationSeconds: 1,
    });

    view.update(0.25);
    expect(view.object3d.visible).toBe(true);
    expect(view.object3d.position.distanceTo(owner)).toBeGreaterThan(0);

    view.update(0.75);
    expect(view.object3d.visible).toBe(false);
    expect(view.pathPoints).toBeNull();
  });

  it('uses a compact owner-local path when reduced motion is enabled', () => {
    const view = new BoomerangView({ index: 1, loader: pendingLoader() });
    const owner = new THREE.Vector3(0, 0, 0);

    view.playHitPath({
      points: [owner, new THREE.Vector3(0, 10, 0), owner],
      durationSeconds: 1,
      reducedMotion: true,
    });
    view.update(0.5);

    expect(view.object3d.position.distanceTo(owner)).toBeLessThan(0.7);
  });

  it('honors a deterministic launch delay', () => {
    const view = new BoomerangView({ loader: pendingLoader() });
    const owner = new THREE.Vector3(0, 0, 0);

    view.playMissPath({
      points: [owner, new THREE.Vector3(2, 2, 0), owner],
      durationSeconds: 1,
      delaySeconds: 0.2,
    });

    view.update(0.1);
    expect(view.object3d.visible).toBe(false);
    view.update(0.1);
    expect(view.object3d.visible).toBe(true);
  });
});
