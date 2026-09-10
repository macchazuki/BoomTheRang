import * as THREE from 'three';

/** Render-only target dummy. */
export class TargetDummyView {
  constructor({ index = 0 } = {}) {
    this.index = index;
    this.object3d = new THREE.Group();

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.4, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xc78b52 }),
    );
    this.object3d.add(torso);
  }

  /** Apply scene-space formation position. */
  setPosition([x, y, z]) {
    this.object3d.position.set(x, y, z);
  }

  /** Visual reaction only; result has already been resolved. */
  playReaction(result) {
    void result;
    // TODO: recoil/impact/critical flash. MISS must not recoil.
  }

  /** Advance visual-only recoil/idle animation. */
  update(deltaSeconds) {
    void deltaSeconds;
  }

  /** Dispose owned GPU resources. */
  dispose() {
    this.object3d.traverse((node) => {
      node.geometry?.dispose?.();
      node.material?.dispose?.();
    });
  }
}
