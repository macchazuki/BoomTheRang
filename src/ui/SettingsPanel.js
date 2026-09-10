/**
 * Common v1 settings UI.
 * Audio/haptic execution should consume GameState.settings elsewhere when those effects exist.
 */
export class SettingsPanel {
  constructor({ mountElement, gameState, onChange, onClose }) {
    this.mountElement = mountElement;
    this.gameState = gameState;
    this.onChange = onChange;
    this.onClose = onClose;
    this.isOpen = false;
  }

  /** Open settings overlay. */
  open() {
    this.isOpen = true;
    this.mountElement.hidden = false;
    this.render();
  }

  /** Hide settings overlay. */
  close() {
    this.isOpen = false;
    this.mountElement.hidden = true;
    this.mountElement.replaceChildren();
  }

  /** Build sliders/toggles for only the settings specified for v1. */
  render() {
    if (!this.isOpen) return;

    const settings = this.gameState.settings;
    const panel = document.createElement('section');
    panel.className = 'modal-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'settings-panel-title');

    const heading = document.createElement('h2');
    heading.id = 'settings-panel-title';
    heading.textContent = 'Settings';
    panel.append(heading);

    panel.append(
      this.createRange('Master volume', 'masterVolume', settings.masterVolume),
      this.createRange('Music volume', 'musicVolume', settings.musicVolume),
      this.createRange('SFX volume', 'sfxVolume', settings.sfxVolume),
      this.createToggle('Haptics', 'haptics', settings.haptics),
      this.createToggle('Reduced motion', 'reducedMotion', settings.reducedMotion),
    );

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', this.onClose);
    panel.append(close);

    this.mountElement.replaceChildren(panel);
  }

  /** Create normalized 0..1 volume slider. */
  createRange(labelText, key, value) {
    const label = document.createElement('label');
    label.className = 'settings-row';
    label.textContent = labelText;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.05';
    input.value = String(value);
    input.addEventListener('input', () => {
      this.gameState.updateSettings({ [key]: Number(input.value) });
      this.onChange();
    });

    label.append(input);
    return label;
  }

  /** Create boolean setting checkbox. */
  createToggle(labelText, key, checked) {
    const label = document.createElement('label');
    label.className = 'settings-row';
    label.textContent = labelText;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => {
      this.gameState.updateSettings({ [key]: input.checked });
      this.onChange();
    });

    label.append(input);
    return label;
  }
}
