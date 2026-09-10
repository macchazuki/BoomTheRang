import { describe, expect, it } from 'vitest';
import { TargetDummyView } from './TargetDummyView.js';

describe('TargetDummyView', () => {
  it('does not recoil on MISS', () => {
    const view = new TargetDummyView();

    view.playReaction('MISS');
    view.update(0.1);

    expect(view.object3d.rotation.z).toBe(0);
    expect(view.object3d.scale.x).toBe(1);
    expect(view.reactionRemaining).toBe(0);
  });

  it('makes CRITICAL feedback stronger than HIT feedback', () => {
    const hitView = new TargetDummyView({ index: 0 });
    const criticalView = new TargetDummyView({ index: 0 });

    hitView.playReaction('HIT');
    criticalView.playReaction('CRITICAL');
    hitView.update(0.1);
    criticalView.update(0.1);

    expect(Math.abs(criticalView.object3d.rotation.z)).toBeGreaterThan(
      Math.abs(hitView.object3d.rotation.z),
    );
    expect(criticalView.torso.material.emissiveIntensity).toBeGreaterThan(
      hitView.torso.material.emissiveIntensity,
    );
  });

  it('reduces recoil amplitude when reduced motion is enabled', () => {
    const normalView = new TargetDummyView({ index: 0 });
    const reducedView = new TargetDummyView({ index: 0 });

    normalView.playReaction('CRITICAL');
    reducedView.playReaction('CRITICAL', { reducedMotion: true });
    normalView.update(0.07);
    reducedView.update(0.07);

    expect(Math.abs(reducedView.object3d.rotation.z)).toBeLessThan(
      Math.abs(normalView.object3d.rotation.z),
    );
  });
});
