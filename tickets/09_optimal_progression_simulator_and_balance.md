# Ticket 09 — Implement Optimal Progression Simulator and Tune Balance

**Priority:** P0  
**Complexity:** Large  
**Dependencies:** Tickets 01, 03, and 04

## Goal

Implement the deterministic logical-time progression simulator and use it to replace placeholder late-game costs with a verified ~5-hour optimal progression curve.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/01_GAME_DESIGN.md`
- `documents/02_UPGRADE_TREE.md`
- `documents/03_PROGRESSION_BALANCE.md`
- `documents/07_TEST_PLAN.md`

## Primary files

- `src/progression/optimalProgressionSimulator.js`
- `src/progression/optimalProgression.test.js`
- `src/progression/balance.js`
- `src/progression/upgradeDefinitions.js`
- `src/progression/ProgressionManager.js`
- `src/gameplay/RewardCalculator.js`
- `src/gameplay/DogController.js`

## Current state

`simulateOptimalProgression(...)` currently returns `implemented: false`, empty milestones, and a TODO note. `balance.js` explicitly labels later upgrade costs as placeholders.

## Simulator requirements

Run purely in logical time; do not depend on RAF, DOM, WebGL, `setTimeout`, or real wall-clock delays.

Model:
- every manual throw lands white;
- each next manual attempt begins from the edge;
- actual configured gauge one-way duration and current white width determine perfect wait time;
- success recovery is included;
- player reward uses the same production reward formula/effects;
- dog operates after unlock using the current interval and reward factor;
- dog Fetch Mastery expected/seeded behavior is handled deterministically;
- purchases follow a clearly defined progression-optimal route/policy;
- purchase prerequisites and real production costs are respected;
- spendable XP is deducted;
- lifetime XP remains cumulative;
- milestone acquisition times and purchase history are reported.

Do not copy/paste separate reward or upgrade-effect formulas into the simulator if production functions can be reused safely.

## Route/policy review

The scaffold's `DEFAULT_OPTIMAL_ROUTE` is provisional. Re-evaluate it against the full upgrade graph and actual XP/min benefit. Perfect-play assistance upgrades may be skipped except where prerequisites require them, but XP-producing upgrades should be considered when they improve the optimal completion path.

Document the final route/policy in code so balance changes remain reproducible.

## Required timing assertions

Using optimal active play:
- Better Training I: ~1 min ±20 s;
- Twin Throw: ~30 min ±3 min;
- Second Dummy: ~45 min ±4 min;
- Grandmaster/final completion path: ~300 min ±20 min;
- important purchase gaps should generally trend upward;
- Dog Companion should land roughly around the intended ~60–65 min region unless a documented tuning trade-off is required;
- fully upgraded dog earnings must remain below optimal manual player earnings;
- white timing remains the highest optimal active XP/min choice.

Also report useful intermediate milestones from the handover (Triple Throw, Third Dummy, Combo, Quad Throw, Fourth Dummy) to catch curve regressions.

## Balance tuning

Tune only centralized values in `balance.js` unless a genuine gameplay defect is discovered.

Replace placeholder late-game costs with simulator-backed values. Keep:
- first upgrade approachable;
- Twin Throw as the first transformative multiplier;
- Second Dummy strongly synergistic with Twin Throw;
- dog supplemental rather than dominant;
- later important purchases progressively farther apart.

## Tests to convert from TODO

Implement every `optimalProgression.test.js` contract as deterministic tests. Include tolerances from `03_PROGRESSION_BALANCE.md` rather than asserting exact seconds where unnecessary.

## Acceptance criteria

- `simulateOptimalProgression()` returns a real report, not `implemented: false`.
- All four required timing anchors pass.
- The simulator is fast enough to run in the normal Vitest suite.
- Late-game costs are no longer marked as unverified placeholders.
- Fully upgraded dog remains below optimal manual earnings.
- Balance tests are deterministic across runs.
- `npm test` passes.
- `npm run build` passes.
