import * as THREE from 'three';

const DEFAULT_SPRITE_URL = new URL('../assets/sprites/hero.png', import.meta.url).href;
const FRAME_COUNT = 4;
const IDLE_FRAME = 0;
const WIND_UP_FRAME = 1;
const THROW_FRAME = 2;
const FOLLOW_THROUGH_FRAME = 3;

/**
 * Render-only player avatar.
 * Owns visual loading/animation only; gameplay results stay outside this class.
 */
export class PlayerView {
  constructor({ spriteUrl = DEFAULT_SPRITE_URL, loader = new THREE.TextureLoader() } = {}) {
    this.object3d = new THREE.Group();
    this.object3d.position.set(0, -5.5, 0);

    this.body = new THREE.Group();
    this.object3d.add(this.body);

    this.spriteUrl = spriteUrl;
    this.loader = loader;
    this.texture = null;
    this.material = null;
    this.sprite = null;
    this.disposed = false;
    this.currentFrame = IDLE_FRAME;

    this.throwAnimationDuration = 0.32;
    this.throwAnimationRemaining = 0;

    this.spriteReady = this.loadSprite();
    // Keep the old readiness property available for callers/tests that may still await it.
    this.modelReady = this.spriteReady;
  }

  /** Load the authored four-frame sprite sheet. Nothing renders until it is ready. */
  async loadSprite() {
    try {
      const texture = await this.loader.loadAsync(this.spriteUrl);
      if (this.disposed) {
        texture.dispose?.();
        return null;
      }

      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1 / FRAME_COUNT, 1);
      texture.offset.set(0, 0);
      texture.needsUpdate = true;

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(3.2, 3.2, 1);

      this.texture = texture;
      this.material = material;
      this.sprite = sprite;
      this.body.add(sprite);
      this.setFrame(IDLE_FRAME);
      return sprite;
    } catch (error) {
      console.error('Failed to load player sprite sheet', error);
      return null;
    }
  }

  /** Select one of the four evenly spaced horizontal frames. */
  setFrame(frameIndex) {
    this.currentFrame = THREE.MathUtils.clamp(frameIndex, 0, FRAME_COUNT - 1);
    if (!this.texture) return;

    this.texture.offset.x = this.currentFrame / FRAME_COUNT;
  }

  /** Visual-only frame update for the active throw animation. */
  update(deltaSeconds) {
    if (this.throwAnimationRemaining <= 0) return;

    this.throwAnimationRemaining = Math.max(0, this.throwAnimationRemaining - deltaSeconds);

    if (this.throwAnimationRemaining === 0) {
      this.setFrame(IDLE_FRAME);
      return;
    }

    const progress = 1 - this.throwAnimationRemaining / this.throwAnimationDuration;
    if (progress < 1 / 3) {
      this.setFrame(WIND_UP_FRAME);
    } else if (progress < 2 / 3) {
      this.setFrame(THROW_FRAME);
    } else {
      this.setFrame(FOLLOW_THROUGH_FRAME);
    }
  }

  /** Visual hook called when a manual throw begins. */
  playThrow({ reducedMotion = false } = {}) {
    this.throwAnimationDuration = reducedMotion ? 0.18 : 0.32;
    this.throwAnimationRemaining = this.throwAnimationDuration;
    this.setFrame(WIND_UP_FRAME);
  }

  /** Dispose owned GPU resources. */
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
