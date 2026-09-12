import * as THREE from 'three';

const DEFAULT_SPRITE_URL = new URL('../assets/sprites/boomerang.png', import.meta.url).href;
const FRAME_COUNT = 4;
const SPRITE_HEIGHT = 0.9;
const HERO_LAUNCH_OFFSET_X = 0.55;
const HERO_X_THRESHOLD = 0.75;
const HERO_Y_THRESHOLD = -4;

/**
 * Render-only player/dog boomerang.
 * Logical hit counts come from ThrowController, never Three.js collision.
 */
export class BoomerangView {
  constructor({ index = 0, spriteUrl = DEFAULT_SPRITE_URL, loader = new THREE.TextureLoader() } = {}) {
    this.index = index;
    this.spriteUrl = spriteUrl;
    this.loader = loader;
    this.texture = null;
    this.disposed = false;
    this.currentFrame = 0;

    this.material = new THREE.SpriteMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.object3d = new THREE.Sprite(this.material);
    this.object3d.scale.set(SPRITE_HEIGHT, SPRITE_HEIGHT, 1);
    this.object3d.renderOrder = 20;
    this.object3d.visible = false;

    this.pathPoints = null;
    this.cumulativeDistances = null;
    this.totalDistance = 0;
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
    this.delayRemainingSeconds = 0;
    this.reducedMotion = false;

    this.spriteReady = this.loadSprite();
  }

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

      const sourceWidth = texture.image?.width || texture.source?.data?.width || 1;
      const sourceHeight = texture.image?.height || texture.source?.data?.height || 1;
      const frameWidth = sourceWidth / FRAME_COUNT;
      this.object3d.scale.set(SPRITE_HEIGHT * (frameWidth / sourceHeight), SPRITE_HEIGHT, 1);

      this.texture = texture;
      this.material.map = texture;
      this.material.opacity = 1;
      this.material.needsUpdate = true;
      this.setFrame(0);
      return this.object3d;
    } catch (error) {
      console.error('Failed to load boomerang sprite', error);
      return null;
    }
  }

  setFrame(frameIndex) {
    this.currentFrame = ((frameIndex % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    if (!this.texture) return;

    this.texture.repeat.set(1 / FRAME_COUNT, 1);
    this.texture.offset.set(this.currentFrame / FRAME_COUNT, 0);
  }

  playHitPath({ points, durationSeconds, delaySeconds = 0, reducedMotion = false }) {
    this.startPath({ points, durationSeconds, delaySeconds, reducedMotion });
  }

  playMissPath({ points, durationSeconds, delaySeconds = 0, reducedMotion = false }) {
    this.startPath({ points, durationSeconds, delaySeconds, reducedMotion });
  }

  startPath({ points, durationSeconds, delaySeconds, reducedMotion }) {
    const normalizedPoints = points.map((point) =>
      point?.isVector3 ? point.clone() : new THREE.Vector3(...point),
    );

    if (normalizedPoints.length < 2) {
      this.reset();
      return;
    }

    // The authored hero throws from his right hand. Shift only player-owned
    // paths (centered near x=0 at the bottom of the field), not the dog path.
    const ownerPoint = normalizedPoints[0];
    const isHeroPath = Math.abs(ownerPoint.x) < HERO_X_THRESHOLD && ownerPoint.y < HERO_Y_THRESHOLD;
    if (isHeroPath) {
      normalizedPoints[0].x += HERO_LAUNCH_OFFSET_X;
      normalizedPoints[normalizedPoints.length - 1].x += HERO_LAUNCH_OFFSET_X;
    }

    this.reducedMotion = reducedMotion;
    this.pathPoints = reducedMotion
      ? this.createReducedMotionPath(normalizedPoints[0])
      : normalizedPoints;
    this.durationSeconds = Math.max(0.001, durationSeconds);
    this.delayRemainingSeconds = Math.max(0, delaySeconds);
    this.elapsedSeconds = 0;
    this.setFrame(0);

    this.cumulativeDistances = [0];
    this.totalDistance = 0;
    for (let index = 1; index < this.pathPoints.length; index += 1) {
      this.totalDistance += this.pathPoints[index - 1].distanceTo(this.pathPoints[index]);
      this.cumulativeDistances.push(this.totalDistance);
    }

    this.object3d.position.copy(this.pathPoints[0]);
    this.object3d.visible = this.delayRemainingSeconds === 0;
  }

  createReducedMotionPath(ownerPosition) {
    const direction = this.index % 2 === 0 ? 1 : -1;
    return [
      ownerPosition.clone(),
      ownerPosition.clone().add(new THREE.Vector3(0.35 * direction, 0.5, 0.1)),
      ownerPosition.clone(),
    ];
  }

  update(deltaSeconds) {
    if (!this.pathPoints) return;

    let animationDelta = Math.max(0, deltaSeconds);
    if (this.delayRemainingSeconds > 0) {
      const consumedDelay = Math.min(this.delayRemainingSeconds, animationDelta);
      this.delayRemainingSeconds -= consumedDelay;
      animationDelta -= consumedDelay;
      if (this.delayRemainingSeconds > 0) return;
      this.object3d.visible = true;
    }

    this.elapsedSeconds = Math.min(this.durationSeconds, this.elapsedSeconds + animationDelta);
    const progress = this.elapsedSeconds / this.durationSeconds;
    this.object3d.position.copy(this.samplePath(progress));

    // Cycle the four authored rotation frames while the boomerang is in flight.
    const cycles = this.reducedMotion ? 1 : 3;
    this.setFrame(Math.floor(progress * FRAME_COUNT * cycles));

    if (progress >= 1) this.reset();
  }

  samplePath(progress) {
    if (!this.pathPoints?.length) return new THREE.Vector3();
    if (this.totalDistance <= 0) return this.pathPoints[this.pathPoints.length - 1].clone();

    const targetDistance = THREE.MathUtils.clamp(progress, 0, 1) * this.totalDistance;
    for (let index = 1; index < this.cumulativeDistances.length; index += 1) {
      const segmentEnd = this.cumulativeDistances[index];
      if (targetDistance > segmentEnd) continue;

      const segmentStart = this.cumulativeDistances[index - 1];
      const segmentLength = segmentEnd - segmentStart;
      const segmentProgress = segmentLength === 0
        ? 1
        : (targetDistance - segmentStart) / segmentLength;
      return this.pathPoints[index - 1].clone().lerp(this.pathPoints[index], segmentProgress);
    }

    return this.pathPoints[this.pathPoints.length - 1].clone();
  }

  reset() {
    this.object3d.visible = false;
    this.pathPoints = null;
    this.cumulativeDistances = null;
    this.totalDistance = 0;
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
    this.delayRemainingSeconds = 0;
    this.reducedMotion = false;
    this.setFrame(0);
  }

  dispose() {
    this.disposed = true;
    this.texture?.dispose?.();
    this.material.dispose();
  }
}
