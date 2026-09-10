# Ticket 02 — Complete Gameplay State Machine and Input Flow

**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** Ticket 01

## Goal

Make the manual timing loop reliable end-to-end: READY → throw → success recovery or miss reload → READY, with exactly one accepted outcome per legal player tap.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/01_GAME_DESIGN.md`
- `documents/04_ARCHITECTURE.md`
- `documents/05_MOBILE_UI_AND_SCENE.md`
- `documents/07_TEST_PLAN.md`

## Primary files

- `src/gameplay/GameController.js`
- `src/gameplay/GameController.test.js`
- `src/gameplay/GaugeController.js`
- `src/gameplay/ThrowController.js`
- `src/app/GameApp.js`
- `src/scenes/GameScene.js`
- `src/ui/HUD.js`
- `src/ui/GaugeView.js`
- `src/tests/gameplayFlow.test.js`

## Required work

Verify and complete:
- gameplay starts in `READY`;
- the gauge runs only when the current state permits it;
- a legal pointer freezes/classifies the gauge exactly once;
- all player boomerangs share the one result from that tap;
- green/white success enters `PLAYER_THROW`;
- success recovery lasts the configured ~0.7 s before returning to `READY`;
- miss enters `MISS_RELOAD`, awards 0 XP, resets combo, and uses the currently derived reload duration;
- taps during `PLAYER_THROW`, `MISS_RELOAD`, `PAUSED`, or blocked modal interaction cannot create another player result;
- reload countdown is shown from authoritative timer state;
- returning to ready consistently resets the gauge from the edge;
- rapid/repeated pointer events cannot double-award XP;
- Skills and Settings controls consume the pointer and never also trigger a throw;
- gameplay pause preserves the explicit pre-pause state and does not inject elapsed catch-up time.

Harden any lifecycle edge cases discovered while testing, but do not move rendering responsibilities into `GameController`.

## Tests to convert from TODO

At minimum cover:
- miss enters reload and ignores taps;
- 5 / 4.5 / 4 / 3 / 2 second reload values;
- one tap produces one shared result for all player boomerangs;
- successful recovery returns to READY;
- dog callbacks do not mutate the manual state/combo;
- white 1×1 award integration;
- Twin Throw reward integration;
- Twin Throw + Second Dummy = 4 rewarded hits;
- red = 0 XP + input lock.

Use fakes/stubs for views where possible; do not require a real WebGL renderer for controller tests.

## Constraints

- Pointer Events remain the single manual gameplay input path.
- Explicit states remain authoritative; never infer readiness from animation.
- Timers use elapsed seconds, never frame counts.
- No art work.

## Acceptance criteria

- One accepted player pointer causes exactly one reward-resolution attempt.
- Miss input remains locked until the cooldown reaches zero.
- Successful throw returns to ready at the expected recovery time.
- Opening/closing gameplay overlays cannot accidentally fire a throw.
- Relevant `GameController.test.js` and integration TODOs are real passing tests.
- `npm test` passes.
- `npm run build` passes.
