import { clamp } from '../game.js';
import { BALANCE } from '../progression/balance.js';

export const GAUGE_RESULT = Object.freeze({
  MISS: 'MISS',
  HIT: 'HIT',
  CRITICAL: 'CRITICAL',
  MEGA_CRITICAL: 'MEGA_CRITICAL',
  ULTRA_CRITICAL: 'ULTRA_CRITICAL',
  OMEGA_CRITICAL: 'OMEGA_CRITICAL',
});

export const CRITICAL_RESULTS = Object.freeze([
  GAUGE_RESULT.CRITICAL,
  GAUGE_RESULT.MEGA_CRITICAL,
  GAUGE_RESULT.ULTRA_CRITICAL,
  GAUGE_RESULT.OMEGA_CRITICAL,
]);

export function isCriticalResult(result) {
  return CRITICAL_RESULTS.includes(result);
}

const ZONE_TOLERANCE = 1e-9;
const BOUNDARY_TOLERANCE = 1e-12;

/**
 * Pure normalized gauge model.
 * The marker always travels left-to-right. Each owned boomerang gets one equal
 * timing area per sweep, and an area can only be used once before the sweep resets.
 */
export class GaugeController {
  constructor({
    oneWaySeconds = BALANCE.gaugeOneWaySeconds,
    zoneWidths = BALANCE.baseGaugeZoneWidths,
    segmentCount = 1,
    criticalLayerCount = 1,
  } = {}) {
    if (!Number.isFinite(oneWaySeconds) || oneWaySeconds <= 0) {
      throw new RangeError('Gauge one-way duration must be a positive finite number.');
    }

    this.baseOneWaySeconds = oneWaySeconds;
    this.speedMultiplier = 1;
    this.oneWaySeconds = oneWaySeconds;
    this.position = 0;
    this.direction = 1;
    this.running = true;
    this.consumedSegments = new Set();
    this.criticalLayerCount = criticalLayerCount;
    this.setZoneWidths(zoneWidths);
    this.setSegmentCount(segmentCount);
  }

