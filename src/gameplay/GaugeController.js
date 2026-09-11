import { clamp } from '../game.js';
import { BALANCE } from '../progression/balance.js';

export const GAUGE_RESULT = Object.freeze({
  MISS: 'MISS',
  HIT: 'HIT',
  CRITICAL: 'CRITICAL',
});

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
  } = {}) {
    if (!Number.isFinite(oneWaySeconds) || oneWaySeconds <= 0) {
      throw new RangeError('Gauge one-way duration must be a positive finite number.');
    }

    this.oneWaySeconds = oneWaySeconds;
    this.position = 0;
    this.direction = 1;
    this.running = true;
    this.consumedSegments = new Set();
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

  setSegmentCount(segmentCount) {
    if (!Number.isInteger(segmentCount) || segmentCount < 0) {
      throw new RangeError('Gauge segment count must be a non-negative integer.');
    }
    this.segmentCount = segmentCount;
    this.consumedSegments.clear();
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

  /** Consume the current timing area once. Returns false for a repeated tap. */
  consumeCurrentSegment() {
    if (this.segmentCount === 0) return false;
    const segmentIndex = this.getSegmentIndex();
    if (this.consumedSegments.has(segmentIndex)) return false;
    this.consumedSegments.add(segmentIndex);
    return true;
  }

  setZoneWidths(zoneWidths) {
    const { red, green, white } = zoneWidths;
    const widths = [red, green, white];
    const total = red + green + white;

    if (
      widths.some((value) => !Number.isFinite(value) || value < 0) ||
      Math.abs(total - 1) > ZONE_TOLERANCE
    ) {
      throw new RangeError('Gauge zone widths must be non-negative and total 1.');
    }

    this.zoneWidths = { red, green, white };
  }

  /** Classify accuracy within the current boomerang timing area. */
  classify(position = this.position) {
    if (this.segmentCount === 0) return GAUGE_RESULT.MISS;
    const x = this.getLocalPosition(position);
    const halfWhite = this.zoneWidths.white / 2;
    const halfGreen = this.zoneWidths.green / 2;

    const whiteStart = 0.5 - halfWhite;
    const whiteEnd = 0.5 + halfWhite;
    const greenStart = whiteStart - halfGreen;
    const greenEnd = whiteEnd + halfGreen;

    if (x >= whiteStart - BOUNDARY_TOLERANCE && x <= whiteEnd + BOUNDARY_TOLERANCE) {
      return GAUGE_RESULT.CRITICAL;
    }
    if (x >= greenStart - BOUNDARY_TOLERANCE && x <= greenEnd + BOUNDARY_TOLERANCE) {
      return GAUGE_RESULT.HIT;
    }
    return GAUGE_RESULT.MISS;
  }

  getSnapshot() {
    return {
      position: this.position,
      direction: 1,
      running: this.running,
      zoneWidths: { ...this.zoneWidths },
      segmentCount: this.segmentCount,
      consumedSegments: [...this.consumedSegments],
      resultAtCurrentPosition: this.classify(),
    };
  }
}
