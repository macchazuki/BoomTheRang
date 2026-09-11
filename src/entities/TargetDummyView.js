import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEFAULT_MODEL_URL = new URL(
  '../assets/models/BoomTheRang_TargetDummy.glb',
  import.meta.url,
).href;

/** Render-only target dummy. */
export class TargetDummyView {
  constructor({ index = 0, modelUrl = DEFAULT_MODEL_URL, loader = new GLTFLoader() } = {}) {
    this.index = index;
    this.object3d = new THREE.Group();

    this.body = new THREE.Group();
    this.object3d.add(this.body);

    this.torso = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.4, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xc78b52, emissive: 0x000000 }),
    );
    this.body.add(this.torso);

    this.modelUrl = modelUrl;
    this.loader = loader;
    this.model = null;
    this.disposed = false;
    this.reactionMaterials = [this.torso.material];

    this.reactionDuration = 0.24;
    this.reactionRemaining = 0;
    this.reactionResult = null;
    this.reactionReducedMotion = false;

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
      model.scale.setScalar(0.9);
      model.position.set(0, -0.7, 0);

      const materials = [];
      model.traverse((node) => {
        const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
        nodeMaterials.filter(Boolean).forEach((material) => {
          if ('emissive' in material) materials.push(material);
        });
      });

      this.body.remove(this.torso);
      this.disposeObject(this.torso);

      this.model = model;
      this.body.add(model);
      this.reactionMaterials = materials;
      return model;
    } catch (error) {
      console.error('Failed to load target dummy model', error);
      // Keep the cheap fallback visible if the asset cannot be loaded.
      return null;
    }
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

    const emissiveColor = this.reactionResult === 'CRITICAL' ? 0xffd15c : 0x6b3d12;
    const emissiveIntensity = pulse * (this.reactionResult === 'CRITICAL' ? 1.2 : 0.45);
    this.reactionMaterials.forEach((material) => {
      material.emissive?.setHex(emissiveColor);
      material.emissiveIntensity = emissiveIntensity;
    });

    if (this.reactionRemaining === 0) {
      this.object3d.rotation.z = 0;
      this.object3d.scale.setScalar(1);
      this.reactionMaterials.forEach((material) => {
        material.emissive?.setHex(0x000000);
        material.emissiveIntensity = 1;
      });
      this.reactionResult = null;
      this.reactionReducedMotion = false;
    }
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

  /** Dispose owned GPU resources. */
  dispose() {
    this.disposed = true;
    this.disposeObject(this.object3d);
    this.object3d.clear();
  }
}
