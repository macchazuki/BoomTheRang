/**
 * DOM-only HUD: XP, combo, reload countdown, and temporary feedback.
 */
export class HUD {
  constructor({ mountElement }) {
    this.mountElement = mountElement;
    this.feedbackElement =
      this.mountElement.closest?.('.game-screen')?.querySelector?.('[data-feedback]') ?? null;
  }

  /** Render always-visible state from authoritative models. */
  render({ xp, combo, comboUnlocked, reloadRemainingSeconds, state }) {
    const comboMarkup = comboUnlocked
      ? `<span class="hud__combo">Combo: ${combo}</span>`
      : '';
    const reloadMarkup = state === 'MISS_RELOAD'
      ? `<span class="hud__reload">Reload: ${reloadRemainingSeconds.toFixed(1)}s</span>`
      : '';

    this.mountElement.innerHTML = `
      <span class="hud__xp">XP: ${Math.floor(xp).toLocaleString()}</span>
      ${comboMarkup}
      ${reloadMarkup}
    `;
  }

  /** Show manual MISS/HIT/PERFECT and awarded XP. */
  showPlayerResult({ result, awardedXp }) {
    if (!this.feedbackElement) return;

    const label = result === 'CRITICAL' ? 'PERFECT!' : result === 'HIT' ? 'HIT!' : 'MISS';
    this.feedbackElement.textContent = awardedXp > 0 ? `${label} +${awardedXp} XP` : label;
  }

  /** Show smaller independent dog feedback. */
  showDogResult({ critical, awardedXp }) {
    if (!this.feedbackElement) return;
    this.feedbackElement.textContent = critical
      ? `GOOD BOY! +${awardedXp} XP`
      : `Dog +${awardedXp} XP`;
  }

  /** Clear temporary feedback when desired by final visual implementation. */
  clearFeedback() {
    if (this.feedbackElement) this.feedbackElement.textContent = '';
  }
}
