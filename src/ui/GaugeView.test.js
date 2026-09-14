import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./GaugeView.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../gauge.css', import.meta.url), 'utf8');

describe('GaugeView DOM/CSS presentation', () => {
  it('renders a dual-layer rounded pill with DOM elements and CSS', () => {
    expect(source).not.toContain("import * as THREE from 'three';");
    expect(source).toContain("this.rim.className = 'gauge__rim';");
    expect(source).toContain("this.track.className = 'gauge__track';");
    expect(styles).toContain('.gauge__rim');
    expect(styles).toContain('.gauge__track');
    expect(styles).toContain('border-radius: 999px;');
    expect(styles).toContain('border: 0;');
    expect(styles).toContain('outline: 0;');
  });

  it('keeps hit zones full width and only divides the remaining red space', () => {
    expect(source).toContain('const hitWidth = green + white;');
    expect(source).toContain('(1 - hitWidth * snapshot.segmentCount) / snapshot.segmentCount');
    expect(source).toContain('const halfRed = redPerSegment / 2;');
  });

  it('renders consumed timing areas red without a consumed-area outline', () => {
    expect(source).toContain("const zoneName = isConsumed ? 'red' : zone.dataset.zone;");
    expect(source).toContain("zone.className = `gauge__zone gauge__zone--${zoneName}`;");
    expect(styles).not.toContain('gauge__zone--consumed');
  });

  it('latches blind challenge concealment after the first consumed segment', () => {
    expect(source).toContain('if (this.concealAfterFirstTap && consumed.size > 0) this.concealed = true;');
    expect(source).toContain("zone.style.visibility = this.concealed ? 'hidden' : '';");
    expect(source).toContain('this.marker.hidden = this.concealed || snapshot.segmentCount === 0;');
  });

  it('uses CSS/DOM spark bursts for hits and star pops for criticals', () => {
    expect(source).toContain("particle.className = isCritical ? 'gauge__star' : 'gauge__spark';");
    expect(source).toContain("if (isCritical) particle.textContent = '★';");
    expect(source).toContain("if (result === 'MISS') return;");
    expect(styles).toContain('.gauge__spark');
    expect(styles).toContain('.gauge__star');
    expect(styles).toContain('@keyframes gauge-spark-burst');
    expect(styles).toContain('@keyframes gauge-star-pop');
  });
});
