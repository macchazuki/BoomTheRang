import { describe, expect, it } from 'vitest';
import { HUD } from './HUD.js';

function createHudFixture() {
  const feedback = { textContent: '' };
  const gameScreen = {
    querySelector: (selector) => (selector === '[data-feedback]' ? feedback : null),
  };
  const mountElement = {
    innerHTML: '',
    closest: (selector) => (selector === '.game-screen' ? gameScreen : null),
  };

  return { hud: new HUD({ mountElement }), mountElement, feedback };
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
    expect(feedback.textContent).toBe('PERFECT! +40 XP');

    hud.showDogResult({ critical: true, awardedXp: 12 });
    expect(feedback.textContent).toBe('GOOD BOY! +12 XP');
  });
});
