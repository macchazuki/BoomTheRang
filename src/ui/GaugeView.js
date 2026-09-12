/**
 * DOM mirror of GaugeController normalized state.
 */
const CRITICAL_COLORS = Object.freeze({
  white: '#f7c948',
  mega: '#f08c46',
  ultra: '#c968ff',
  omega: '#f7f7ff',
});

export class GaugeView {
  constructor({ mountElement, concealAfterFirstTap = false }) {
    this.mountElement = mountElement;
    this.concealAfterFirstTap = concealAfterFirstTap;
    this.concealed = false;
    this.root = document.createElement('div');
    this.root.className = 'gauge';
    // Gauge framing is intentionally disabled here so later presentation CSS cannot
    // reintroduce the consumed-area box/outline regression.
    this.root.style.border = 'none';
    this.root.style.outline = 'none';
    this.root.style.boxShadow = 'none';
    this.root.setAttribute('role', 'img');
    this.root.setAttribute(
      'aria-label',
      'Timing gauge: each boomerang has red, green, and nested critical timing areas per sweep.',
    );
    this.mountElement.replaceChildren(this.root);

    this.marker = document.createElement('div');
    this.marker.className = 'gauge__marker';
    this.marker.setAttribute('aria-hidden', 'true');
    this.renderedSegmentCount = 0;
    this.renderedCriticalLayerCount = 0;
    this.renderedZoneKey = '';
  }

  rebuildZones(snapshot) {
    const { red, green, white } = snapshot.zoneWidths;
    const criticalLayerCount = snapshot.criticalLayerCount ?? 1;
    const expandedCriticalWidth = white * criticalLayerCount;
    const remainingGreen = Math.max(0, green - (expandedCriticalWidth - white));
    const halfRed = red / 2;
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

    this.root.style.gridTemplateColumns = columns.join(' ');
    this.root.replaceChildren(...zones, this.marker);
    this.renderedSegmentCount = snapshot.segmentCount;
    this.renderedCriticalLayerCount = criticalLayerCount;
    this.renderedZoneKey = `${red}:${green}:${white}`;
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
    if (this.concealAfterFirstTap && consumed.size > 0) this.concealed = true;

    for (const zone of this.root.querySelectorAll('.gauge__zone')) {
      const isConsumed = consumed.has(Number(zone.dataset.segment));
      const zoneName = isConsumed ? 'red' : zone.dataset.zone;
      zone.className = `gauge__zone gauge__zone--${zoneName}`;
      zone.style.background = isConsumed ? '' : CRITICAL_COLORS[zoneName] ?? '';
      zone.style.visibility = this.concealed ? 'hidden' : '';
    }

    this.marker.hidden = this.concealed || snapshot.segmentCount === 0;
    this.marker.style.left = `${snapshot.position * 100}%`;
  }
}
