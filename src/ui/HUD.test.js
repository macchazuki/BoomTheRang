import { describe, expect, it, vi } from 'vitest';
import { HUD } from './HUD.js';

function createHudFixture() {
  const feedback = { textContent: '' };
  let impactHandler = null;
  const canvasHost = {
    addEventListener: vi.fn((type, handler) => {
      if (type === 'boomerangimpact') impactHandler = handler;
    }),
  };
  const gameScreen = {
    querySelector: (selector) => {
      if (selector === '[data-feedback]') return feedback;
      if (selector === '[data-canvas-host]') return canvasHost;
      return null;
    },
  };
  const mountElement = {
    innerHTML: '',
    closest: (selector) => (selector === '.game-screen' ? gameScreen : null),
  };

  return {
    hud: new HUD({ mountElement }),
    mountElement,
    feedback,
    canvasHost,
    dispatchImpact: (detail) => impactHandler?.({ detail }),
  };
}

describe('HUD mobile/accessibility presentation', () => {
  it('keeps XP visible while hiding combo until it is unlocked', () => {
    const { hud, mountElement } = createHudFixture();

    hud.render({
      xp: 1234,
      combo: 7,
      comboUnlocked: false,
      reloadRemainingSeconds: 0,
      state: 'READY',
    });

    expect(mountElement.innerHTML).toMatch(/XP:\s*1,?234/);
    expect(mountElement.innerHTML).not.toContain('Combo:');
  });

  it('shows combo after unlock and a readable reload countdown during misses', () => {
    const { hud, mountElement } = createHudFixture();

    hud.render({
      xp: 25,
      combo: 3,
      comboUnlocked: true,
      reloadRemainingSeconds: 4.26,
      state: 'MISS_RELOAD',
    });

    expect(mountElement.innerHTML).toContain('Combo: 3');
    expect(mountElement.innerHTML).toContain('Reload: 4.3s');
  });

  it('writes result feedback only to the owning game screen', () => {
    const { hud, feedback } = createHudFixture();

    hud.showPlayerResult({ result: 'CRITICAL', awardedXp: 40 });
    expect(feedback.textContent).toBe('CRITICAL! +40 XP');

    hud.showPlayerResult({ result: 'OMEGA_CRITICAL', awardedXp: 100 });
    expect(feedback.textContent).toBe('OMEGA CRIT! +100 XP');

    hud.showDogResult({ critical: true, awardedXp: 12 });
    expect(feedback.textContent).toBe('GOOD BOY! +12 XP');
  });

  it('waits for the exact player impact event before damage popup, comic text, and shake', () => {
    const { hud, dispatchImpact } = createHudFixture();
    hud.showTargetDamageAt = vi.fn();
    hud.showComicImpact = vi.fn();

    hud.showTargetDamage({ damages: [40], critical: true, reducedMotion: false });
    hud.showPlayerResult({ result: 'CRITICAL', awardedXp: 40 });

    expect(hud.showTargetDamageAt).not.toHaveBeenCalled();
    expect(hud.showComicImpact).not.toHaveBeenCalled();

    dispatchImpact({ targetIndex: 0, result: 'CRITICAL', dog: false, reducedMotion: false });

    expect(hud.showTargetDamageAt).toHaveBeenCalledWith(0, 40, {
      critical: true,
      reducedMotion: false,
    });
    expect(hud.showComicImpact).toHaveBeenCalledWith({
      critical: true,
      dog: false,
      reducedMotion: false,
    });
  });

  it('keeps dog damage and comic feedback tied to the dog boomerang impact', () => {
    const { hud, dispatchImpact } = createHudFixture();
    hud.showTargetDamageAt = vi.fn();
    hud.showComicImpact = vi.fn();

    hud.showTargetDamage({ damages: [12], critical: true, reducedMotion: false });
    hud.showDogResult({ critical: true, awardedXp: 12 });

    expect(hud.showTargetDamageAt).not.toHaveBeenCalled();
    expect(hud.showComicImpact).not.toHaveBeenCalled();

    dispatchImpact({ targetIndex: 0, result: 'CRITICAL', dog: true, reducedMotion: false });

    expect(hud.showTargetDamageAt).toHaveBeenCalledWith(0, 12, {
      critical: true,
      reducedMotion: false,
    });
    expect(hud.showComicImpact).toHaveBeenCalledWith({
      critical: true,
      dog: true,
      reducedMotion: false,
    });
  });
});
