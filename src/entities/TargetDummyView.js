import * as THREE from 'three';

const DEFAULT_SPRITE_URL = new URL('../assets/sprites/target_dummy.png', import.meta.url).href;
const SPRITE_HEIGHT = 3.7;
const FRAME_COUNT = 4;
const IDLE_FRAME = 0;
const HIT_FRAME_1 = 1;
const HIT_FRAME_2 = 2;
const RECOVERY_FRAME = 3;

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
    this.currentFrame = IDLE_FRAME;

    this.reactionDuration = 0.24;
    this.reactionRemaining = 0;
    this.reactionResult = null;
    this.reactionReducedMotion = false;

    this.spriteReady = this.loadSprite();
  }

  /** Load the authored four-frame horizontal target sprite sheet. */
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
      sprite.renderOrder = 8;

      this.texture = texture;
      this.material = material;
      this.sprite = sprite;
      this.body.add(sprite);
      this.setFrame(IDLE_FRAME);
      return sprite;
    } catch (error) {
      console.error('Failed to load target dummy sprite', error);
      return null;
    }
  }

  /** Select one of the four equal-width frames. Frame 1 is idle. */
  setFrame(frameIndex) {
    this.currentFrame = THREE.MathUtils.clamp(frameIndex, 0, FRAME_COUNT - 1);
    if (!this.texture || !this.sprite) return;

    const sourceWidth = this.texture.image?.width || this.texture.source?.data?.width || FRAME_COUNT;
    const sourceHeight = this.texture.image?.height || this.texture.source?.data?.height || 1;
    const frameWidth = sourceWidth / FRAME_COUNT;
    const inset = 0.5;

    this.texture.offset.x = (this.currentFrame * frameWidth + inset) / sourceWidth;
    this.texture.repeat.x = (frameWidth - inset * 2) / sourceWidth;
    this.texture.offset.y = 0;
    this.texture.repeat.y = 1;

    this.sprite.scale.set(SPRITE_HEIGHT * (frameWidth / sourceHeight), SPRITE_HEIGHT, 1);
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
    this.setFrame(HIT_FRAME_1);
  }

  /** Advance authored hit frames 2-4, then return to frame 1 idle. */
  update(deltaSeconds) {
    if (this.reactionRemaining <= 0) return;

    this.reactionRemaining = Math.max(0, this.reactionRemaining - deltaSeconds);

    if (this.reactionRemaining === 0) {
      this.setFrame(IDLE_FRAME);
      this.reactionResult = null;
      this.reactionReducedMotion = false;
      return;
    }

    const progress = 1 - this.reactionRemaining / this.reactionDuration;
    if (progress < 1 / 3) {
      this.setFrame(HIT_FRAME_1);
    } else if (progress < 2 / 3) {
      this.setFrame(HIT_FRAME_2);
    } else {
      this.setFrame(RECOVERY_FRAME);
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
