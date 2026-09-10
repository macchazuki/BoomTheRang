import * as THREE from 'three';

/**
 * Render-only player avatar.
 * Replace primitive geometry with final low-cost art without moving gameplay state into this class.
 */
export class PlayerView {
  constructor() {
    this.object3d = new THREE.Group();

    this.body = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.6, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xf0a060 }),
    );
    this.object3d.add(this.body);
    this.object3d.position.set(0, -5.5, 0);

    this.throwAnimationDuration = 0.32;
    this.throwAnimationRemaining = 0;
    this.throwReducedMotion = false;
  }

  /** Visual-only frame update for the active throw pose. */
  update(deltaSeconds) {
    if (this.throwAnimationRemaining <= 0) return;

    this.throwAnimationRemaining = Math.max(0, this.throwAnimationRemaining - deltaSeconds);
    const progress = 1 - this.throwAnimationRemaining / this.throwAnimationDuration;
    const pulse = Math.sin(progress * Math.PI);
    const motionScale = this.throwReducedMotion ? 0.3 : 1;

    this.body.rotation.z = -0.22 * pulse * motionScale;
    this.body.rotation.x = 0.12 * pulse * motionScale;
    this.object3d.scale.set(
      1 + 0.05 * pulse * motionScale,
      1 - 0.03 * pulse * motionScale,
      1,
    );

    if (this.throwAnimationRemaining === 0) {
      this.body.rotation.set(0, 0, 0);
      this.object3d.scale.setScalar(1);
      this.throwReducedMotion = false;
    }
  }

  /** Visual hook called when a manual throw begins. */
  playThrow({ reducedMotion = false } = {}) {
    this.throwReducedMotion = reducedMotion;
    this.throwAnimationDuration = reducedMotion ? 0.18 : 0.32;
    this.throwAnimationRemaining = this.throwAnimationDuration;
  }

  /** Dispose owned geometries/materials. */
  dispose() {
    this.object3d.traverse((node) => {
      node.geometry?.dispose?.();
      node.material?.dispose?.();
    });
  }
}
