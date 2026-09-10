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
      'Timing gauge: red zones miss, green zones hit, and the white center is perfect.',
    );
    this.mountElement.replaceChildren(this.root);

    this.marker = document.createElement('div');
    this.marker.className = 'gauge__marker';
    this.marker.setAttribute('aria-hidden', 'true');
    this.root.append(this.marker);
  }

  /** Render zone widths and marker position; never classify gameplay from DOM. */
  render(snapshot) {
    const { red, green, white } = snapshot.zoneWidths;
    const halfRed = red / 2;
    const halfGreen = green / 2;

    this.root.style.gridTemplateColumns =
      `${halfRed}fr ${halfGreen}fr ${white}fr ${halfGreen}fr ${halfRed}fr`;

    // Rebuild only if zones were not initialized.
    if (this.root.querySelectorAll('.gauge__zone').length === 0) {
      const classes = ['red', 'green', 'white', 'green', 'red'];
      const marker = this.marker;
      this.root.replaceChildren(
        ...classes.map((name) => {
          const zone = document.createElement('div');
          zone.className = `gauge__zone gauge__zone--${name}`;
          zone.setAttribute('aria-hidden', 'true');
          return zone;
        }),
        marker,
      );
    }

    this.marker.style.left = `${snapshot.position * 100}%`;
  }
}
