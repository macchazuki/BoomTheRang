# BoomTheRang Function / Class Index

This is a navigation aid for implementation agents. Public responsibilities are also documented inline in each source file.

## Entry/shared

### `src/main.js`
- Browser bootstrap: finds `#app`, constructs `GameApp`, calls `start()`.

### `src/game.js`
- `clamp(value, minimum, maximum)` — inclusive numeric clamp.
- `clampDeltaSeconds(deltaSeconds, maximum)` — prevents large resume deltas reaching timers.
- `cloneData(value)` — JSON-safe defensive clone.
- `GAME_NAME` — project display name.

## Application

### `src/app/GameApp.js` — `GameApp`
- `constructor({ mountElement })` — creates shared save/state/progression ownership.
- `start()` — attaches visibility listener, opens menu, starts RAF.
- `dispose()` — tears down all app-owned resources.
- `showMainMenu()` — composes main menu and shared settings panel.
- `startGame()` — composes scene, gameplay models/controllers, and UI.
- `openUpgrades()` — pauses and opens skill UI.
- `openSettings({ returnTo })` — opens shared settings UI from menu or gameplay.
- `closeModal()` — closes gameplay overlays and resumes.
- `openCompletion()` — opens final statistics.
- `purchaseUpgrade(upgradeId)` — delegates transaction, applies derived effects, saves.
- `handleVisibilityChange()` — pause/save on hide; safe resume on show.
- `frame(frameMs)` — clamped RAF update + periodic save.
- `disposeGameplay()` — tears down gameplay composition only.

## Scenes

### `src/scenes/MainMenuScene.js` — `MainMenuScene`
- `mount()` — creates menu DOM and returns overlay host.
- `unmount()` — removes menu DOM.

### `src/scenes/GameScene.js` — `GameScene`
- `mount()` — creates gameplay DOM shell, Three.js renderer, camera, lights, entities.
- `createCamera()` — fixed orthographic camera.
- `createLighting()` — lightweight scene lights.
- `createEnvironment()` — background/floor presentation.
- `bindInput(...)` — binds the single gameplay Pointer Events path and UI controls.
- `handleResize()` — keeps renderer/camera responsive.
- `setPlayerBoomerangCount(count)` — mirrors 1–4 derived player boomerangs.
- `setTargetCount(count)` — mirrors 1–4 target formation.
- `getTargetPositions(count)` — deterministic narrow-screen formations.
- `setDogVisible(visible)` — creates/shows dog after unlock.
- `playPlayerThrow(...)` — deterministic resolved player throw animation contract.
- `playDogThrow(...)` — non-blocking dog animation contract.
- `playResultFeedback(result)` — hit/critical/miss visual feedback.
- `showGrandmasterTarget()` — special final target.
- `playGrandmasterSequence(...)` — final celebration contract.
- `update(deltaSeconds)` — updates visual-only animation and renders.
- `dispose()` — frees GPU/DOM/listener resources.

## Gameplay

### `src/gameplay/GameState.js` — `GameState`
- `replaceFromSave(saveData)` — initializes mutable authoritative state.
- `addXp(amount, source)` — adds spendable/lifetime XP and source stats.
- `spendXp(amount)` — spends currency without reducing lifetime XP.
- `purchaseUpgrade(upgradeId)` — marks known upgrade owned.
- `hasUpgrade(upgradeId)` — ownership query.
- `setCombo(combo)` — updates current/longest combo.
- `incrementStat(statName, amount)` — numeric statistic mutation.
- `updateSettings(partialSettings)` — settings mutation.
- `markCompleted()` — sets Grandmaster completion.
- `toSaveData()` — plain serializable snapshot.

### `src/gameplay/GaugeController.js` — `GaugeController`
- `update(deltaSeconds)` — normalized back-and-forth sweep.
- `stop()` / `resume()` — gauge lock lifecycle.
- `resetFromEdge()` — consistent next-throw reset.
- `setZoneWidths(zoneWidths)` — validated red/green/white totals.
- `classify(position)` — deterministic MISS/HIT/CRITICAL result.
- `getSnapshot()` — render-safe mirror.
- `GAUGE_RESULT` — result constants.

### `src/gameplay/RewardCalculator.js`
- `calculatePlayerReward(...)` — pure player XP formula.
- `calculateDogReward(...)` — pure dog XP formula.
- `getNextCombo(...)` — per-throw combo mutation rule.
- `calculateComboMultiplier(...)` — capped combo multiplier.

### `src/gameplay/ThrowController.js` — `ThrowController`
- `resolvePlayerThrow(...)` — logical target-chain/hit-count description for one tap.
- `resolveDogThrow(...)` — logical dog target-chain description.

### `src/gameplay/DogController.js` — `DogController`
- `configure(...)` — applies derived unlock/interval/crit chance.
- `resume()` / `pause()` — automatic timer lifecycle.
- `update(deltaSeconds)` — elapsed-time automatic trigger.
- `rollCritical()` — injectable RNG contract.
- `resetCooldown()` — starts dog timer fresh.
- `getRemainingSeconds()` — optional UI value.

