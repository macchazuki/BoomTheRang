const FRAME_COUNT = 4;
const SPRITE_HEIGHT = 0.9;
const HERO_LAUNCH_OFFSET_X = 0.55;
const HERO_X_THRESHOLD = 1.8;
const HERO_Y_THRESHOLD = -4;

function clonePoint(point) {
  return { x: Number(point?.x) || 0, y: Number(point?.y) || 0 };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function lerp(a, b, amount) {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

/** Phaser-backed render-only player/dog boomerang. */
export class BoomerangView {
  constructor({ scene, index = 0, toScreenPoint, worldScale, tint = null, autoDispose = false }) {
    this.scene = scene;
    this.index = index;
    this.toScreenPoint = toScreenPoint;
    this.worldScale = worldScale;
    this.tint = tint;
    this.autoDispose = autoDispose;
    this.sprite = scene.add.sprite(0, 0, 'boomerang', 'boomerang-0').setDepth(20).setVisible(false);
    if (tint !== null) this.sprite.setTint?.(tint);

    this.pathPoints = null;
    this.cumulativeDistances = null;
    this.totalDistance = 0;
    this.onPathPoint = null;
    this.nextPathPointIndex = 1;
    this.reducedMotion = false;
    this.currentWorldPosition = { x: 0, y: 0 };
    this.motion = null;
    this.tween = null;
    this.layout();
  }

  playHitPath(options) {
    this.startPath(options);
  }

  playMissPath(options) {
    this.startPath({ ...options, onPathPoint: null });
  }

  startPath({ points, durationSeconds, delaySeconds = 0, reducedMotion = false, onPathPoint = null }) {
    if (this.tween) {
      const concurrentView = new BoomerangView({
        scene: this.scene,
        index: this.index,
        toScreenPoint: this.toScreenPoint,
        worldScale: this.worldScale,
        tint: this.tint,
        autoDispose: true,
      });
      concurrentView.startPath({ points, durationSeconds, delaySeconds, reducedMotion, onPathPoint });
      return;
    }

    const normalizedPoints = (points ?? []).map(clonePoint);
    if (normalizedPoints.length < 2) {
      this.reset();
      return;
    }

    const ownerPoint = normalizedPoints[0];
    const isHeroPath = Math.abs(ownerPoint.x) < HERO_X_THRESHOLD && ownerPoint.y < HERO_Y_THRESHOLD;
    if (isHeroPath) {
      normalizedPoints[0].x += HERO_LAUNCH_OFFSET_X;
      normalizedPoints[normalizedPoints.length - 1].x += HERO_LAUNCH_OFFSET_X;
    }

    this.reducedMotion = reducedMotion;
    this.pathPoints = reducedMotion ? this.createReducedMotionPath(normalizedPoints[0]) : normalizedPoints;
    this.onPathPoint = onPathPoint;
    this.nextPathPointIndex = 1;
    this.cumulativeDistances = [0];
    this.totalDistance = 0;

    for (let index = 1; index < this.pathPoints.length; index += 1) {
      this.totalDistance += distance(this.pathPoints[index - 1], this.pathPoints[index]);
      this.cumulativeDistances.push(this.totalDistance);
    }

    this.currentWorldPosition = clonePoint(this.pathPoints[0]);
    this.sprite.setFrame('boomerang-0');
    this.sprite.setVisible(delaySeconds <= 0);
    this.layout();

    this.motion = { progress: 0 };
    this.tween = this.scene.tweens.add({
      targets: this.motion,
      progress: 1,
      duration: Math.max(1, durationSeconds * 1000),
      delay: Math.max(0, delaySeconds * 1000),
      ease: 'Linear',
      onStart: () => this.sprite.setVisible(true),
      onUpdate: () => this.renderProgress(this.motion.progress),
      onComplete: () => this.reset({ stopTween: false }),
    });
  }

  createReducedMotionPath(ownerPosition) {
    const direction = this.index % 2 === 0 ? 1 : -1;
    return [
      clonePoint(ownerPosition),
      { x: ownerPosition.x + 0.35 * direction, y: ownerPosition.y + 0.5 },
      clonePoint(ownerPosition),
    ];
  }

  renderProgress(progress) {
    if (!this.pathPoints) return;
    const clamped = Math.max(0, Math.min(1, Number(progress) || 0));
    this.currentWorldPosition = this.samplePath(clamped);
    this.layout();

    const traveledDistance = clamped * this.totalDistance;
    while (
      this.nextPathPointIndex < this.cumulativeDistances.length
      && traveledDistance >= this.cumulativeDistances[this.nextPathPointIndex]
    ) {
      this.onPathPoint?.(this.nextPathPointIndex);
      this.nextPathPointIndex += 1;
    }

    const cycles = this.reducedMotion ? 1 : 3;
    const frameIndex = Math.floor(clamped * FRAME_COUNT * cycles) % FRAME_COUNT;
    this.sprite.setFrame(`boomerang-${frameIndex}`);
  }

  samplePath(progress) {
    if (!this.pathPoints?.length) return { x: 0, y: 0 };
    if (this.totalDistance <= 0) return clonePoint(this.pathPoints[this.pathPoints.length - 1]);

    const targetDistance = Math.max(0, Math.min(1, progress)) * this.totalDistance;
    for (let index = 1; index < this.cumulativeDistances.length; index += 1) {
      const segmentEnd = this.cumulativeDistances[index];
      if (targetDistance > segmentEnd) continue;
      const segmentStart = this.cumulativeDistances[index - 1];
      const segmentLength = segmentEnd - segmentStart;
      const segmentProgress = segmentLength === 0 ? 1 : (targetDistance - segmentStart) / segmentLength;
      return lerp(this.pathPoints[index - 1], this.pathPoints[index], segmentProgress);
    }

    return clonePoint(this.pathPoints[this.pathPoints.length - 1]);
  }

  layout() {
    const point = this.toScreenPoint(this.currentWorldPosition);
    const sourceHeight = this.sprite.frame?.height || this.sprite.height || 1;
    this.sprite.setPosition(point.x, point.y);
    this.sprite.setScale(this.worldScale(SPRITE_HEIGHT) / sourceHeight);
  }

  stopTween() {
    if (!this.tween) return;
    this.tween.stop?.();
    this.tween.remove?.();
    this.tween = null;
  }

  reset({ stopTween = true } = {}) {
    if (stopTween) this.stopTween();
    this.sprite.setVisible(false).setFrame('boomerang-0');
    this.pathPoints = null;
    this.cumulativeDistances = null;
    this.totalDistance = 0;
    this.onPathPoint = null;
    this.nextPathPointIndex = 1;
    this.reducedMotion = false;
    this.motion = null;
    this.tween = null;
    if (this.autoDispose) this.sprite.destroy();
  }

  dispose() {
    this.stopTween();
    this.sprite.destroy();
  }
}
