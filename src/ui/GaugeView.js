/**
 * DOM/CSS mirror of GaugeController normalized state.
 * Gameplay classification remains authoritative in GaugeController.
 */
const CRITICAL_COLORS = Object.freeze({
  white: '#f7c948',
  mega: '#f08c46',
  ultra: '#c968ff',
  omega: '#f7f7ff',
});

const SPARK_ANGLES = [-82, -58, -32, -8, 18, 42, 66, 102];
const STAR_ANGLES = [-90, -52, -18, 20, 58, 96, 142];

export class GaugeView {
  constructor({ mountElement, fadePerHit = null }) {
    this.mountElement = mountElement;
    this.fadePerHit = Number.isFinite(fadePerHit) ? Math.max(0, Math.min(1, fadePerHit)) : null;
    this.opacity = 1;
    this.renderedSegmentCount = 0;
    this.renderedCriticalLayerCount = 0;
    this.renderedZoneKey = '';
    this.previousConsumedSegments = new Set();

    this.root = document.createElement('div');
    this.root.className = 'gauge';
    this.root.setAttribute('role', 'img');
    this.root.setAttribute(
      'aria-label',
      'Timing gauge: each boomerang has red, green, and nested critical timing areas per sweep.',
    );
    if (this.fadePerHit !== null) this.root.style.transition = 'opacity 180ms linear';

    this.rim = document.createElement('div');
    this.rim.className = 'gauge__rim';

    this.track = document.createElement('div');
    this.track.className = 'gauge__track';

    this.marker = document.createElement('div');
    this.marker.className = 'gauge__marker';
    this.marker.setAttribute('aria-hidden', 'true');

    this.effects = document.createElement('div');
    this.effects.className = 'gauge__effects';
    this.effects.setAttribute('aria-hidden', 'true');

    this.rim.append(this.track);
    this.root.append(this.rim, this.effects);
    this.mountElement.replaceChildren(this.root);
  }

  rebuildZones(snapshot) {
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
    const columns = [];
    const zones = [];

    const addZone = (segment, name, width) => {
      if (width <= 0) return;
      columns.push(`${width}fr`);
      const zone = document.createElement('div');
      zone.className = `gauge__zone gauge__zone--${name}`;
      zone.dataset.segment = String(segment);
      zone.dataset.zone = name;
      zone.style.background = CRITICAL_COLORS[name] ?? '';
      zone.setAttribute('aria-hidden', 'true');
      zones.push(zone);
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

    this.track.style.gridTemplateColumns = columns.join(' ');
    this.track.replaceChildren(...zones, this.marker);
    this.renderedSegmentCount = snapshot.segmentCount;
    this.renderedCriticalLayerCount = criticalLayerCount;
    this.renderedZoneKey = `${snapshot.zoneWidths.red}:${green}:${white}`;
  }

  showHitEffect(result, position) {
    if (result === 'MISS') return;

    const burst = document.createElement('div');
    const isCritical = result !== 'HIT';
    burst.className = `gauge__hit-effect gauge__hit-effect--${isCritical ? 'critical' : 'normal'}`;
    burst.style.left = `${position * 100}%`;

    const angles = isCritical ? STAR_ANGLES : SPARK_ANGLES;
    angles.forEach((angle, index) => {
      const particle = document.createElement('span');
      particle.className = isCritical ? 'gauge__star' : 'gauge__spark';
      particle.style.setProperty('--particle-angle', `${angle}deg`);
      particle.style.setProperty('--particle-distance', `${isCritical ? 1.45 + (index % 3) * 0.28 : 1.05 + (index % 3) * 0.22}rem`);
      particle.style.setProperty('--particle-delay', `${index * 12}ms`);
      if (isCritical) particle.textContent = '★';
      burst.append(particle);
    });

    this.effects.append(burst);
    burst.addEventListener('animationend', (event) => {
      if (event.target === burst) burst.remove();
    });
  }

  /** Render zone widths, used areas, and marker position; never classify from DOM. */
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
    const newlyConsumed = snapshot.consumedSegments.some((segment) => !this.previousConsumedSegments.has(segment));
    if (newlyConsumed) {
      this.showHitEffect(snapshot.resultAtCurrentPosition, snapshot.position);
      if (this.fadePerHit !== null && snapshot.resultAtCurrentPosition !== 'MISS') {
        this.opacity = Math.max(0, this.opacity - this.fadePerHit);
        this.root.style.opacity = String(this.opacity);
      }
    }
    this.previousConsumedSegments = consumed;

    for (const zone of this.track.querySelectorAll('.gauge__zone')) {
      const isConsumed = consumed.has(Number(zone.dataset.segment));
      const zoneName = isConsumed ? 'red' : zone.dataset.zone;
      zone.className = `gauge__zone gauge__zone--${zoneName}`;
      zone.style.background = isConsumed ? '' : CRITICAL_COLORS[zoneName] ?? '';
    }

    this.marker.hidden = snapshot.segmentCount === 0;
    this.marker.style.left = `${snapshot.position * 100}%`;
  }

  dispose() {
    this.root.remove();
  }
}
