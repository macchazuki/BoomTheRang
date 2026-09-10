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
    this.unlocked = unlocked;
    this.intervalSeconds = Math.max(BALANCE.dogMinimumIntervalSeconds, intervalSeconds);
    this.criticalChance = Math.max(0, Math.min(1, criticalChance));
    if (!unlocked) this.elapsedSeconds = 0;
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
   * A clamped app delta means this never produces offline/catch-up bursts.
   */
  update(deltaSeconds) {
    if (!this.unlocked || this.paused || deltaSeconds <= 0) return;

    this.elapsedSeconds += deltaSeconds;

    if (this.elapsedSeconds >= this.intervalSeconds) {
      this.elapsedSeconds -= this.intervalSeconds;
      this.onThrow({
        critical: this.rollCritical(),
      });
    }
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
