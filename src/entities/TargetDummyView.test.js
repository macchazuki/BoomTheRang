import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { TargetDummyView } from './TargetDummyView.js';

const pendingLoader = () => ({ loadAsync: vi.fn(() => new Promise(() => {})) });

describe('TargetDummyView', () => {
  it('does not recoil on MISS', () => {
    const view = new TargetDummyView({ loader: pendingLoader() });

    view.playReaction('MISS');
    view.update(0.1);

    expect(view.object3d.rotation.z).toBe(0);
    expect(view.object3d.scale.x).toBe(1);
    expect(view.reactionRemaining).toBe(0);
  });

  it('makes CRITICAL feedback stronger than HIT feedback', async () => {
    const createLoadedView = async () => {
      const material = new THREE.MeshStandardMaterial();
      const model = new THREE.Group();
      model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
      const loader = { loadAsync: vi.fn().mockResolvedValue({ scene: model }) };
      const view = new TargetDummyView({ index: 0, loader });
      await view.modelReady;
      return { view, material };
    };

    const { view: hitView, material: hitMaterial } = await createLoadedView();
    const { view: criticalView, material: criticalMaterial } = await createLoadedView();

    hitView.playReaction('HIT');
    criticalView.playReaction('CRITICAL');
    hitView.update(0.1);
    criticalView.update(0.1);

    expect(Math.abs(criticalView.object3d.rotation.z)).toBeGreaterThan(
      Math.abs(hitView.object3d.rotation.z),
    );
    expect(criticalMaterial.emissiveIntensity).toBeGreaterThan(
      hitMaterial.emissiveIntensity,
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
