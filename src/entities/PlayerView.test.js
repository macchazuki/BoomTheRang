import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { PlayerView } from './PlayerView.js';

const pendingLoader = () => ({ loadAsync: vi.fn(() => new Promise(() => {})) });

describe('PlayerView', () => {
  it('loads the four-frame hero sprite sheet without stretching it', async () => {
    const texture = new THREE.Texture();
    const loader = { loadAsync: vi.fn().mockResolvedValue(texture) };
    const view = new PlayerView({
      spriteUrl: '/hero.png',
      loader,
      environmentLoader: pendingLoader(),
    });

    await view.spriteReady;

    expect(loader.loadAsync).toHaveBeenCalledWith('/hero.png');
    expect(view.sprite).toBeInstanceOf(THREE.Sprite);
    expect(view.body.children).toContain(view.sprite);
    expect(texture.offset.x).toBeCloseTo(0.5 / 2172);
    expect(texture.repeat.x).toBeCloseTo(542 / 2172);
    expect(view.sprite.scale.x).toBeCloseTo(3.2 * (543 / 724));
    expect(view.sprite.scale.y).toBeCloseTo(3.2);
    expect(view.currentFrame).toBe(0);

    view.dispose();
  });

  it('loads the environment as a full-height 2D backdrop', async () => {
    const environmentTexture = new THREE.Texture();
    const environmentLoader = { loadAsync: vi.fn().mockResolvedValue(environmentTexture) };
    const view = new PlayerView({
      loader: pendingLoader(),
      environmentUrl: '/environment.png',
      environmentLoader,
    });

    await view.environmentReady;

    expect(environmentLoader.loadAsync).toHaveBeenCalledWith('/environment.png');
    expect(view.environmentSprite).toBeInstanceOf(THREE.Sprite);
    expect(view.environmentSprite.scale.y).toBe(18);
    expect(view.environmentSprite.position.y).toBe(5.5);
    expect(view.environmentSprite.position.z).toBeLessThan(0);

    view.dispose();
  });

  it('renders no hero if the sprite sheet cannot be loaded', async () => {
    const loader = { loadAsync: vi.fn().mockRejectedValue(new Error('missing asset')) };
    const view = new PlayerView({ loader, environmentLoader: pendingLoader() });

    await view.spriteReady;

    expect(view.sprite).toBeNull();
    expect(view.body.children).toHaveLength(0);

    view.dispose();
  });

  it('uses the wider throw crop and separated follow-through crop', async () => {
    const texture = new THREE.Texture();
    const loader = { loadAsync: vi.fn().mockResolvedValue(texture) };
    const view = new PlayerView({ loader, environmentLoader: pendingLoader() });
    await view.spriteReady;

    view.playThrow();
    expect(view.currentFrame).toBe(1);
    expect(texture.offset.x).toBeCloseTo(543.5 / 2172);
    expect(texture.repeat.x).toBeCloseTo(542 / 2172);

    view.update(0.12);
    expect(view.currentFrame).toBe(2);
    expect(texture.offset.x).toBeCloseTo(1086.5 / 2172);
    expect(texture.repeat.x).toBeCloseTo(554 / 2172);

    view.update(0.11);
    expect(view.currentFrame).toBe(3);
    expect(texture.offset.x).toBeCloseTo(1642.5 / 2172);
    expect(texture.repeat.x).toBeCloseTo(529 / 2172);
    expect(view.sprite.position.x).toBeCloseTo(-0.035);

    view.update(0.1);
    expect(view.currentFrame).toBe(0);
    expect(view.sprite.position.x).toBe(0);

    view.dispose();
  });
});
