import { describe, expect, it } from 'vitest';
import { GAUGE_RESULT, GaugeController } from './GaugeController.js';
import { BALANCE } from '../progression/balance.js';

describe('GaugeController contract', () => {
  it('uses elapsed seconds and reflects normalized marker at 0 and 1', () => {
    const gauge = new GaugeController({ oneWaySeconds: 2 });

    gauge.update(0.5);
    expect(gauge.position).toBeCloseTo(0.25);
    expect(gauge.direction).toBe(1);

    gauge.update(1.5);
    expect(gauge.position).toBe(1);
    expect(gauge.direction).toBe(-1);

    gauge.update(2);
    expect(gauge.position).toBe(0);
    expect(gauge.direction).toBe(1);
  });

  it('reflects correctly for a delta spanning multiple edges', () => {
    const gauge = new GaugeController({ oneWaySeconds: 2 });

    gauge.update(9);

    expect(gauge.position).toBeCloseTo(0.5);
    expect(gauge.direction).toBe(1);
  });

  it('uses the harder 80% red / 17% green / 3% white default gauge', () => {
    const gauge = new GaugeController();

    expect(gauge.oneWaySeconds).toBe(1.35);
    expect(gauge.zoneWidths).toEqual(BALANCE.baseGaugeZoneWidths);
    expect(gauge.classify(0.1)).toBe(GAUGE_RESULT.MISS);
    expect(gauge.classify(0.4)).toBe(GAUGE_RESULT.HIT);
    expect(gauge.classify(0.5)).toBe(GAUGE_RESULT.CRITICAL);
  });

  it('classifies red/green/white using configured widths', () => {
    const gauge = new GaugeController({
      zoneWidths: { red: 0.6, green: 0.3, white: 0.1 },
    });

    expect(gauge.classify(0.2)).toBe(GAUGE_RESULT.MISS);
    expect(gauge.classify(0.35)).toBe(GAUGE_RESULT.HIT);
    expect(gauge.classify(0.5)).toBe(GAUGE_RESULT.CRITICAL);
    expect(gauge.classify(0.65)).toBe(GAUGE_RESULT.HIT);
    expect(gauge.classify(0.8)).toBe(GAUGE_RESULT.MISS);
  });

  it('uses deterministic exact-boundary behavior', () => {
    const gauge = new GaugeController({
      zoneWidths: { red: 0.6, green: 0.3, white: 0.1 },
    });

    expect(gauge.classify(0.3)).toBe(GAUGE_RESULT.HIT);
    expect(gauge.classify(0.45)).toBe(GAUGE_RESULT.CRITICAL);
    expect(gauge.classify(0.55)).toBe(GAUGE_RESULT.CRITICAL);
    expect(gauge.classify(0.7)).toBe(GAUGE_RESULT.HIT);
  });

  it('keeps configured widths non-negative and totaling 100%', () => {
    const gauge = new GaugeController();
    const upgradedWidths = { red: 0.76, green: 0.19, white: 0.05 };

    gauge.setZoneWidths(upgradedWidths);
    expect(gauge.zoneWidths).toEqual(upgradedWidths);
    expect(
      gauge.zoneWidths.red + gauge.zoneWidths.green + gauge.zoneWidths.white,
    ).toBeCloseTo(1);

    expect(() => gauge.setZoneWidths({ red: 0.8, green: 0.17, white: -0.03 })).toThrow(
      RangeError,
    );
    expect(() => gauge.setZoneWidths({ red: 0.8, green: 0.17, white: 0.04 })).toThrow(
      RangeError,
    );
    expect(() => gauge.setZoneWidths({ red: Number.NaN, green: 0.17, white: 0.03 })).toThrow(
      RangeError,
    );
  });
});
