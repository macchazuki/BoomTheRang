import { describe, expect, it, vi } from 'vitest';
import { DogController } from './DogController.js';

function createDog({ rng = () => 1 } = {}) {
  const onThrow = vi.fn();
  const controller = new DogController({ onThrow, rng });
  controller.resume();
  return { controller, onThrow };
}

function configure(controller, intervalSeconds = 10, criticalChance = 0) {
  controller.configure({
    unlocked: true,
    intervalSeconds,
    criticalChance,
  });
}

describe('DogController contract', () => {
  it('does not throw before Dog Companion unlock', () => {
    const { controller, onThrow } = createDog();

    controller.update(100);

    expect(onThrow).not.toHaveBeenCalled();
    expect(controller.getRemainingSeconds()).toBe(10);
  });

  it('uses 10/8/6/4 second intervals without reconfiguration bursts', () => {
    const { controller, onThrow } = createDog();

    for (const intervalSeconds of [10, 8, 6, 4]) {
      configure(controller, intervalSeconds);

      controller.update(intervalSeconds - 0.25);
      expect(onThrow).toHaveBeenCalledTimes([10, 8, 6, 4].indexOf(intervalSeconds));

      controller.update(0.25);
      expect(onThrow).toHaveBeenCalledTimes([10, 8, 6, 4].indexOf(intervalSeconds) + 1);
    }

    configure(controller, 10);
    controller.update(7.5);
    configure(controller, 4);
    controller.update(0.1);

    expect(onThrow).toHaveBeenCalledTimes(4);
    expect(controller.getRemainingSeconds()).toBeCloseTo(3.9);
  });

  it('supports injectable RNG for Fetch Mastery', () => {
    const rng = vi.fn().mockReturnValueOnce(0.099).mockReturnValueOnce(0.1);
    const { controller, onThrow } = createDog({ rng });
    configure(controller, 10, 0.1);

    controller.update(10);
    controller.update(10);

    expect(onThrow).toHaveBeenNthCalledWith(1, { critical: true });
    expect(onThrow).toHaveBeenNthCalledWith(2, { critical: false });
    expect(rng).toHaveBeenCalledTimes(2);
  });

  it('never catches up offline throws after resume', () => {
    const { controller, onThrow } = createDog();
    configure(controller, 10);

    controller.update(9);
    controller.pause();
    controller.update(60 * 60);
    controller.resume();

    expect(controller.getRemainingSeconds()).toBe(1);
    expect(onThrow).not.toHaveBeenCalled();

    controller.update(1);
    expect(onThrow).toHaveBeenCalledTimes(1);

    controller.resetCooldown();
    controller.update(25);
    expect(onThrow).toHaveBeenCalledTimes(2);

    controller.update(0.01);
    expect(onThrow).toHaveBeenCalledTimes(2);
  });

  it('pauses independently with gameplay pause', () => {
    const { controller, onThrow } = createDog();
    configure(controller, 4);

    controller.update(2);
    controller.pause();
    controller.update(4);

    expect(onThrow).not.toHaveBeenCalled();
    expect(controller.getRemainingSeconds()).toBe(2);

    controller.resume();
    controller.update(1.75);
    expect(onThrow).not.toHaveBeenCalled();

    controller.update(0.25);
    expect(onThrow).toHaveBeenCalledTimes(1);
  });
});
