import { clamp } from '../game.js';
import { BALANCE } from '../progression/balance.js';

export const GAUGE_RESULT = Object.freeze({
  MISS: 'MISS',
  HIT: 'HIT',
  CRITICAL: 'CRITICAL',
});

/**
 * Pure normalized gauge model.
 * DOM pixel positions must never be used to classify results.
 */
export class GaugeController {
  constructor({
    oneWaySeconds = BALANCE.gaugeOneWaySeconds,
    zoneWidths = BALANCE.baseGaugeZoneWidths,
  } = {}) {
    this.oneWaySeconds = oneWaySeconds;
    this.position = 0;
    this.direction = 1;
    this.running = true;
    this.setZoneWidths(zoneWidths);
  }

  /** Advance marker by elapsed seconds and reflect cleanly at 0/1. */
  update(deltaSeconds) {
    if (!this.running || deltaSeconds <= 0) return;

    const distance = deltaSeconds / this.oneWaySeconds;
    let next = this.position + distance * this.direction;

    while (next > 1 || next < 0) {
      if (next > 1) {
        next = 2 - next;
        this.direction = -1;
      } else if (next < 0) {
        next = -next;
        this.direction = 1;
      }
    }

    this.position = clamp(next, 0, 1);
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
    const total = red + green + white;

    if ([red, green, white].some((value) => value < 0) || Math.abs(total - 1) > 1e-9) {
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

    if (x >= whiteStart && x <= whiteEnd) return GAUGE_RESULT.CRITICAL;
    if (x >= greenStart && x <= greenEnd) return GAUGE_RESULT.HIT;
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
