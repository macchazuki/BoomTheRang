/**
 * Shared project constants and tiny framework-free utilities.
 * Keep this module small; domain-specific values belong in progression/balance.js.
 */

export const GAME_NAME = 'BoomTheRang';

/**
 * Clamp a number into an inclusive range.
 */
export function clamp(value, minimum, maximum) {
  if (minimum > maximum) {
    throw new RangeError('minimum must not be greater than maximum');
  }

  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Clamp frame delta after tab/app resume so timers do not catch up with a huge step.
 * The exact maximum may be tuned if animation needs differ.
 */
export function clampDeltaSeconds(deltaSeconds, maximum = 0.1) {
  return clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, maximum);
}

/**
 * Return a deep JSON-safe clone for save snapshots and test fixtures.
 * Saved state intentionally contains data only.
 */
export function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}
