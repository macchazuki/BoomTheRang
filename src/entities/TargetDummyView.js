import * as THREE from 'three';

/** Render-only target dummy. */
export class TargetDummyView {
  constructor({ index = 0 } = {}) {
    this.index = index;
    this.object3d = new THREE.Group();

    this.torso = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.4, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xc78b52, emissive: 0x000000 }),
    );
    this.object3d.add(this.torso);

    this.reactionDuration = 0.24;
    this.reactionRemaining = 0;
    this.reactionResult = null;
    this.reactionReducedMotion = false;
  }

  /** Apply scene-space formation position. */
  setPosition([x, y, z]) {
    this.object3d.position.set(x, y, z);
  }

  /** Visual reaction only; result has already been resolved. MISS never recoils. */
  playReaction(result, { reducedMotion = false } = {}) {
    if (result === 'MISS') return;

    this.reactionResult = result;
    this.reactionReducedMotion = reducedMotion;
    this.reactionDuration = reducedMotion ? 0.14 : result === 'CRITICAL' ? 0.34 : 0.24;
    this.reactionRemaining = this.reactionDuration;
  }

  /** Advance visual-only recoil/impact flash. */
  update(deltaSeconds) {
    if (this.reactionRemaining <= 0) return;

    this.reactionRemaining = Math.max(0, this.reactionRemaining - deltaSeconds);
    const progress = 1 - this.reactionRemaining / this.reactionDuration;
    const pulse = Math.sin(progress * Math.PI);
    const resultStrength = this.reactionResult === 'CRITICAL' ? 1 : 0.5;
    const motionScale = this.reactionReducedMotion ? 0.25 : 1;
    const direction = this.index % 2 === 0 ? 1 : -1;

    this.object3d.rotation.z = direction * 0.18 * resultStrength * pulse * motionScale;
    const scalePulse = 1 + 0.1 * resultStrength * pulse * motionScale;
    this.object3d.scale.setScalar(scalePulse);
    this.torso.material.emissive.setHex(this.reactionResult === 'CRITICAL' ? 0xffd15c : 0x6b3d12);
    this.torso.material.emissiveIntensity = pulse * (this.reactionResult === 'CRITICAL' ? 1.2 : 0.45);

    if (this.reactionRemaining === 0) {
      this.object3d.rotation.z = 0;
      this.object3d.scale.setScalar(1);
      this.torso.material.emissive.setHex(0x000000);
      this.torso.material.emissiveIntensity = 1;
      this.reactionResult = null;
      this.reactionReducedMotion = false;
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
