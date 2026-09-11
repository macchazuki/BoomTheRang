/**
 * DOM-only HUD: XP, combo, reload countdown, and temporary feedback.
 */
export class HUD {
  constructor({ mountElement }) {
    this.mountElement = mountElement;
    this.gameScreen = this.mountElement.closest?.('.game-screen') ?? null;
    this.feedbackElement = this.gameScreen?.querySelector?.('[data-feedback]') ?? null;
    this.canvasHost = this.gameScreen?.querySelector?.('[data-canvas-host]') ?? null;
    this.impactIndex = 0;
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

    if (result === 'HIT' || result === 'CRITICAL') {
      this.showComicImpact({ critical: result === 'CRITICAL' });
    }
  }

  /** Show smaller independent dog feedback. */
  showDogResult({ critical, awardedXp }) {
    if (!this.feedbackElement) return;
    this.feedbackElement.textContent = critical
      ? `GOOD BOY! +${awardedXp} XP`
      : `Dog +${awardedXp} XP`;
    this.showComicImpact({ critical, dog: true });
  }

  /** Spawn a short comic-book impact word over the target area. */
  showComicImpact({ critical = false, dog = false } = {}) {
    if (!this.canvasHost) return;

    const normalWords = dog ? ['BAP!', 'BONK!', 'POW!'] : ['POW!', 'BAM!', 'WHAM!'];
    const criticalWords = dog ? ['KAPOW!', 'WOOF!'] : ['KAPOW!', 'BOOM!', 'CRACK!'];
    const words = critical ? criticalWords : normalWords;
    const callout = document.createElement('div');
    const position = ['left', 'center', 'right'][this.impactIndex % 3];

    callout.className = `comic-impact comic-impact--${position}${critical ? ' comic-impact--critical' : ''}`;
    callout.textContent = words[this.impactIndex % words.length];
    callout.setAttribute('aria-hidden', 'true');
    this.impactIndex += 1;
    this.canvasHost.append(callout);

    window.setTimeout(() => callout.remove(), 650);

    if (critical && document.documentElement.dataset.screenShake !== 'off') {
      this.canvasHost.classList.remove('comic-shake');
      void this.canvasHost.offsetWidth;
      this.canvasHost.classList.add('comic-shake');
      window.setTimeout(() => this.canvasHost?.classList.remove('comic-shake'), 240);
    }
  }

  /** Clear temporary feedback when desired by final visual implementation. */
  clearFeedback() {
    if (this.feedbackElement) this.feedbackElement.textContent = '';
  }
}
