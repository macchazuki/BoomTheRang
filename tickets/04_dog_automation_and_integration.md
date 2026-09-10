# Ticket 04 — Complete Dog Automation and Integration

**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** Tickets 01 and 03

## Goal

Make the dog companion a fully functioning independent automation path, including all upgrades, rewards, pause behavior, Fetch Mastery criticals, and gameplay integration.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/01_GAME_DESIGN.md`
- `documents/02_UPGRADE_TREE.md`
- `documents/04_ARCHITECTURE.md`
- `documents/07_TEST_PLAN.md`

## Primary files

- `src/gameplay/DogController.js`
- `src/gameplay/DogController.test.js`
- `src/gameplay/GameController.js`
- `src/gameplay/RewardCalculator.js`
- `src/gameplay/ThrowController.js`
- `src/progression/ProgressionManager.js`
- `src/entities/DogView.js`
- `src/scenes/GameScene.js`
- `src/ui/HUD.js`
- `src/tests/gameplayFlow.test.js`

## Required work

Verify and complete:
- no automatic throws before Dog Companion;
- base dog interval = 10 s;
- Fast Fetch progression = 10 → 8 → 6 → 4 s;
- Dog Training XP factor = 25% → 40% → 60% → 100%;
- dog always hits every currently unlocked target;
- global Training multiplier applies;
- player combo, player critical multiplier, and Boomerang Mastery do not apply;
- Fetch Mastery adds independent 10% critical chance using injectable RNG;
- dog critical doubles dog XP and emits `GOOD BOY!` feedback;
- dog throw never changes player combo or manual gameplay state;
- dog timer pauses with menus/background/final challenge;
- resume does not produce catch-up/offline throws;
- interval reconfiguration cannot create accidental immediate bursts;
- dog throws remain non-blocking relative to a player throw/reload.

Implement the minimal procedural DogView/GameScene hook required to visibly indicate a dog throw and critical result, but do not create or replace art assets. Ticket 06 owns the broader animation polish.

## Tests to convert from TODO

Implement all `DogController.test.js` cases and the dog integration cases in `src/tests/gameplayFlow.test.js`.

Use fake time/delta advancement rather than wall-clock waits.

## Constraints

- Dog timing belongs in `DogController`.
- Reward formulas stay in `RewardCalculator`.
- No offline XP.
- No collisions for rewards.
- No dog art/model asset work.

## Acceptance criteria

- Dog behavior exactly matches the 10/8/6/4 s and 25/40/60/100% progressions.
- Injected RNG can deterministically force/no-force Fetch Mastery crits.
- Pausing for a long time and resuming grants zero catch-up throws.
- Dog rewards can occur during normal manual play without corrupting player state.
- All dog TODO tests are real passing tests.
- `npm test` passes.
- `npm run build` passes.
