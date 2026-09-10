# Ticket 01 — Complete Core Gameplay Logic and Unit Tests

**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** None

## Goal

Turn the existing core timing/reward scaffold into verified deterministic gameplay logic. Keep this ticket DOM- and Three.js-independent.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/01_GAME_DESIGN.md`
- `documents/03_PROGRESSION_BALANCE.md`
- `documents/07_TEST_PLAN.md`

## Primary files

- `src/gameplay/GaugeController.js`
- `src/gameplay/GaugeController.test.js`
- `src/gameplay/RewardCalculator.js`
- `src/gameplay/RewardCalculator.test.js`
- `src/gameplay/ThrowController.js`
- `src/gameplay/GameState.js`
- `src/progression/balance.js`
- `src/tests/helpers.js`

## Current state

The core classes already contain preliminary implementations, but their main contract tests are still `it.todo(...)`. Treat the implementation as unverified until the real tests exercise it.

## Required work

Implement/fix the smallest amount of production logic needed to satisfy the handover contracts, then replace the relevant TODO tests with real deterministic tests.

Verify:
- normalized gauge motion uses elapsed seconds;
- the marker reflects correctly at both edges, including large-but-valid deltas;
- default zone widths are 70% red / 25% green / 5% white;
- exact white boundaries classify as critical and exact green boundaries classify as hit;
- configured zone widths are non-negative and total exactly 1 within a safe tolerance;
- miss reward is zero;
- green reward is base XP;
- white reward uses the current critical multiplier;
- player reward applies `boomerangCount × targetCount` exactly once;
- global Training multiplier applies to both player and dog;
- player combo and Boomerang Mastery do not affect dog rewards;
- final XP is rounded once after all multipliers;
- green adds one combo step, white adds two, miss resets combo;
- combo bonus caps at +20% normally and +50% with mastery;
- logical throw resolution returns the correct target chain and rewarded hit count;
- `GameState.addXp()` updates spendable/lifetime XP and source statistics consistently;
- spending XP never reduces lifetime XP.

## Constraints

- Gameplay results must never depend on DOM pixels or Three.js collisions.
- Do not add a physics/collision system.
- Do not add a new state-management layer.
- Keep tuneable constants in `src/progression/balance.js`.
- No art work.

## Acceptance criteria

- `GaugeController.test.js` contains no remaining required `it.todo(...)` cases.
- `RewardCalculator.test.js` contains no remaining required `it.todo(...)` cases.
- Core tests cover exact zone boundaries and reward rounding edge cases.
- A 2-boomerang × 2-target successful throw resolves exactly 4 rewarded target hits.
- Pure gameplay tests run without needing WebGL or browser rendering.
- `npm test` passes.
- `npm run build` passes.
