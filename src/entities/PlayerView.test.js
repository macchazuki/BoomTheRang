import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { PlayerView } from './PlayerView.js';

describe('PlayerView', () => {
  it('replaces the fallback with the GLB character and hides its decorative boomerang', async () => {
    const model = new THREE.Group();
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
    const decorativeBoomerang = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
    decorativeBoomerang.name = 'Boomerang';
    model.add(bodyMesh, decorativeBoomerang);

    const loader = {
      loadAsync: vi.fn().mockResolvedValue({ scene: model }),
    };
    const view = new PlayerView({ modelUrl: '/character.glb', loader });

    await view.modelReady;

    expect(loader.loadAsync).toHaveBeenCalledWith('/character.glb');
    expect(view.model).toBe(model);
    expect(view.fallback).toBeNull();
    expect(view.body.children).toContain(model);
    expect(model.scale.x).toBeCloseTo(0.8);
    expect(decorativeBoomerang.visible).toBe(false);

    view.dispose();
  });

  it('keeps the fallback if the GLB cannot be loaded', async () => {
    const loader = {
      loadAsync: vi.fn().mockRejectedValue(new Error('missing asset')),
    };
    const view = new PlayerView({ modelUrl: '/missing.glb', loader });

    await view.modelReady;

    expect(view.model).toBeNull();
    expect(view.fallback).not.toBeNull();
    expect(view.body.children).toContain(view.fallback);

    view.dispose();
  });

  it('keeps the existing throw animation hook', () => {
    const loader = { loadAsync: vi.fn(() => new Promise(() => {})) };
    const view = new PlayerView({ loader });

    view.playThrow();
    view.update(0.16);

    expect(view.body.rotation.z).not.toBe(0);
    expect(view.object3d.scale.x).toBeGreaterThan(1);

    view.update(0.16);
    expect(view.body.rotation.z).toBe(0);
    expect(view.object3d.scale.x).toBe(1);

    view.dispose();
  });
});
