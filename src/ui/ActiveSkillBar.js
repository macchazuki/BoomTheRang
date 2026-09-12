import { SKILL_DEFINITIONS } from '../progression/skillDefinitions.js';

export class ActiveSkillBar {
  constructor({ mountElement, onActivate }) {
    this.mountElement = mountElement;
    this.onActivate = onActivate;
    this.root = document.createElement('div');
    this.root.className = 'active-skill-bar';
    this.root.setAttribute('aria-label', 'Active skills');
    this.mountElement.append(this.root);
    this.buttons = new Map();

    for (const definition of SKILL_DEFINITIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'active-skill-icon';
      button.dataset.skillId = definition.id;
      button.hidden = true;
      button.innerHTML = `<span class="active-skill-icon__glyph" aria-hidden="true">${definition.icon}</span><span class="active-skill-icon__timer"></span>`;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.onActivate?.(definition.id);
      });
      this.root.append(button);
      this.buttons.set(definition.id, button);
    }
  }

  render(skillStates) {
    for (const [skillId, button] of this.buttons) {
      const state = skillStates[skillId];
      button.hidden = !state?.learned;
      if (!state?.learned) continue;

      const active = state.activeRemainingSeconds > 0;
      const cooldown = !active && state.cooldownRemainingSeconds > 0;
      button.disabled = active || cooldown;
      button.classList.toggle('active-skill-icon--active', active);
      button.classList.toggle('active-skill-icon--cooldown', cooldown);
      const timer = button.querySelector('.active-skill-icon__timer');
      timer.textContent = active
        ? Math.ceil(state.activeRemainingSeconds).toString()
        : cooldown
          ? Math.ceil(state.cooldownRemainingSeconds).toString()
          : `Lv${state.level}`;
      button.setAttribute(
        'aria-label',
        active
          ? `${state.name} active for ${Math.ceil(state.activeRemainingSeconds)} seconds`
          : cooldown
            ? `${state.name} cooldown ${Math.ceil(state.cooldownRemainingSeconds)} seconds`
            : `Activate ${state.name}, level ${state.level}`,
      );
    }
  }

  dispose() {
    this.root.remove();
    this.buttons.clear();
  }
}
