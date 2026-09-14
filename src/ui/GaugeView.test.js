import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./GaugeView.js', import.meta.url), 'utf8');

describe('GaugeView Three.js presentation', () => {
  it('renders the gauge as Three.js meshes instead of DOM color zones', () => {
    expect(source).toContain("import * as THREE from 'three';");
    expect(source).toContain('new THREE.WebGLRenderer({ antialias: true, alpha: true })');
    expect(source).toContain('this.outerShell = new THREE.Mesh(');
    expect(source).toContain('this.rim = new THREE.Mesh(');
    expect(source).toContain('this.track = new THREE.Mesh(');
  });

  it('keeps hit zones full width and only divides the remaining red space', () => {
    expect(source).toContain('const hitWidth = green + white;');
    expect(source).toContain('(1 - hitWidth * snapshot.segmentCount) / snapshot.segmentCount');
    expect(source).toContain('const halfRed = redPerSegment / 2;');
  });

  it('renders consumed timing areas red without adding a consumed-area outline', () => {
    expect(source).toContain("const zoneName = isConsumed ? 'red' : zone.userData.zone;");
    expect(source).toContain('zone.material.color.setHex(');
    expect(source).not.toContain('LineBasicMaterial');
  });

  it('latches blind challenge concealment after the first consumed segment', () => {
    expect(source).toContain('if (this.concealAfterFirstTap && consumed.size > 0) this.concealed = true;');
    expect(source).toContain('zone.visible = !this.concealed;');
    expect(source).toContain('const markerVisible = !this.concealed && snapshot.segmentCount > 0;');
  });
});
