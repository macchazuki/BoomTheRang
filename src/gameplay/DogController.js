import { BALANCE } from '../progression/balance.js';

/**
 * Owns dog automatic throw timing only.
 * Reward formulas and visuals are delegated elsewhere.
 */
export class DogController {
  constructor({ onThrow, rng = Math.random } = {}) {
    this.onThrow = onThrow ?? (() => {});
    this.rng = rng;

    this.unlocked = false;
    this.paused = true;
    this.intervalSeconds = BALANCE.dogBaseIntervalSeconds;
    this.criticalChance = 0;
    this.elapsedSeconds = 0;
  }

  /** Apply current progression-derived dog timing and critical chance. */
  configure({ unlocked, intervalSeconds, criticalChance }) {
    const nextIntervalSeconds = Math.max(
      BALANCE.dogMinimumIntervalSeconds,
      intervalSeconds,
    );
    const timingChanged = this.unlocked !== unlocked || this.intervalSeconds !== nextIntervalSeconds;

    this.unlocked = unlocked;
    this.intervalSeconds = nextIntervalSeconds;
    this.criticalChance = Math.max(0, Math.min(1, criticalChance));

    // Unlocking or changing Fast Fetch starts a fresh interval. This prevents
    // a smaller interval from converting old elapsed time into an immediate burst.
    if (!unlocked || timingChanged) {
      this.elapsedSeconds = 0;
    }
  }

  /** Resume future timer accumulation; no catch-up time is injected. */
  resume() {
    this.paused = false;
  }

  /** Freeze automatic timer exactly where it is. */
  pause() {
    this.paused = true;
  }

  /**
   * Advance dog timer.
   * At most one throw may happen per update, so a large delta can never create
   * catch-up/offline bursts across subsequent frames.
   */
  update(deltaSeconds) {
    if (!this.unlocked || this.paused || deltaSeconds <= 0) return;

    const elapsedSeconds = this.elapsedSeconds + deltaSeconds;
    if (elapsedSeconds < this.intervalSeconds) {
      this.elapsedSeconds = elapsedSeconds;
      return;
    }

    // Preserve only the fractional progress toward the next interval while
    // intentionally dropping any additional intervals crossed by a large delta.
    this.elapsedSeconds = elapsedSeconds % this.intervalSeconds;
    this.onThrow({
      critical: this.rollCritical(),
    });
  }

  /** Injectable RNG makes Fetch Mastery deterministic in tests. */
  rollCritical() {
    return this.criticalChance > 0 && this.rng() < this.criticalChance;
  }

  /** Clear cooldown when starting a fresh run/session composition. */
  resetCooldown() {
    this.elapsedSeconds = 0;
  }

  /** Seconds until next automatic throw for optional UI. */
  getRemainingSeconds() {
    return Math.max(0, this.intervalSeconds - this.elapsedSeconds);
  }
}
