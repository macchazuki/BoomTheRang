import * as THREE from 'three';

/**
 * Render-only player/dog boomerang.
 * Logical hit counts come from ThrowController, never Three.js collision.
 */
export class BoomerangView {
  constructor({ index = 0 } = {}) {
    this.index = index;
    this.object3d = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.1, 8, 24, Math.PI * 1.4),
      new THREE.MeshStandardMaterial({ color: 0xffc04d }),
    );
    this.object3d.visible = false;

    this.pathPoints = null;
    this.cumulativeDistances = null;
    this.totalDistance = 0;
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
    this.delayRemainingSeconds = 0;
    this.reducedMotion = false;
  }

  /** Configure/launch a deterministic successful target-chain path. */
  playHitPath({ points, durationSeconds, delaySeconds = 0, reducedMotion = false }) {
    this.startPath({ points, durationSeconds, delaySeconds, reducedMotion });
  }

  /** Configure/launch deterministic miss curve beside target formation. */
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

    this.reducedMotion = reducedMotion;
    this.pathPoints = reducedMotion
      ? this.createReducedMotionPath(normalizedPoints[0])
      : normalizedPoints;
    this.durationSeconds = Math.max(0.001, durationSeconds);
    this.delayRemainingSeconds = Math.max(0, delaySeconds);
    this.elapsedSeconds = 0;

    this.cumulativeDistances = [0];
    this.totalDistance = 0;
    for (let index = 1; index < this.pathPoints.length; index += 1) {
      this.totalDistance += this.pathPoints[index - 1].distanceTo(this.pathPoints[index]);
      this.cumulativeDistances.push(this.totalDistance);
    }

    this.object3d.position.copy(this.pathPoints[0]);
    this.object3d.visible = this.delayRemainingSeconds === 0;
  }

  /** Reduced motion keeps the boomerang near its owner while target feedback still conveys the result. */
  createReducedMotionPath(ownerPosition) {
    const direction = this.index % 2 === 0 ? 1 : -1;
    return [
      ownerPosition.clone(),
      ownerPosition.clone().add(new THREE.Vector3(0.35 * direction, 0.5, 0.1)),
      ownerPosition.clone(),
    ];
  }

  /** Advance current visual path/spin. */
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
    this.object3d.rotation.z += animationDelta * (this.reducedMotion ? 8 : 18);

    if (progress >= 1) {
      this.reset();
    }
  }

  /** Sample the configured polyline by traveled distance for roughly constant visual speed. */
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

  /** Reset boomerang to hidden owner position. */
  reset() {
    this.object3d.visible = false;
    this.pathPoints = null;
    this.cumulativeDistances = null;
    this.totalDistance = 0;
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
    this.delayRemainingSeconds = 0;
    this.reducedMotion = false;
  }

  /** Dispose owned GPU resources. */
  dispose() {
    this.object3d.geometry.dispose();
    this.object3d.material.dispose();
  }
}
