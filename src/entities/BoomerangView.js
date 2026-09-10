import * as THREE from 'three';

/**
 * Render-only player boomerang.
 * Logical hit counts come from ThrowController, never Three.js collision.
 */
export class BoomerangView {
  constructor({ index = 0 } = {}) {
    this.index = index;
    this.object3d = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.1, 8, 24, Math.PI * 1.4),
      new THREE.MeshStandardMaterial({ color: 0xffc04d }),
    );
    this.object3d.visible = false;
  }

  /** Configure/launch a deterministic successful target-chain path. */
  playHitPath({ points, durationSeconds, reducedMotion = false }) {
    void points;
    void durationSeconds;
    void reducedMotion;
    // TODO: interpolate through supplied points; do not calculate rewards here.
  }

  /** Configure/launch deterministic miss curve beside target formation. */
  playMissPath({ points, durationSeconds, reducedMotion = false }) {
    void points;
    void durationSeconds;
    void reducedMotion;
    // TODO: animate visual miss and return.
  }

  /** Advance current visual path/spin. */
  update(deltaSeconds) {
    void deltaSeconds;
    // TODO: visual interpolation.
  }

  /** Reset boomerang to hidden owner position. */
  reset() {
    this.object3d.visible = false;
  }

  /** Dispose owned GPU resources. */
  dispose() {
    this.object3d.geometry.dispose();
    this.object3d.material.dispose();
  }
}
