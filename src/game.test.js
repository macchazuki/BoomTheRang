import { describe, expect, it } from 'vitest';
import { clamp } from './game.js';

describe('clamp', () => {
  it('keeps values inside the requested range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('limits values below and above the range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('rejects an inverted range', () => {
    expect(() => clamp(5, 10, 0)).toThrow(RangeError);
  });
});
