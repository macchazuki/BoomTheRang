# Ticket 03 — Complete Progression and Full Upgrade Tree

**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** Ticket 01

## Goal

Verify and finish the complete data-driven v1 upgrade graph, purchase transaction rules, derived effects, and runtime/UI propagation. Do not tune final late-game prices in this ticket; Ticket 09 owns balance tuning.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/02_UPGRADE_TREE.md`
- `documents/03_PROGRESSION_BALANCE.md`
- `documents/04_ARCHITECTURE.md`
- `documents/07_TEST_PLAN.md`

## Primary files

- `src/progression/upgradeDefinitions.js`
- `src/progression/ProgressionManager.js`
- `src/progression/ProgressionManager.test.js`
- `src/progression/balance.js`
- `src/gameplay/GameState.js`
- `src/app/GameApp.js`
- `src/ui/UpgradePanel.js`
- `src/tests/gameplayFlow.test.js`

## Required work

Verify every upgrade definition, prerequisite, and derived effect against `02_UPGRADE_TREE.md`.

Required branches:
- Better Training I/II/III;
- Critical Training I/II and Critical Mastery;
- Quick Reload I/II/III and Recovery Mastery;
- Steady Hands I/II;
- Perfect Window I/II;
- Twin/Triple/Quad Throw;
- Second/Third/Fourth Dummy;
- Combo Training and Combo Mastery;
- Dog Companion, Dog Training I/II/III, Fast Fetch I/II/III, Fetch Mastery;
- Boomerang Mastery;
- Grandmaster unlock prerequisites.

Verify:
- unknown upgrade rejection;
- insufficient XP rejection;
- prerequisite rejection;
- optional lifetime-XP gate support;
- duplicate/max purchase rejection;
- successful purchase deducts spendable XP only;
- derived counts/multipliers update immediately after purchase/load;
- gauge precision upgrades always preserve a total width of 1;
- Perfect Window takes its extra width from green rather than changing total gauge size;
- runtime scene/gauge/dog state mirrors updated derived effects after purchase;
- upgrade panel clearly distinguishes purchased, available, insufficient-XP, and prerequisite-locked nodes without duplicating progression logic.

## Important boundary

`balance.js` remains the only owner of costs/gates. Late-game values currently marked as placeholders may remain provisional until Ticket 09.

Do not change the product tree to make balancing easier without a concrete spec conflict.

## Tests to convert from TODO

Implement the full `ProgressionManager.test.js` contract, including:
- affordability;
- prerequisites;
- lifetime XP invariance;
- duplicate purchase rejection;
- every derived effect;
- Twin Throw + Second Dummy;
- gauge width invariant.

Add a compact table-driven test over all upgrade IDs so missing/renamed cost entries or prerequisite IDs fail fast.

## Constraints

- Definitions remain data-driven.
- UI must not calculate purchase rules.
- Do not persist derived effects.
- No art work.

## Acceptance criteria

- Every upgrade in the handover exists exactly once with the correct prerequisites/effect.
- Purchasing upgrades immediately changes gameplay-derived values.
- All progression TODO tests are replaced by real tests.
- No upgrade cost is duplicated outside `balance.js`.
- `npm test` passes.
- `npm run build` passes.
