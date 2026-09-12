import { describe, expect, it } from 'vitest';
import { UPGRADE_DEFINITIONS } from '../progression/upgradeDefinitions.js';
import {
  categoryHasPurchasableUpgrade,
  getUpgradeNodePresentation,
  UPGRADE_CATEGORIES,
  UPGRADE_CATEGORY_BY_UPGRADE,
  UPGRADE_TREE_LAYOUT,
} from './UpgradePanel.js';

describe('UpgradePanel upgrade-tree presentation', () => {
  it('assigns every progression upgrade to exactly one category and position', () => {
    const definitionIds = UPGRADE_DEFINITIONS.map((definition) => definition.id).sort();
    expect(Object.keys(UPGRADE_TREE_LAYOUT).sort()).toEqual(definitionIds);
    expect(Object.keys(UPGRADE_CATEGORY_BY_UPGRADE).sort()).toEqual(definitionIds);
    expect(UPGRADE_CATEGORIES.map((category) => category.id)).toEqual([
      'xp',
      'criticals',
      'precision',
      'arsenal',
      'pet',
    ]);

    for (const category of UPGRADE_CATEGORIES) {
      expect(category.upgrades).toContain(category.root);
    }
    for (const position of Object.values(UPGRADE_TREE_LAYOUT)) {
      expect(position.x).toBeGreaterThan(0);
      expect(position.y).toBeGreaterThan(0);
      expect(position.sigil.length).toBeGreaterThan(0);
    }
  });

  it('marks a category when at least one upgrade is currently purchasable', () => {
    const category = { upgrades: ['a', 'b'] };
    const progressionManager = {
      getPurchaseStatus(upgradeId) {
        return { ok: upgradeId === 'b' };
      },
    };

    expect(categoryHasPurchasableUpgrade(category, progressionManager)).toBe(true);
    expect(categoryHasPurchasableUpgrade({ upgrades: ['a'] }, progressionManager)).toBe(false);
  });

  it('uses purchased and available states before locked affordability states', () => {
    expect(
      getUpgradeNodePresentation({
        purchased: true,
        status: { ok: false, reason: 'ALREADY_PURCHASED' },
      }),
    ).toMatchObject({ className: 'purchased', label: 'Purchased' });
    expect(
      getUpgradeNodePresentation({ purchased: false, status: { ok: true, reason: null } }),
    ).toMatchObject({ className: 'available', label: 'Available' });
    expect(
      getUpgradeNodePresentation({
        purchased: false,
        status: { ok: false, reason: 'INSUFFICIENT_XP' },
      }),
    ).toMatchObject({ className: 'insufficient-xp', label: 'Not enough XP' });
    expect(
      getUpgradeNodePresentation({
        purchased: false,
        status: { ok: false, reason: 'PREREQUISITES' },
      }),
    ).toMatchObject({ className: 'locked', label: 'Locked' });
  });
});
