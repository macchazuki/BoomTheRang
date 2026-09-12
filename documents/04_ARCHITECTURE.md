# Implementation Architecture

## Current-to-target approach

Grow the existing `src/` incrementally; do not rewrite build tooling.

Recommended structure:

```text
src/
├─ main.js
├─ style.css
├─ game.js
├─ app/GameApp.js
├─ scenes/
│  ├─ MainMenuScene.js
│  └─ GameScene.js
├─ gameplay/
│  ├─ GameState.js
│  ├─ GameController.js
│  ├─ GaugeController.js
│  ├─ ThrowController.js
│  ├─ RewardCalculator.js
│  └─ DogController.js
├─ entities/
│  ├─ PlayerView.js
│  ├─ BoomerangView.js
│  ├─ TargetDummyView.js
│  └─ DogView.js
├─ progression/
│  ├─ upgradeDefinitions.js
│  ├─ ProgressionManager.js
│  └─ balance.js
├─ persistence/SaveManager.js
└─ ui/
   ├─ HUD.js
   ├─ GaugeView.js
   ├─ UpgradePanel.js
   ├─ SettingsPanel.js
   └─ CompletionPanel.js
```

Tests may stay colocated as `*.test.js`.

## Ownership rules

### `GameController`
Owns:
- gameplay state machine
- accepting/ignoring tap input
- player throw resolution lifecycle
- boomerang reload state
- calling reward/progression systems

Must not:
- calculate DOM layout
- own Three.js mesh construction
- define upgrade costs

### `GaugeController`
Pure gameplay model:
- normalized position
- direction/sweep reset
- update by `deltaSeconds`
- classify red/green/white
- multiple boomerang timing areas
- apply precision upgrade widths

`GaugeView` renders this state. DOM pixel position must not be authoritative.

### `RewardCalculator`
Pure functions only. Inputs explicitly include:
- hit type
- boomerang count for the resolved reward
- target count, which progression fixes at `1`
- training multiplier
- critical multiplier
- combo
- mastery modifiers
- dog modifiers

No DOM, Three.js, timers, localStorage.

### `ProgressionManager`
Owns:
- prerequisites
- affordability
- purchase transaction
- derived upgrade effects
- upgrade state queries

Upgrade definitions are data, not long switch statements where avoidable.

Progression invariant: `targetCount` is always `1`. No target-count upgrade or prerequisite may be added.

### `DogController`
Owns:
- automatic throw interval
- dog cooldown accumulator
- dog critical roll after Fetch Mastery
- dog reward request

Dog visuals are delegated to `DogView`.

### Views/entities
Three.js view classes render/animate only. Do not store authoritative XP, upgrade ownership, or gauge result in meshes.

## Data flow

```text
pointer/touch
    ↓
GameController
    ↓
GaugeController.classify()
    ↓
ThrowController
    ↓
RewardCalculator
    ↓
GameState (xp/lifetimeXp/stats)
    ↓
HUD + SaveManager
```

Dog:

```text
DogController timer
    ↓
dog throw event
    ↓
RewardCalculator
    ↓
GameState
```

## Three.js vs DOM

Use Three.js for:
- player
- dog
- boomerangs
- the single target dummy
- floor/background
- lights/shadows
- hit/miss/critical visual effects

Use HTML/CSS for:
- gauge
- XP display
- cooldown text
- combo text
- menus
- upgrade tree/panel
- settings
- completion statistics

## Input

Use Pointer Events so one path supports touch/mouse.

Gameplay tap target should cover the gameplay viewport. Prevent gameplay taps when:
- UI control consumed the pointer
- state is paused/finalized
- the current gauge area is already consumed
- upgrade/settings menu is open

Do not attach separate gameplay logic to the target mesh.

## Time handling

All timers use elapsed time/delta time, never frame counts:
- gauge motion
- boomerang reload
- dog interval
- animations

Clamp or safely handle a very large frame delta after tab/app resume. Do not grant offline dog throws.

## Dependency policy

Use existing Three.js/Vite/Vitest.

Do not add:
- React/Vue/Svelte
- state management library
- tween library

unless implementation demonstrates a concrete need.
