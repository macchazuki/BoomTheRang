# Ticket 08 — Complete Grandmaster Final Challenge and Completion Flow

**Priority:** P1  
**Complexity:** Medium  
**Dependencies:** Tickets 02, 03, 05, and 06

## Goal

Implement the final Grandmaster flow: purchasing the upgrade enters a special challenge, only a white-zone throw completes it, completion is saved, final statistics are shown, and normal play can continue afterward.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/01_GAME_DESIGN.md`
- `documents/02_UPGRADE_TREE.md`
- `documents/04_ARCHITECTURE.md`
- `documents/06_SAVE_DATA.md`
- `documents/07_TEST_PLAN.md`

## Primary files

- `src/gameplay/GameController.js`
- `src/gameplay/GameController.test.js`
- `src/app/GameApp.js`
- `src/scenes/GameScene.js`
- `src/ui/CompletionPanel.js`
- `src/persistence/SaveManager.js`
- `src/progression/ProgressionManager.js`

## Required work

Unlock/entry:
- Grandmaster remains gated by Boomerang Mastery + Fetch Mastery + Fourth Dummy;
- purchasing Grandmaster initiates the final challenge exactly once when `gameCompleted` is false;
- entering the final challenge must not break modal pause semantics if Grandmaster was purchased while the upgrade panel is open;
- gameplay must not continue ticking behind an open modal;
- dog automation pauses during the challenge.

Challenge:
- visually distinguish a special Grandmaster target using existing/procedural presentation only;
- gauge rules remain unchanged;
- red miss behaves as a miss/reload and does not complete;
- green hit does not complete;
- only a white/critical throw completes;
- repeated completion attempts cannot duplicate completion stats/saves/UI.

Completion:
- set `progression.gameCompleted = true`;
- save immediately;
- play the final multi-boomerang/dog procedural sequence;
- open completion statistics;
- show at least manual throws, criticals, misses, dog throws, longest combo, and active play time;
- allow `Continue Playing`;
- after continuing, return to normal gameplay and allow the dog again;
- reloading a completed save must not force the final challenge again.

## Important bug to guard against

The current scaffold can call `startFinalChallenge()` while the upgrade panel has paused the controller. Do not allow that transition to silently replace `PAUSED` and let active-play time/gauge updates run behind the still-open overlay. Queue/defer the challenge or otherwise preserve overlay pause ownership cleanly.

## Tests

Replace the existing Grandmaster TODO contract with real tests and add coverage for:
- red does not complete;
- green does not complete;
- white completes once;
- completion flag saves;
- completed save does not retrigger;
- Grandmaster purchase from an open upgrade modal does not unpause gameplay behind it;
- dog is paused during final challenge and resumes after continued play.

## Explicitly out of scope

- final Grandmaster target art;
- cutscene art;
- new celebration assets.

## Acceptance criteria

- Final challenge can be reached through the real progression state.
- Only a white result completes it.
- No modal/pause race permits hidden gameplay progression.
- Completion persists across reload.
- Continue Playing returns to a stable READY flow.
- Grandmaster tests pass.
- `npm test` passes.
- `npm run build` passes.
