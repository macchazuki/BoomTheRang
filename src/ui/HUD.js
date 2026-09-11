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

  /** Show manual MISS/HIT/critical-tier feedback and awarded XP. */
  showPlayerResult({ result, awardedXp, targetCount = 1, reducedMotion = false }) {
    if (!this.feedbackElement) return;

    const labels = {
      CRITICAL: 'CRITICAL!',
      MEGA_CRITICAL: 'MEGA CRIT!',
      ULTRA_CRITICAL: 'ULTRA CRIT!',
      OMEGA_CRITICAL: 'OMEGA CRIT!',
      HIT: 'HIT!',
      MISS: 'MISS',
    };
    const label = labels[result] ?? 'HIT!';
    const critical = result.includes('CRITICAL');
    this.feedbackElement.textContent = awardedXp > 0 ? `${label} +${awardedXp} XP` : label;

    if (result !== 'MISS') {
      this.scheduleComicImpacts({
        critical,
        targetCount,
        reducedMotion,
      });
    }
  }

  /** Show smaller independent dog feedback. */
  showDogResult({ critical, awardedXp, targetCount = 1, reducedMotion = false }) {
    if (!this.feedbackElement) return;
    this.feedbackElement.textContent = critical
      ? `GOOD BOY! +${awardedXp} XP`
      : `Dog +${awardedXp} XP`;
    this.scheduleComicImpacts({ critical, dog: true, targetCount, reducedMotion });
  }

  /**
   * Time one comic impact per target around the point where the boomerang crosses
   * the target chain. Multi-target hits therefore read as sequential impacts.
   */
  scheduleComicImpacts({ critical = false, dog = false, targetCount = 1, reducedMotion = false }) {
    const count = Math.max(1, Math.floor(targetCount));
    const centerDelayMs = reducedMotion ? 90 : dog ? 290 : 310;
    const spacingMs = reducedMotion ? 20 : 48;
    const firstDelayMs = centerDelayMs - ((count - 1) * spacingMs) / 2;

    for (let index = 0; index < count; index += 1) {
      setTimeout(() => this.showComicImpact({ critical, dog }), firstDelayMs + index * spacingMs);
    }
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

    setTimeout(() => callout.remove(), 650);

    if (critical && document.documentElement.dataset.screenShake !== 'off') {
      this.canvasHost.classList.remove('comic-shake');
      void this.canvasHost.offsetWidth;
      this.canvasHost.classList.add('comic-shake');
      setTimeout(() => this.canvasHost?.classList.remove('comic-shake'), 240);
    }
  }

  /** Clear temporary feedback when desired by final visual implementation. */
  clearFeedback() {
    if (this.feedbackElement) this.feedbackElement.textContent = '';
  }
}
