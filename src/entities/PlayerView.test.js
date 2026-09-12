import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { PlayerView } from './PlayerView.js';

describe('PlayerView', () => {
  it('loads the four-frame hero sprite sheet', async () => {
    const texture = new THREE.Texture();
    const loader = {
      loadAsync: vi.fn().mockResolvedValue(texture),
    };
    const view = new PlayerView({ spriteUrl: '/hero.png', loader });

    await view.spriteReady;

    expect(loader.loadAsync).toHaveBeenCalledWith('/hero.png');
    expect(view.sprite).toBeInstanceOf(THREE.Sprite);
    expect(view.body.children).toContain(view.sprite);
    expect(texture.repeat.x).toBeCloseTo(0.25);
    expect(texture.offset.x).toBe(0);
    expect(view.currentFrame).toBe(0);

    view.dispose();
  });

  it('renders nothing if the sprite sheet cannot be loaded', async () => {
    const loader = {
      loadAsync: vi.fn().mockRejectedValue(new Error('missing asset')),
    };
    const view = new PlayerView({ spriteUrl: '/missing.png', loader });

    await view.spriteReady;

    expect(view.sprite).toBeNull();
    expect(view.body.children).toHaveLength(0);

    view.dispose();
  });

  it('animates wind up, throw, follow through, then returns to idle', async () => {
    const texture = new THREE.Texture();
    const loader = {
      loadAsync: vi.fn().mockResolvedValue(texture),
    };
    const view = new PlayerView({ loader });
    await view.spriteReady;

    view.playThrow();
    expect(view.currentFrame).toBe(1);
    expect(texture.offset.x).toBeCloseTo(0.25);

    view.update(0.12);
    expect(view.currentFrame).toBe(2);
    expect(texture.offset.x).toBeCloseTo(0.5);

    view.update(0.11);
    expect(view.currentFrame).toBe(3);
    expect(texture.offset.x).toBeCloseTo(0.75);

    view.update(0.09);
    expect(view.currentFrame).toBe(0);
    expect(texture.offset.x).toBe(0);

    view.dispose();
  });
});
