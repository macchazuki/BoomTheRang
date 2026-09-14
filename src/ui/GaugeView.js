import * as THREE from 'three';

const CRITICAL_COLORS = Object.freeze({
  white: 0xf7c948,
  mega: 0xf08c46,
  ultra: 0xc968ff,
  omega: 0xf7f7ff,
});

const COLORS = Object.freeze({
  outer: 0x152331,
  rim: 0x3e5568,
  track: 0x0d1720,
  red: 0xb93845,
  green: 0x35a95d,
  marker: 0xffffff,
});

const GAUGE_WIDTH = 7.5;
const OUTER_HEIGHT = 1.05;
const RIM_HEIGHT = 0.8;
const TRACK_HEIGHT = 0.56;
const CORNER_SEGMENTS = 10;

function makeMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

function createRoundedRectGeometry(width, height, radius) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const r = Math.min(radius, halfWidth, halfHeight);
  const shape = new THREE.Shape();

  shape.moveTo(-halfWidth + r, -halfHeight);
  shape.lineTo(halfWidth - r, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r);
  shape.lineTo(halfWidth, halfHeight - r);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight);
  shape.lineTo(-halfWidth + r, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r);
  shape.lineTo(-halfWidth, -halfHeight + r);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight);

  return new THREE.ShapeGeometry(shape, CORNER_SEGMENTS);
}

function createZoneGeometry(width, height, roundLeft, roundRight) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const radius = halfHeight;
  const shape = new THREE.Shape();
  const leftInset = roundLeft ? radius : 0;
  const rightInset = roundRight ? radius : 0;

  shape.moveTo(-halfWidth + leftInset, -halfHeight);
  shape.lineTo(halfWidth - rightInset, -halfHeight);
  if (roundRight) {
    shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, 0);
    shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  } else {
    shape.lineTo(halfWidth, halfHeight);
  }
  shape.lineTo(-halfWidth + leftInset, halfHeight);
  if (roundLeft) {
    shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, 0);
    shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);
  } else {
    shape.lineTo(-halfWidth, -halfHeight);
  }

  return new THREE.ShapeGeometry(shape, CORNER_SEGMENTS);
}

/**
 * Three.js-only mirror of GaugeController normalized state.
 * The DOM mount only owns the WebGL canvas; all visible gauge layers are meshes.
 */
export class GaugeView {
  constructor({ mountElement, concealAfterFirstTap = false }) {
    this.mountElement = mountElement;
    this.concealAfterFirstTap = concealAfterFirstTap;
    this.concealed = false;
    this.renderedSegmentCount = 0;
    this.renderedCriticalLayerCount = 0;
    this.renderedZoneKey = '';
    this.zoneMeshes = [];

    this.root = document.createElement('div');
    this.root.className = 'gauge-three';
    this.root.style.width = '100%';
    this.root.style.height = '3.5rem';
    this.root.style.minWidth = '0';
    this.root.style.border = 'none';
    this.root.style.outline = 'none';
    this.root.style.boxShadow = 'none';
    this.root.setAttribute('role', 'img');
    this.root.setAttribute(
      'aria-label',
      'Timing gauge: each boomerang has red, green, and nested critical timing areas per sweep.',
    );
    this.mountElement.replaceChildren(this.root);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-4, 4, 0.9, -0.9, 0.1, 10);
    this.camera.position.z = 5;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.root.append(this.renderer.domElement);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.outerShell = new THREE.Mesh(
      createRoundedRectGeometry(GAUGE_WIDTH, OUTER_HEIGHT, OUTER_HEIGHT / 2),
      makeMaterial(COLORS.outer),
    );
    this.outerShell.position.z = 0;
    this.group.add(this.outerShell);

    this.rim = new THREE.Mesh(
      createRoundedRectGeometry(GAUGE_WIDTH - 0.22, RIM_HEIGHT, RIM_HEIGHT / 2),
      makeMaterial(COLORS.rim),
    );
    this.rim.position.z = 0.1;
    this.group.add(this.rim);

    this.track = new THREE.Mesh(
      createRoundedRectGeometry(GAUGE_WIDTH - 0.42, TRACK_HEIGHT, TRACK_HEIGHT / 2),
      makeMaterial(COLORS.track),
    );
    this.track.position.z = 0.2;
    this.group.add(this.track);