  /** Advance marker left-to-right and start a fresh set of areas after each sweep. */
  update(deltaSeconds) {
    if (!this.running || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

    const distance = deltaSeconds / this.oneWaySeconds;
    const nextPosition = this.position + distance;
    if (nextPosition >= 1 - BOUNDARY_TOLERANCE) {
      this.consumedSegments.clear();
    }
    this.position = nextPosition % 1;
    if (Math.abs(this.position) <= BOUNDARY_TOLERANCE) this.position = 0;
    this.direction = 1;
  }

  stop() {
    this.running = false;
    return this.position;
  }

  resume() {
    this.running = true;
  }

  resetFromEdge() {
    this.position = 0;
    this.direction = 1;
    this.running = true;
    this.consumedSegments.clear();
  }

  /** Replace the underlying sweep duration while preserving any active speed multiplier. */
  setBaseOneWaySeconds(oneWaySeconds) {
    if (!Number.isFinite(oneWaySeconds) || oneWaySeconds <= 0) {
      throw new RangeError('Gauge one-way duration must be a positive finite number.');
    }
    this.baseOneWaySeconds = oneWaySeconds;
    this.oneWaySeconds = this.baseOneWaySeconds / this.speedMultiplier;
  }

  /** Apply a progression speed multiplier without replacing the configured base duration. */
  setSpeedMultiplier(speedMultiplier = 1) {
    if (!Number.isFinite(speedMultiplier) || speedMultiplier <= 0) {
      throw new RangeError('Gauge speed multiplier must be a positive finite number.');
    }
    this.speedMultiplier = speedMultiplier;
    this.oneWaySeconds = this.baseOneWaySeconds / speedMultiplier;
  }

  setSegmentCount(segmentCount) {
    if (!Number.isInteger(segmentCount) || segmentCount < 0) {
      throw new RangeError('Gauge segment count must be a non-negative integer.');
    }
    this.segmentCount = segmentCount;
    this.consumedSegments.clear();
  }

  setCriticalLayerCount(criticalLayerCount) {
    if (!Number.isInteger(criticalLayerCount) || criticalLayerCount < 1 || criticalLayerCount > CRITICAL_RESULTS.length) {
      throw new RangeError('Critical layer count must be an integer from 1 to 4.');
    }
    if ((criticalLayerCount - 1) * this.zoneWidths.white > this.zoneWidths.green + ZONE_TOLERANCE) {
      throw new RangeError('Critical layers cannot consume more than the available green width.');
    }
    this.criticalLayerCount = criticalLayerCount;
  }

  getSegmentIndex(position = this.position) {
    if (this.segmentCount === 0) return -1;
    const x = clamp(position, 0, 1 - Number.EPSILON);
    return Math.min(this.segmentCount - 1, Math.floor(x * this.segmentCount));
  }

  /** Convert global gauge position to 0..1 within its boomerang timing area. */
  getLocalPosition(position = this.position) {
    if (this.segmentCount === 0) return 0;
    const x = clamp(position, 0, 1 - Number.EPSILON);
    return x * this.segmentCount - this.getSegmentIndex(x);
  }

  isCurrentSegmentConsumed() {
    if (this.segmentCount === 0) return true;
    return this.consumedSegments.has(this.getSegmentIndex());
  }

  /** Consume one timing area once. Returns false for invalid or repeated areas. */
  consumeSegment(segmentIndex) {
    if (
      !Number.isInteger(segmentIndex) ||
      segmentIndex < 0 ||
      segmentIndex >= this.segmentCount ||
      this.consumedSegments.has(segmentIndex)
    ) {
      return false;
    }
    this.consumedSegments.add(segmentIndex);
    return true;
  }

  /** Consume the current timing area once. Returns false for a repeated tap. */
  consumeCurrentSegment() {
    if (this.segmentCount === 0) return false;
    return this.consumeSegment(this.getSegmentIndex());
  }

  setZoneWidths(zoneWidths) {
    const { red, green, white, criticalLayerCount = this.criticalLayerCount ?? 1 } = zoneWidths;
    const widths = [red, green, white];
    const total = red + green + white;

    if (
      widths.some((value) => !Number.isFinite(value) || value < 0) ||
      Math.abs(total - 1) > ZONE_TOLERANCE
    ) {
      throw new RangeError('Gauge zone widths must be non-negative and total 1.');
    }

    this.zoneWidths = { red, green, white };
    this.setCriticalLayerCount(criticalLayerCount);
  }

  /** Classify accuracy within the current boomerang timing area. */
  classify(position = this.position) {
    if (this.segmentCount === 0) return GAUGE_RESULT.MISS;
    const x = this.getLocalPosition(position);
    const distanceFromCenter = Math.abs(x - 0.5);
    const coreWidth = this.zoneWidths.white;
    const criticalHalfWidth = (coreWidth * this.criticalLayerCount) / 2;
    const hitHalfWidth = (this.zoneWidths.white + this.zoneWidths.green) / 2;

    if (distanceFromCenter <= criticalHalfWidth + BOUNDARY_TOLERANCE) {
      const layersFromCenter = Math.max(
        0,
        Math.ceil((distanceFromCenter * 2 - BOUNDARY_TOLERANCE) / coreWidth) - 1,
      );
      const tierIndex = Math.max(0, this.criticalLayerCount - 1 - layersFromCenter);
      return CRITICAL_RESULTS[tierIndex];
    }
    if (distanceFromCenter <= hitHalfWidth + BOUNDARY_TOLERANCE) return GAUGE_RESULT.HIT;
    return GAUGE_RESULT.MISS;
  }

  getSnapshot() {
    return {
      position: this.position,
      direction: 1,
      running: this.running,
      speedMultiplier: this.speedMultiplier,
      zoneWidths: { ...this.zoneWidths },
      criticalLayerCount: this.criticalLayerCount,
      segmentCount: this.segmentCount,
      consumedSegments: [...this.consumedSegments],
      resultAtCurrentPosition: this.classify(),
    };
  }
}
