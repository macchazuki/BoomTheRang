import { describe, expect, it } from 'vitest';
import { GaugeView } from './GaugeView.js';

function snapshot(consumedSegments = []) {
  return {
    position: 0.25,
    zoneWidths: { red: 0.8, green: 0.17, white: 0.03 },
    criticalLayerCount: 1,
    segmentCount: 2,
    consumedSegments,
  };
}

describe('GaugeView consumed-area presentation', () => {
  it('never restores gauge framing when a used area turns red', () => {
    const mountElement = document.createElement('div');
    const view = new GaugeView({ mountElement });

    view.render(snapshot());
    view.render(snapshot([0]));

    expect(view.root.style.border).toBe('none');
    expect(view.root.style.outline).toBe('none');
    expect(view.root.style.boxShadow).toBe('none');

    const consumedZones = [...view.root.querySelectorAll('[data-segment="0"]')];
    expect(consumedZones.length).toBeGreaterThan(0);
    expect(consumedZones.every((zone) => zone.classList.contains('gauge__zone--red'))).toBe(true);
  });
});
