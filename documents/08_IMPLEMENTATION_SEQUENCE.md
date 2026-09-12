# Recommended Implementation Sequence

Implement in vertical slices. Each phase should leave tests passing.

## Phase 1 — Core timing loop

Explore first:
- `src/main.js`
- `src/game.js`
- `src/game.test.js`
- `index.html`
- `src/style.css`

Create:
- `progression/balance.js`
- `gameplay/GameState.js`
- `gameplay/GaugeController.js`
- `gameplay/RewardCalculator.js`
- `gameplay/GameController.js`

Deliver:
- portrait gameplay screen
- moving gauge
- tap classification
- red/green/white logic
- XP counter
- miss reload

Acceptance:
- logic tests pass
- first functional loop works without 3D collision logic

## Phase 2 — Three.js presentation

Create:
- `scenes/GameScene.js`
- entity view classes
- `ui/GaugeView.js`
- `ui/HUD.js`

Deliver:
- orthographic portrait scene
- player bottom
- exactly one target dummy at the top
- boomerang hit/miss/return paths
- hit/critical/miss feedback

Acceptance:
- gameplay outcome is computed before animation
- visuals never own reward logic
- normal play never renders additional target dummies

## Phase 3 — Progression system

Create:
- `progression/upgradeDefinitions.js`
- `progression/ProgressionManager.js`
- `ui/UpgradePanel.js`

Implement:
- XP spending
- prerequisites
- Training
- Precision/Recovery
- Twin Throw
- Combo Training

Acceptance:
- Twin Throw creates two independent boomerang opportunities against the same target
- target count remains `1`
- no target-count skills exist

## Phase 4 — Dog

Create:
- `gameplay/DogController.js`
- `entities/DogView.js`

Implement:
- Dog Companion
- independent automatic throw
- Dog Training
- Fast Fetch
- Fetch Mastery critical

Acceptance:
- dog timer never blocks player input
- no offline/catch-up rewards
- dog always resolves against the single target

## Phase 5 — Mid/late progression

Implement:
- Triple/Quad Throw
- later Critical upgrades
- Combo Training/Mastery
- Boomerang Mastery
- remaining dog ranks

Acceptance:
- scene remains readable with 4 player boomerangs against one target
- combo counted from resolved player presses only
- dog remains supplemental to perfect active play
- no skill depends on removed target-count IDs

## Phase 6 — Persistence/settings

Create:
- `persistence/SaveManager.js`
- `ui/SettingsPanel.js`

Implement:
- localStorage schema
- autosave
- reload/load
- settings
- visibility handling

Acceptance:
- save corruption cannot prevent startup
- removed target-count upgrade IDs in older saves are discarded safely
- no offline XP
- current upgrade state restores correctly

## Phase 7 — Balance + final challenge

Tune only centralized balance constants/costs.

Implement:
- optimal progression simulation
- timing targets
- Grandmaster final target/white-hit requirement
- completion statistics panel

Acceptance:
- early upgrades retain fast pacing
- boomerang progression stays ordered
- target count remains `1` at full progression
- later progression gaps trend longer
- all tests/build pass

## Agent handoff rule

An implementation agent should not scan the whole repository by default.

For each task:
1. Read `00_README.md`.
2. Read only the relevant spec file above.
3. Read current `AGENTS.md` if present.
4. Inspect the listed current source files plus direct imports/dependents.
5. Implement and test only that phase/scope.
6. Update tests together with behavior.
