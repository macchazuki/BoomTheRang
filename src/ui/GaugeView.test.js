import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./GaugeView.js', import.meta.url), 'utf8');

describe('GaugeView consumed-area presentation', () => {
  it('keeps gauge framing disabled while consumed areas render red', () => {
    expect(source).toContain("this.root.style.border = 'none';");
    expect(source).toContain("this.root.style.outline = 'none';");
    expect(source).toContain("this.root.style.boxShadow = 'none';");
    expect(source).toContain("const zoneName = isConsumed ? 'red' : zone.dataset.zone;");
  });

  it('latches blind challenge concealment after the first consumed segment', () => {
    expect(source).toContain('if (this.concealAfterFirstTap && consumed.size > 0) this.concealed = true;');
    expect(source).toContain("zone.style.visibility = this.concealed ? 'hidden' : '';");
    expect(source).toContain('this.marker.hidden = this.concealed || snapshot.segmentCount === 0;');
  });
});
