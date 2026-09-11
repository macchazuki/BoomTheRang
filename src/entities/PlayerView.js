import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEFAULT_MODEL_URL = new URL(
  '../assets/models/BoomTheRang_ChibiBoy.glb',
  import.meta.url,
).href;

/**
 * Render-only player avatar.
 * Owns visual loading/animation only; gameplay results stay outside this class.
 */
export class PlayerView {
  constructor({ modelUrl = DEFAULT_MODEL_URL, loader = new GLTFLoader() } = {}) {
    this.object3d = new THREE.Group();
    this.object3d.position.set(0, -5.5, 0);

    // Keep animation on a stable center pivot while the GLB loads asynchronously.
    this.body = new THREE.Group();
    this.object3d.add(this.body);

    this.fallback = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.6, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xf0a060 }),
    );
    this.body.add(this.fallback);

    this.modelUrl = modelUrl;
    this.loader = loader;
    this.model = null;
    this.disposed = false;

    this.throwAnimationDuration = 0.32;
    this.throwAnimationRemaining = 0;
    this.throwReducedMotion = false;

    this.modelReady = this.loadModel();
  }

  /** Load the authored GLB and replace the temporary primitive once ready. */
  async loadModel() {
    try {
      const gltf = await this.loader.loadAsync(this.modelUrl);
      if (this.disposed) {
        this.disposeObject(gltf.scene);
        return null;
      }

      const model = gltf.scene;
      model.scale.setScalar(0.8);
      model.position.set(0, -0.84, 0);

      // Gameplay uses BoomerangView for the actual projectile, so do not keep
      // the decorative boomerang from the character file visible in-hand.
      model.traverse((node) => {
        if (node.name === 'Boomerang') node.visible = false;
      });

      this.body.remove(this.fallback);
      this.disposeObject(this.fallback);
      this.fallback = null;

      this.model = model;
      this.body.add(model);
      return model;
    } catch {
      // Keep the cheap fallback visible if the asset cannot be loaded.
      return null;
    }
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

  disposeObject(object) {
    object?.traverse?.((node) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => material?.dispose?.());
      } else {
        node.material?.dispose?.();
      }
    });
  }

  /** Dispose owned geometries/materials. */
  dispose() {
    this.disposed = true;
    this.disposeObject(this.object3d);
    this.object3d.clear();
  }
}
