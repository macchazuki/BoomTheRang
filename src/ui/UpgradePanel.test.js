import { describe, expect, it } from 'vitest';
import { UPGRADE_DEFINITIONS } from '../progression/upgradeDefinitions.js';
import { getSkillNodePresentation, SKILL_CATEGORIES, SKILL_CATEGORY_BY_UPGRADE, SKILL_TREE_LAYOUT } from './UpgradePanel.js';

describe('UpgradePanel skill-tree presentation', () => {
  it('assigns every progression node to exactly one category and position', () => {
    const definitionIds = UPGRADE_DEFINITIONS.map((definition) => definition.id).sort();
    expect(Object.keys(SKILL_TREE_LAYOUT).sort()).toEqual(definitionIds);
    expect(Object.keys(SKILL_CATEGORY_BY_UPGRADE).sort()).toEqual(definitionIds);
    expect(SKILL_CATEGORIES.map((category) => category.id)).toEqual(['xp', 'criticals', 'precision', 'arsenal', 'pet']);

    for (const category of SKILL_CATEGORIES) {
      expect(category.skills).toContain(category.root);
    }
    for (const position of Object.values(SKILL_TREE_LAYOUT)) {
      expect(position.x).toBeGreaterThan(0);
      expect(position.y).toBeGreaterThan(0);
      expect(position.sigil.length).toBeGreaterThan(0);
    }
  });

  it('uses purchased and available states before locked affordability states', () => {
    expect(getSkillNodePresentation({ purchased: true, status: { ok: false, reason: 'ALREADY_PURCHASED' } })).toMatchObject({ className: 'purchased', label: 'Purchased' });
    expect(getSkillNodePresentation({ purchased: false, status: { ok: true, reason: null } })).toMatchObject({ className: 'available', label: 'Available' });
    expect(getSkillNodePresentation({ purchased: false, status: { ok: false, reason: 'INSUFFICIENT_XP' } })).toMatchObject({ className: 'insufficient-xp', label: 'Not enough XP' });
    expect(getSkillNodePresentation({ purchased: false, status: { ok: false, reason: 'PREREQUISITES' } })).toMatchObject({ className: 'locked', label: 'Locked' });
  });
});
