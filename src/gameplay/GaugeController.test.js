import { describe, expect, it } from 'vitest';
import { GAUGE_RESULT, GaugeController } from './GaugeController.js';
import { BALANCE } from '../progression/balance.js';

describe('GaugeController contract', () => {
  it('moves only left-to-right and resets at the end', () => {
    const gauge = new GaugeController({ oneWaySeconds: 2 });
    gauge.update(0.5);
    expect(gauge.position).toBeCloseTo(0.25);
    expect(gauge.direction).toBe(1);
    gauge.update(1.5);
    expect(gauge.position).toBe(0);
    expect(gauge.direction).toBe(1);
  });

  it('splits accuracy into one repeated timing area per boomerang', () => {
    const gauge = new GaugeController({
      segmentCount: 2,
      zoneWidths: { red: 0.6, green: 0.3, white: 0.1 },
    });
    expect(gauge.classify(0.25)).toBe(GAUGE_RESULT.CRITICAL);
    expect(gauge.classify(0.75)).toBe(GAUGE_RESULT.CRITICAL);
    expect(gauge.classify(0.175)).toBe(GAUGE_RESULT.HIT);
    expect(gauge.classify(0.675)).toBe(GAUGE_RESULT.HIT);
    expect(gauge.classify(0.05)).toBe(GAUGE_RESULT.MISS);
  });

  it('adds higher crit layers at center while pushing earlier crits outward', () => {
    const gauge = new GaugeController({
      zoneWidths: { red: 0.8, green: 0.17, white: 0.03 },
      criticalLayerCount: 4,
    });

    expect(gauge.classify(0.5)).toBe(GAUGE_RESULT.OMEGA_CRITICAL);
    expect(gauge.classify(0.52)).toBe(GAUGE_RESULT.ULTRA_CRITICAL);
    expect(gauge.classify(0.535)).toBe(GAUGE_RESULT.MEGA_CRITICAL);
    expect(gauge.classify(0.55)).toBe(GAUGE_RESULT.CRITICAL);
    expect(gauge.classify(0.58)).toBe(GAUGE_RESULT.HIT);
  });

  it('allows each timing area to be consumed only once per sweep', () => {
    const gauge = new GaugeController({ oneWaySeconds: 1, segmentCount: 2 });
    gauge.position = 0.25;
    expect(gauge.consumeCurrentSegment()).toBe(true);
    expect(gauge.consumeCurrentSegment()).toBe(false);
    gauge.position = 0.75;
    expect(gauge.consumeCurrentSegment()).toBe(true);
    expect(gauge.getSnapshot().consumedSegments).toEqual([0, 1]);
    gauge.update(0.25);
    expect(gauge.position).toBe(0);
    expect(gauge.getSnapshot().consumedSegments).toEqual([]);
  });

  it('supports an empty gauge when no boomerangs are currently available', () => {
    const gauge = new GaugeController({ segmentCount: 0 });
    expect(gauge.getSnapshot().segmentCount).toBe(0);
    expect(gauge.consumeCurrentSegment()).toBe(false);
    expect(gauge.classify()).toBe(GAUGE_RESULT.MISS);
  });

  it('uses the configured default accuracy widths inside every area', () => {
    const gauge = new GaugeController();
    expect(gauge.oneWaySeconds).toBe(1.35);
    expect(gauge.zoneWidths).toEqual(BALANCE.baseGaugeZoneWidths);
    expect(gauge.classify(0.1)).toBe(GAUGE_RESULT.MISS);
    expect(gauge.classify(0.4)).toBe(GAUGE_RESULT.HIT);
    expect(gauge.classify(0.5)).toBe(GAUGE_RESULT.CRITICAL);
  });

  it('validates widths, critical layers, and segment count', () => {
    const gauge = new GaugeController();
    expect(() => gauge.setSegmentCount(-1)).toThrow(RangeError);
    expect(() => gauge.setSegmentCount(1.5)).toThrow(RangeError);
    expect(() => gauge.setCriticalLayerCount(0)).toThrow(RangeError);
    expect(() => gauge.setCriticalLayerCount(5)).toThrow(RangeError);
    expect(() => gauge.setZoneWidths({ red: 0.8, green: 0.17, white: 0.04 })).toThrow(RangeError);
  });
});