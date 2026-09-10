import * as THREE from 'three';

/** Render-only dog companion shown beside the player after unlock. */
export class DogView {
  constructor() {
    this.object3d = new THREE.Group();

    this.body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x9a673c }),
    );
    this.object3d.add(this.body);

    this.baseY = -5.7;
    this.object3d.position.set(1.8, this.baseY, 0);

    this.throwAnimationDuration = 0.35;
    this.throwAnimationRemaining = 0;
    this.throwWasCritical = false;
  }

  /** Trigger a small procedural hop/pulse so an automatic throw is visible. */
  playThrow({ critical = false } = {}) {
    this.throwAnimationRemaining = this.throwAnimationDuration;
    this.throwWasCritical = critical;
  }

  /** Visual-only frame update. */
  update(deltaSeconds) {
    if (this.throwAnimationRemaining <= 0) return;

    this.throwAnimationRemaining = Math.max(0, this.throwAnimationRemaining - deltaSeconds);
    const progress = 1 - this.throwAnimationRemaining / this.throwAnimationDuration;
    const pulse = Math.sin(progress * Math.PI);

    this.object3d.position.y = this.baseY + pulse * 0.3;
    const scale = 1 + pulse * (this.throwWasCritical ? 0.18 : 0.08);
    this.object3d.scale.setScalar(scale);

    if (this.throwAnimationRemaining === 0) {
      this.object3d.position.y = this.baseY;
      this.object3d.scale.setScalar(1);
      this.throwWasCritical = false;
    }
  }

  /** Dispose owned GPU resources. */
  dispose() {
    this.object3d.traverse((node) => {
      node.geometry?.dispose?.();
      node.material?.dispose?.();
    });
  }
}
