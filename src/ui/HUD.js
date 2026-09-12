/**
 * DOM-only HUD: XP, combo, challenge score, target health, and temporary feedback.
 */
export class HUD {
  constructor({ mountElement }) {
    this.mountElement = mountElement;
    this.gameScreen = this.mountElement.closest?.('.game-screen') ?? null;
    this.feedbackElement = this.gameScreen?.querySelector?.('[data-feedback]') ?? null;
    this.canvasHost = this.gameScreen?.querySelector?.('[data-canvas-host]') ?? null;
    this.impactIndex = 0;
    this.targetStatusLayer = null;
    this.targetStatusElements = [];
    this.pendingDamageBatches = [];
    this.handleBoomerangImpact = (event) => this.handleImpact(event?.detail ?? {});
    this.canvasHost?.addEventListener?.('boomerangimpact', this.handleBoomerangImpact);
  }

  /** Render always-visible state from authoritative models. */
  render({ xp, combo, comboUnlocked, reloadRemainingSeconds, state, challengeHits = null, gaugeOneWaySeconds = null }) {
    const challengeMarkup = Number.isFinite(challengeHits)
      ? `<span class="hud__combo">Hits: ${Math.floor(challengeHits)} · Gauge: ${Number(gaugeOneWaySeconds).toFixed(2)}s</span>`
      : '';
    const comboMarkup = challengeMarkup || (comboUnlocked
      ? `<span class="hud__combo">Combo: ${combo}</span>`
      : '');
    const reloadMarkup = state === 'MISS_RELOAD'
      ? `<span class="hud__reload">Reload: ${reloadRemainingSeconds.toFixed(1)}s</span>`
      : '';

    this.mountElement.innerHTML = `
      <span class="hud__xp">XP: ${Math.floor(xp).toLocaleString()}</span>
      ${comboMarkup}
      ${reloadMarkup}
    `;
  }

  ensureTargetStatusElements(count) {
    if (!this.canvasHost || typeof document === 'undefined') return;

    if (!this.targetStatusLayer) {
      this.targetStatusLayer = document.createElement('div');
      this.targetStatusLayer.className = 'target-status-layer';
      this.targetStatusLayer.setAttribute('role', 'group');
      this.targetStatusLayer.setAttribute('aria-label', 'Target health');
      this.canvasHost.append(this.targetStatusLayer);
    }

    if (this.targetStatusElements.length === count) return;

    this.targetStatusLayer.replaceChildren();
    this.targetStatusLayer.dataset.targetCount = String(count);
    this.targetStatusElements = Array.from({ length: count }, (_, index) => {
      const status = document.createElement('div');
      status.className = 'target-status';
      status.dataset.targetIndex = String(index);
      status.innerHTML = `
        <div class="target-status__bar" aria-hidden="true">
          <div class="target-status__fill"></div>
        </div>
        <span class="target-status__value"></span>
      `;
      this.targetStatusLayer.append(status);
      return status;
    });
  }

  /** Mirror authoritative target HP above each target formation slot. */
  renderTargetHealth({ currentHp, maxHp }) {
    const hitPoints = Array.isArray(currentHp) ? currentHp : [];
    this.ensureTargetStatusElements(hitPoints.length);
    if (!this.targetStatusLayer) return;

    this.targetStatusLayer.dataset.targetCount = String(hitPoints.length);
    this.targetStatusElements.forEach((status, index) => {
      const hp = Math.max(0, Math.floor(Number(hitPoints[index]) || 0));
      const maximum = Math.max(1, Math.floor(Number(maxHp) || 1));
      const ratio = Math.max(0, Math.min(1, hp / maximum));
      const fill = status.querySelector('.target-status__fill');
      const value = status.querySelector('.target-status__value');
      if (fill) fill.style.width = `${ratio * 100}%`;
      if (value) value.textContent = `${hp.toLocaleString()} HP`;
      status.setAttribute(
        'aria-label',
        `Target ${index + 1} HP: ${hp.toLocaleString()} of ${maximum.toLocaleString()}`,
      );
    });
  }

  /** Queue damage numbers until the rendered boomerang actually reaches each target. */
  showTargetDamage({ damages, critical = false, reducedMotion = false }) {
    const values = Array.isArray(damages) ? damages : [];
    this.ensureTargetStatusElements(values.length);
    this.pendingDamageBatches.push({
      damages: values.map((damage) => Math.max(0, Math.floor(Number(damage) || 0))),
      critical,
      reducedMotion,
      source: null,
      consumedTargets: new Set(),
    });
  }

  markLatestDamageSource(source) {
    for (let index = this.pendingDamageBatches.length - 1; index >= 0; index -= 1) {
      const batch = this.pendingDamageBatches[index];
      if (batch.source === null) {
        batch.source = source;
        return;
      }
    }
  }

  showTargetDamageAt(targetIndex, damage, { critical = false, reducedMotion = false } = {}) {
    if (typeof document === 'undefined') return;
    const amount = Math.max(0, Math.floor(Number(damage) || 0));
    if (amount <= 0) return;
    const status = this.targetStatusElements[targetIndex];
    if (!status) return;

    const popup = document.createElement('span');
    popup.className = `target-damage${critical ? ' target-damage--critical' : ''}${reducedMotion ? ' target-damage--reduced-motion' : ''}`;
    popup.textContent = `-${amount.toLocaleString()}`;
    popup.setAttribute('aria-hidden', 'true');
    status.append(popup);
    setTimeout(() => popup.remove(), reducedMotion ? 260 : 720);
  }

  handleImpact({ targetIndex = 0, result = 'HIT', dog = false, reducedMotion = false } = {}) {
    const source = dog ? 'dog' : 'player';
    const batchIndex = this.pendingDamageBatches.findIndex((batch) => (
      batch.source === source && !batch.consumedTargets.has(targetIndex)
    ));

    if (batchIndex >= 0) {
      const batch = this.pendingDamageBatches[batchIndex];
      this.showTargetDamageAt(targetIndex, batch.damages[targetIndex], {
        critical: batch.critical,
        reducedMotion: batch.reducedMotion,
      });
      batch.consumedTargets.add(targetIndex);
      if (batch.consumedTargets.size >= batch.damages.length) {
        this.pendingDamageBatches.splice(batchIndex, 1);
      }
    }

    this.showComicImpact({
      critical: String(result).includes('CRITICAL'),
      dog,
      reducedMotion,
    });
  }

  /** Show manual MISS/HIT/critical-tier feedback and awarded XP. */
  showPlayerResult({ result, awardedXp }) {
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
    this.feedbackElement.textContent = awardedXp > 0 ? `${label} +${awardedXp} XP` : label;
    if (result !== 'MISS') this.markLatestDamageSource('player');
  }

  /** Show smaller independent dog feedback. */
  showDogResult({ critical, awardedXp }) {
    if (!this.feedbackElement) return;
    this.feedbackElement.textContent = critical
      ? `GOOD BOY! +${awardedXp} XP`
      : `Dog +${awardedXp} XP`;
    this.markLatestDamageSource('dog');
  }

  /** Spawn a short comic-book impact word over the target area. */
  showComicImpact({ critical = false, dog = false } = {}) {
    if (!this.canvasHost || typeof document === 'undefined') return;

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
