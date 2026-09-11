/**
 * DOM mirror of GaugeController normalized state.
 */
export class GaugeView {
  constructor({ mountElement }) {
    this.mountElement = mountElement;
    this.root = document.createElement('div');
    this.root.className = 'gauge';
    this.root.setAttribute('role', 'img');
    this.root.setAttribute(
      'aria-label',
      'Timing gauge: each boomerang has one red, green, and white timing area per sweep.',
    );
    this.mountElement.replaceChildren(this.root);

    this.marker = document.createElement('div');
    this.marker.className = 'gauge__marker';
    this.marker.style.boxShadow = 'none';
    this.marker.setAttribute('aria-hidden', 'true');
    this.renderedSegmentCount = 0;
  }

  rebuildZones(snapshot) {
    const { red, green, white } = snapshot.zoneWidths;
    const halfRed = red / 2;
    const halfGreen = green / 2;
    const columns = [];
    const zones = [];

    for (let segment = 0; segment < snapshot.segmentCount; segment += 1) {
      const parts = [
        ['red', halfRed],
        ['green', halfGreen],
        ['white', white],
        ['green', halfGreen],
        ['red', halfRed],
      ];
      for (const [name, width] of parts) {
        columns.push(`${width}fr`);
        const zone = document.createElement('div');
        zone.className = `gauge__zone gauge__zone--${name}`;
        zone.dataset.segment = String(segment);
        zone.dataset.zone = name;
        zone.setAttribute('aria-hidden', 'true');
        zones.push(zone);
      }
    }

    this.root.style.gridTemplateColumns = columns.join(' ');
    this.root.replaceChildren(...zones, this.marker);
    this.renderedSegmentCount = snapshot.segmentCount;
  }

  /** Render zone widths, used areas, and marker position; never classify from DOM. */
  render(snapshot) {
    if (this.renderedSegmentCount !== snapshot.segmentCount) this.rebuildZones(snapshot);

    const consumed = new Set(snapshot.consumedSegments);
    for (const zone of this.root.querySelectorAll('.gauge__zone')) {
      const isConsumed = consumed.has(Number(zone.dataset.segment));
      zone.classList.toggle('gauge__zone--consumed', isConsumed);
      zone.classList.remove('gauge__zone--red', 'gauge__zone--green', 'gauge__zone--white');
      zone.classList.add(`gauge__zone--${isConsumed ? 'red' : zone.dataset.zone}`);
    }

    this.marker.hidden = snapshot.segmentCount === 0;
    this.marker.style.left = `${snapshot.position * 100}%`;
  }
}
