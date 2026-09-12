import * as THREE from 'three';

const DEFAULT_SPRITE_URL = new URL('../assets/sprites/hero.png', import.meta.url).href;
const SOURCE_WIDTH = 2172;
const SOURCE_HEIGHT = 724;
const SPRITE_HEIGHT = 3.2;
const IDLE_FRAME = 0;
const WIND_UP_FRAME = 1;
const THROW_FRAME = 2;
const FOLLOW_THROUGH_FRAME = 3;

const FRAME_RECTS = [
  { x: 0, width: 543, shiftX: 0 },
  { x: 543, width: 543, shiftX: 0 },
  { x: 1086, width: 555, shiftX: 0 },
  { x: 1642, width: 530, shiftX: -0.035 },
];

/** Render-only player avatar. */
export class PlayerView {
  constructor({
    spriteUrl = DEFAULT_SPRITE_URL,
    loader = new THREE.TextureLoader(),
  } = {}) {
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
      sprite.renderOrder = 10;

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

  /** Select one of the four authored horizontal crops. */
  setFrame(frameIndex) {
    this.currentFrame = THREE.MathUtils.clamp(frameIndex, 0, FRAME_RECTS.length - 1);
    if (!this.texture || !this.sprite) return;

    const frame = FRAME_RECTS[this.currentFrame];
    const inset = 0.5;
    const sampleX = frame.x + inset;
    const sampleWidth = frame.width - inset * 2;
    this.texture.offset.x = sampleX / SOURCE_WIDTH;
    this.texture.repeat.x = sampleWidth / SOURCE_WIDTH;
    this.texture.offset.y = 0;
    this.texture.repeat.y = 1;

    const spriteWidth = SPRITE_HEIGHT * (frame.width / SOURCE_HEIGHT);
    this.sprite.scale.set(spriteWidth, SPRITE_HEIGHT, 1);
    this.sprite.position.x = frame.shiftX;
  }

  update(deltaSeconds) {
    if (this.throwAnimationRemaining <= 0) return;

    this.throwAnimationRemaining = Math.max(0, this.throwAnimationRemaining - deltaSeconds);
    if (this.throwAnimationRemaining === 0) {
      this.setFrame(IDLE_FRAME);
      return;
    }

    const progress = 1 - this.throwAnimationRemaining / this.throwAnimationDuration;
    if (progress < 1 / 3) this.setFrame(WIND_UP_FRAME);
    else if (progress < 2 / 3) this.setFrame(THROW_FRAME);
    else this.setFrame(FOLLOW_THROUGH_FRAME);
  }

  playThrow({ reducedMotion = false } = {}) {
    this.throwAnimationDuration = reducedMotion ? 0.18 : 0.32;
    this.throwAnimationRemaining = this.throwAnimationDuration;
    this.setFrame(WIND_UP_FRAME);
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
