export const GAME_NAME = 'BoomTheRang';

export function clamp(value, minimum, maximum) {
  if (minimum > maximum) {
    throw new RangeError('minimum must not be greater than maximum');
  }

  return Math.min(maximum, Math.max(minimum, value));
}