    this.markerLine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.085, TRACK_HEIGHT + 0.12),
      makeMaterial(COLORS.marker),
    );
    this.markerLine.position.z = 0.6;
    this.group.add(this.markerLine);

    const markerShape = new THREE.Shape();
    markerShape.moveTo(0, -0.18);
    markerShape.lineTo(-0.2, 0.14);
    markerShape.lineTo(0.2, 0.14);
    markerShape.closePath();
    this.markerPointer = new THREE.Mesh(
      new THREE.ShapeGeometry(markerShape),
      makeMaterial(COLORS.marker),
    );
    this.markerPointer.position.y = 0.63;
    this.markerPointer.position.z = 0.7;
    this.group.add(this.markerPointer);

    this.resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => this.resize())
      : null;
    this.resizeObserver?.observe(this.root);
    this.resize();
  }

  resize() {
    const width = Math.max(1, this.root.clientWidth || this.mountElement.clientWidth || 1);
    const height = Math.max(1, this.root.clientHeight || 56);
    this.renderer.setSize(width, height, false);
    this.renderer.render(this.scene, this.camera);
  }

  clearZones() {
    for (const mesh of this.zoneMeshes) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.zoneMeshes = [];
  }

  rebuildZones(snapshot) {
    this.clearZones();

    const { green, white } = snapshot.zoneWidths;
    const criticalLayerCount = snapshot.criticalLayerCount ?? 1;
    const expandedCriticalWidth = white * criticalLayerCount;
    const remainingGreen = Math.max(0, green - (expandedCriticalWidth - white));
    const hitWidth = green + white;
    const redPerSegment = snapshot.segmentCount > 0
      ? Math.max(0, (1 - hitWidth * snapshot.segmentCount) / snapshot.segmentCount)
      : 0;
    const halfRed = redPerSegment / 2;
    const halfGreen = remainingGreen / 2;
    const halfCriticalBand = white / 2;
    const zones = [];

    const addZone = (segment, name, width) => {
      if (width <= 0) return;
      zones.push({ segment, name, width });
    };

    const criticalNames = ['white', 'mega', 'ultra', 'omega'];
    for (let segment = 0; segment < snapshot.segmentCount; segment += 1) {
      addZone(segment, 'red', halfRed);
      addZone(segment, 'green', halfGreen);
      for (let tier = 0; tier < criticalLayerCount - 1; tier += 1) {
        addZone(segment, criticalNames[tier], halfCriticalBand);
      }
      addZone(segment, criticalNames[criticalLayerCount - 1], white);
      for (let tier = criticalLayerCount - 2; tier >= 0; tier -= 1) {
        addZone(segment, criticalNames[tier], halfCriticalBand);
      }
      addZone(segment, 'green', halfGreen);
      addZone(segment, 'red', halfRed);
    }

    const trackWidth = GAUGE_WIDTH - 0.48;
    let cursor = -trackWidth / 2;
    zones.forEach((zone, index) => {
      const width = trackWidth * zone.width;
      const mesh = new THREE.Mesh(
        createZoneGeometry(width + 0.01, TRACK_HEIGHT - 0.08, index === 0, index === zones.length - 1),
        makeMaterial(CRITICAL_COLORS[zone.name] ?? COLORS[zone.name]),
      );
      mesh.position.set(cursor + width / 2, 0, 0.4);
      mesh.userData.segment = zone.segment;
      mesh.userData.zone = zone.name;
      this.group.add(mesh);
      this.zoneMeshes.push(mesh);
      cursor += width;
    });

    this.renderedSegmentCount = snapshot.segmentCount;
    this.renderedCriticalLayerCount = criticalLayerCount;
    this.renderedZoneKey = `${snapshot.zoneWidths.red}:${green}:${white}`;
  }

  /** Render zone widths, used areas, and marker position; never classify in the view. */
  render(snapshot) {
    const criticalLayerCount = snapshot.criticalLayerCount ?? 1;
    const zoneKey = `${snapshot.zoneWidths.red}:${snapshot.zoneWidths.green}:${snapshot.zoneWidths.white}`;
    if (
      this.renderedSegmentCount !== snapshot.segmentCount ||
      this.renderedCriticalLayerCount !== criticalLayerCount ||
      this.renderedZoneKey !== zoneKey
    ) {
      this.rebuildZones(snapshot);
    }

    const consumed = new Set(snapshot.consumedSegments);
    if (this.concealAfterFirstTap && consumed.size > 0) this.concealed = true;

    for (const zone of this.zoneMeshes) {
      const isConsumed = consumed.has(zone.userData.segment);
      const zoneName = isConsumed ? 'red' : zone.userData.zone;
      zone.material.color.setHex(CRITICAL_COLORS[zoneName] ?? COLORS[zoneName]);
      zone.visible = !this.concealed;
    }

    const markerVisible = !this.concealed && snapshot.segmentCount > 0;
    const trackWidth = GAUGE_WIDTH - 0.48;
    const markerX = -trackWidth / 2 + snapshot.position * trackWidth;
    this.markerLine.visible = markerVisible;
    this.markerPointer.visible = markerVisible;
    this.markerLine.position.x = markerX;
    this.markerPointer.position.x = markerX;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.clearZones();
    for (const mesh of [this.outerShell, this.rim, this.track, this.markerLine, this.markerPointer]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.renderer.dispose();
    this.root.replaceChildren();
  }
}
