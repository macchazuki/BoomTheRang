import * as THREE from 'three';

/**
 * Render-only player avatar.
 * Replace primitive geometry with final low-cost art without moving gameplay state into this class.
 */
export class PlayerView {
  constructor() {
    this.object3d = new THREE.Group();

    // Placeholder mesh establishes scene ownership only.
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.6, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xf0a060 }),
    );
    this.object3d.add(body);
    this.object3d.position.set(0, -5.5, 0);
  }

  /** Visual-only frame update for idle/throw animation. */
  update(deltaSeconds) {
    void deltaSeconds;
    // TODO: implement lightweight procedural or keyframed animation.
  }

  /** Visual hook called when a manual throw begins. */
  playThrow() {
    // TODO: animate pose only.
  }

  /** Dispose owned geometries/materials. */
  dispose() {
    this.object3d.traverse((node) => {
      node.geometry?.dispose?.();
      node.material?.dispose?.();
    });
  }
}