### `src/gameplay/GameController.js` — `GameController`
- `start()` / `dispose()` — gameplay lifecycle.
- `isActivePlay()` — determines whether active-play time counts.
- `update(deltaSeconds)` — state-machine/timer update.
- `handlePointerDown(event)` — single legal manual input path.
- `resolvePlayerInput()` — lock/classify/reward/animate one player throw.
- `beginMissReload(seconds)` / `updateMissReload(deltaSeconds)` — miss lockout.
- `updateSuccessRecovery(deltaSeconds)` — successful return timing.
- `returnToReady()` — explicit cycle reset.
- `handleDogThrow({ critical })` — independent dog reward/visual request.
- `pause(reason)` / `resume()` — modal/background pause semantics.
- `applyProgressionEffects(effects)` — propagates derived counts/timers.
- `startFinalChallenge()` — Grandmaster state.
- `completeFinalChallenge()` — marks completion, saves, celebrates.
- `renderMirrors()` — updates HUD/gauge DOM mirrors.
- `GAMEPLAY_STATE` — explicit READY/PLAYER_THROW/MISS_RELOAD/FINAL_CHALLENGE/PAUSED states.

## Progression

### `src/progression/balance.js`
- `BALANCE` — all tuneable gameplay constants, costs, optional lifetime gates.

### `src/progression/upgradeDefinitions.js`
- `UPGRADE_DEFINITIONS` — complete data-driven v1 graph.
- `UPGRADE_BY_ID` — direct lookup map.
- `UPGRADE_IDS` — canonical save-schema IDs.

### `src/progression/ProgressionManager.js` — `ProgressionManager`
- `hasUpgrade(upgradeId)` — ownership query.
- `prerequisitesMet(upgradeId)` — graph requirement check.
- `getPurchaseStatus(upgradeId)` — structured affordability/lock result.
- `canPurchase(upgradeId)` — boolean convenience check.
- `purchase(upgradeId)` — transactional XP spend + ownership update.
- `getVisibleUpgrades()` — UI-facing reachable graph subset.
- `getDerivedEffects()` — rebuilds all gameplay values from ownership.

### `src/progression/optimalProgressionSimulator.js`
- `DEFAULT_OPTIMAL_ROUTE` — initial purchase-route contract.
- `getPerfectGaugeWaitSeconds(...)` — time from edge to first white boundary.
- `getPerfectThrowCycleSeconds(...)` — base perfect-play cadence helper.
- `simulateOptimalProgression(...)` — deterministic logical-time simulator contract.

## Persistence

### `src/persistence/defaultSave.js`
- `SAVE_VERSION` — v1 schema version.
- `SAVE_KEY` — `localStorage` key.
- `createDefaultSave()` — fresh canonical save object containing every upgrade ID.

### `src/persistence/SaveManager.js` — `SaveManager`
- `load()` — safe parse/migrate/sanitize with fallback.
- `save(saveData)` — non-throwing persistence.
- `migrate(saveData)` — explicit schema-version branch.
- `sanitize(saveData)` — allowlist/merge/clamp logic.
- `sanitizeStats(stats, defaults)` — known-stat cleanup.
- `numberOr(value, fallback)` / `nonNegativeNumber(...)` — numeric guards.
- `clear()` — development/reset utility.
- `roundTrip(saveData)` — defensive normalized snapshot for tests/debugging.

## Three.js entity views

### `src/entities/PlayerView.js` — `PlayerView`
- `update(deltaSeconds)`, `playThrow()`, `dispose()`.

### `src/entities/BoomerangView.js` — `BoomerangView`
- `playHitPath(...)`, `playMissPath(...)`, `update(deltaSeconds)`, `reset()`, `dispose()`.

### `src/entities/TargetDummyView.js` — `TargetDummyView`
- `setPosition(...)`, `playReaction(result)`, `update(deltaSeconds)`, `dispose()`.

### `src/entities/DogView.js` — `DogView`
- `playThrow(...)`, `update(deltaSeconds)`, `dispose()`.

These classes are presentation-only and must never become authoritative gameplay models.

## DOM UI

### `src/ui/HUD.js` — `HUD`
- `render(...)`, `showPlayerResult(...)`, `showDogResult(...)`, `clearFeedback()`.

### `src/ui/GaugeView.js` — `GaugeView`
- `render(snapshot)` — normalized controller mirror only.

### `src/ui/UpgradePanel.js` — `UpgradePanel`
- `open()`, `close()`, `render()`, `createUpgradeCard(definition)`.

### `src/ui/SettingsPanel.js` — `SettingsPanel`
- `open()`, `close()`, `render()`, `createRange(...)`, `createToggle(...)`.

### `src/ui/CompletionPanel.js` — `CompletionPanel`
- `open(stats)`, `close()`, `formatDuration(seconds)`.

## Tests

The colocated test files deliberately use `it.todo(...)` to define implementation contracts without pretending the unfinished systems are already verified. `src/tests/gameplayFlow.test.js` defines cross-system integration acceptance, and `src/progression/optimalProgression.test.js` defines the 1m/30m/45m/5h balance anchors.
