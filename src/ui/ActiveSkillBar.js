import { SKILL_DEFINITIONS } from '../progression/skillDefinitions.js';

const LONG_PRESS_MS = 500;

export class ActiveSkillBar {
  constructor({ mountElement, onActivate }) {
    this.mountElement = mountElement;
    this.onActivate = onActivate;
    this.root = document.createElement('div');
    this.root.className = 'active-skill-bar';
    this.root.setAttribute('aria-label', 'Active skills');
    this.mountElement.append(this.root);
    this.buttons = new Map();
    this.skillStates = {};
    this.longPressTimer = null;
    this.tooltipTimer = null;
    this.suppressNextClick = false;

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'active-skill-tooltip';
    this.tooltip.hidden = true;
    this.tooltip.setAttribute('role', 'tooltip');
    this.root.append(this.tooltip);

    for (const definition of SKILL_DEFINITIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'active-skill-icon';
      button.dataset.skillId = definition.id;
      button.hidden = true;
      button.innerHTML = `<span class="active-skill-icon__glyph" aria-hidden="true">${definition.icon}</span><span class="active-skill-icon__timer"></span>`;
      button.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        this.clearLongPress();
        this.hideTooltip();
        this.suppressNextClick = false;
        this.longPressTimer = setTimeout(() => {
          this.longPressTimer = null;
          this.suppressNextClick = true;
          this.showTooltip(definition);
        }, LONG_PRESS_MS);
      });
      button.addEventListener('pointerup', () => {
        this.clearLongPress();
        if (this.suppressNextClick) this.hideTooltip();
      });
      for (const eventName of ['pointercancel', 'pointerleave']) {
        button.addEventListener(eventName, () => {
          this.clearLongPress();
          if (this.suppressNextClick) this.hideTooltip();
        });
      }
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (this.suppressNextClick) {
          this.suppressNextClick = false;
          return;
        }
        const state = this.skillStates[definition.id];
        if (!state || state.activeRemainingSeconds > 0 || state.cooldownRemainingSeconds > 0) return;
        this.hideTooltip();
        this.onActivate?.(definition.id);
      });
      this.root.append(button);
      this.buttons.set(definition.id, button);
    }
  }

  clearLongPress() {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  showTooltip(definition) {
    clearTimeout(this.tooltipTimer);
    this.tooltip.innerHTML = `<strong>${definition.name}</strong><span>${definition.description}</span>`;
    this.tooltip.hidden = false;
    this.tooltipTimer = setTimeout(() => this.hideTooltip(), 4000);
  }

  hideTooltip() {
    clearTimeout(this.tooltipTimer);
    this.tooltipTimer = null;
    this.tooltip.hidden = true;
  }

  render(skillStates) {
    this.skillStates = skillStates;
    for (const [skillId, button] of this.buttons) {
      const state = skillStates[skillId];
      button.hidden = !state?.learned;
      if (!state?.learned) continue;

      const active = state.activeRemainingSeconds > 0;
      const cooldown = !active && state.cooldownRemainingSeconds > 0;
      button.classList.toggle('active-skill-icon--active', active);
      button.classList.toggle('active-skill-icon--cooldown', cooldown);
      button.setAttribute('aria-disabled', active || cooldown ? 'true' : 'false');
      const timer = button.querySelector('.active-skill-icon__timer');
      timer.textContent = active
        ? Math.ceil(state.activeRemainingSeconds).toString()
        : cooldown
          ? Math.ceil(state.cooldownRemainingSeconds).toString()
          : `Lv${state.level}`;
      button.setAttribute(
        'aria-label',
        active
          ? `${state.name} active for ${Math.ceil(state.activeRemainingSeconds)} seconds. Long press for details.`
          : cooldown
            ? `${state.name} cooldown ${Math.ceil(state.cooldownRemainingSeconds)} seconds. Long press for details.`
            : `Activate ${state.name}, level ${state.level}. Long press for details.`,
      );
    }
  }

  dispose() {
    this.clearLongPress();
    clearTimeout(this.tooltipTimer);
    this.root.remove();
    this.buttons.clear();
  }
}
