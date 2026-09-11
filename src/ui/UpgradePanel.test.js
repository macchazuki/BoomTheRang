import { describe, expect, it } from 'vitest';
import { UPGRADE_DEFINITIONS } from '../progression/upgradeDefinitions.js';
import { getSkillNodePresentation, SKILL_TREE_LAYOUT } from './UpgradePanel.js';

describe('UpgradePanel skill-tree presentation', () => {
  it('assigns a presentation position to every progression node', () => {
    const definitionIds = UPGRADE_DEFINITIONS.map((definition) => definition.id).sort();
    const layoutIds = Object.keys(SKILL_TREE_LAYOUT).sort();

    expect(layoutIds).toEqual(definitionIds);

    for (const position of Object.values(SKILL_TREE_LAYOUT)) {
      expect(position.x).toBeGreaterThan(0);
      expect(position.y).toBeGreaterThan(0);
      expect(position.sigil.length).toBeGreaterThan(0);
    }
  });

  it('uses purchased and available states before locked affordability states', () => {
    expect(
      getSkillNodePresentation({ purchased: true, status: { ok: false, reason: 'ALREADY_PURCHASED' } }),
    ).toMatchObject({ className: 'purchased', label: 'Purchased' });

    expect(getSkillNodePresentation({ purchased: false, status: { ok: true, reason: null } })).toMatchObject({
      className: 'available',
      label: 'Available',
    });

    expect(
      getSkillNodePresentation({ purchased: false, status: { ok: false, reason: 'INSUFFICIENT_XP' } }),
    ).toMatchObject({ className: 'insufficient-xp', label: 'Not enough XP' });

    expect(
      getSkillNodePresentation({ purchased: false, status: { ok: false, reason: 'PREREQUISITES' } }),
    ).toMatchObject({ className: 'locked', label: 'Locked' });
  });
});
