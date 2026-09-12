import * as THREE from 'three';

const DEFAULT_SPRITE_URL = new URL('../assets/sprites/target_dummy.png', import.meta.url).href;
const SPRITE_HEIGHT = 3.7;

/** Render-only 2D target dummy. */
export class TargetDummyView {
  constructor({ index = 0, spriteUrl = DEFAULT_SPRITE_URL, loader = new THREE.TextureLoader() } = {}) {
    this.index = index;
    this.object3d = new THREE.Group();

    this.body = new THREE.Group();
    this.object3d.add(this.body);

    this.spriteUrl = spriteUrl;
    this.loader = loader;
    this.texture = null;
    this.material = null;
    this.sprite = null;
    this.disposed = false;

    this.reactionDuration = 0.24;
    this.reactionRemaining = 0;
    this.reactionResult = null;
    this.reactionReducedMotion = false;

    this.spriteReady = this.loadSprite();
    this.modelReady = this.spriteReady;
  }

  /** Load the authored target sprite. Nothing renders until it is ready. */
  async loadSprite() {
    try {
      const texture = await this.loader.loadAsync(this.spriteUrl);
      if (this.disposed) {
        texture.dispose?.();
        return null;
      }

      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      const sourceWidth = texture.image?.width || texture.source?.data?.width || 1;
      const sourceHeight = texture.image?.height || texture.source?.data?.height || 1;
      sprite.scale.set(SPRITE_HEIGHT * (sourceWidth / sourceHeight), SPRITE_HEIGHT, 1);
      sprite.renderOrder = 8;

      this.texture = texture;
      this.material = material;
      this.sprite = sprite;
      this.body.add(sprite);
      return sprite;
    } catch (error) {
      console.error('Failed to load target dummy sprite', error);
      return null;
    }
  }

  setPosition([x, y, z]) {
    this.object3d.position.set(x, y, z);
  }

  playReaction(result, { reducedMotion = false } = {}) {
    if (result === 'MISS') return;

    this.reactionResult = result;
    this.reactionReducedMotion = reducedMotion;
    this.reactionDuration = reducedMotion ? 0.14 : result === 'CRITICAL' ? 0.34 : 0.24;
    this.reactionRemaining = this.reactionDuration;
  }

  /** Advance a flat recoil plus warm impact flash. */
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

    if (this.material) {
      const warmth = pulse * resultStrength;
      this.material.color.setRGB(1, 1 - 0.12 * warmth, 1 - 0.35 * warmth);
    }

    if (this.reactionRemaining === 0) {
      this.object3d.rotation.z = 0;
      this.object3d.scale.setScalar(1);
      this.material?.color.setRGB(1, 1, 1);
      this.reactionResult = null;
      this.reactionReducedMotion = false;
    }
  }

  dispose() {
    this.disposed = true;
    this.material?.dispose?.();
    this.texture?.dispose?.();
    this.object3d.clear();
    this.sprite = null;
    this.material = null;
    this.texture = null;
  }
}
