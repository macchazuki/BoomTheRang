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
});
