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
 * DOM pixel positions must never be used to classify results.
 */
export class GaugeController {
  constructor({
    oneWaySeconds = BALANCE.gaugeOneWaySeconds,
    zoneWidths = BALANCE.baseGaugeZoneWidths,
  } = {}) {
    if (!Number.isFinite(oneWaySeconds) || oneWaySeconds <= 0) {
      throw new RangeError('Gauge one-way duration must be a positive finite number.');
    }

    this.oneWaySeconds = oneWaySeconds;
    this.position = 0;
    this.direction = 1;
    this.running = true;
    this.setZoneWidths(zoneWidths);
  }

  /** Advance marker by elapsed seconds and reflect cleanly at 0/1. */
  update(deltaSeconds) {
    if (!this.running || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

    const distance = deltaSeconds / this.oneWaySeconds;
    const phase = this.direction > 0 ? this.position : 2 - this.position;
    const wrappedPhase = (phase + distance) % 2;

    if (Math.abs(wrappedPhase) <= BOUNDARY_TOLERANCE) {
      this.position = 0;
      this.direction = 1;
      return;
    }

    if (Math.abs(wrappedPhase - 1) <= BOUNDARY_TOLERANCE) {
      this.position = 1;
      this.direction = -1;
      return;
    }

    if (wrappedPhase < 1) {
      this.position = wrappedPhase;
      this.direction = 1;
    } else {
      this.position = 2 - wrappedPhase;
      this.direction = -1;
    }
  }

  /** Freeze gauge at current normalized position. */
  stop() {
    this.running = false;
    return this.position;
  }

  /** Resume motion without changing position. */
  resume() {
    this.running = true;
  }

  /** Reset next throw consistently from the left edge. */
  resetFromEdge() {
    this.position = 0;
    this.direction = 1;
    this.running = true;
  }

  /**
   * Apply total red/green/white widths. Widths must sum to 1.
   * green/white are centered symmetrically; red occupies the outside remainder.
   */
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

  /**
   * Classify a normalized position deterministically.
   * Exact white boundaries count as white; exact green boundaries count as green.
   */
  classify(position = this.position) {
    const x = clamp(position, 0, 1);
    const halfWhite = this.zoneWidths.white / 2;
    const halfGreen = this.zoneWidths.green / 2;

    const whiteStart = 0.5 - halfWhite;
    const whiteEnd = 0.5 + halfWhite;
    const greenStart = whiteStart - halfGreen;
    const greenEnd = whiteEnd + halfGreen;

    if (
      x >= whiteStart - BOUNDARY_TOLERANCE &&
      x <= whiteEnd + BOUNDARY_TOLERANCE
    ) {
      return GAUGE_RESULT.CRITICAL;
    }
    if (
      x >= greenStart - BOUNDARY_TOLERANCE &&
      x <= greenEnd + BOUNDARY_TOLERANCE
    ) {
      return GAUGE_RESULT.HIT;
    }
    return GAUGE_RESULT.MISS;
  }

  /** Return render-safe immutable snapshot. */
  getSnapshot() {
    return {
      position: this.position,
      direction: this.direction,
      running: this.running,
      zoneWidths: { ...this.zoneWidths },
      resultAtCurrentPosition: this.classify(),
    };
  }
}
