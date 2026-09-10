import * as THREE from 'three';

/** Render-only dog companion shown beside the player after unlock. */
export class DogView {
  constructor() {
    this.object3d = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x9a673c }),
    );
    this.object3d.add(body);
    this.object3d.position.set(1.8, -5.7, 0);
  }

  /** Visual hook for automatic fetch/throw animation. */
  playThrow({ critical = false } = {}) {
    void critical;
    // TODO: distinct small critical flourish for GOOD BOY!.
  }

  /** Visual-only frame update. */
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
