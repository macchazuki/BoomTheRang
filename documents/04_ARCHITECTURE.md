# Implementation Architecture

## Current-to-target approach

The repository currently has a minimal `src/`. Grow it incrementally; do not rewrite build tooling.

Recommended target structure:

```text
src/
├─ main.js
├─ style.css
├─ game.js                         # keep shared existing helpers/constants if useful
│
├─ app/
│  └─ GameApp.js                   # top-level lifecycle / screen transitions
│
├─ scenes/
│  ├─ MainMenuScene.js
│  └─ GameScene.js                 # Three.js scene/camera/lights + gameplay composition
│
├─ gameplay/
│  ├─ GameState.js                 # authoritative mutable run/save state
│  ├─ GameController.js            # state machine and gameplay orchestration
│  ├─ GaugeController.js           # normalized sweep + zone classification
│  ├─ ThrowController.js           # player throw resolution
│  ├─ RewardCalculator.js          # pure XP formulas
│  └─ DogController.js             # independent automatic timer/throws
│
├─ entities/
│  ├─ PlayerView.js
│  ├─ BoomerangView.js
│  ├─ TargetDummyView.js
│  └─ DogView.js
│
├─ progression/
│  ├─ upgradeDefinitions.js        # IDs, prerequisites, costs/gates, effects metadata
│  ├─ ProgressionManager.js        # affordability/purchase/apply logic
│  └─ balance.js                   # numeric gameplay/progression constants
│
├─ persistence/
│  └─ SaveManager.js
│
└─ ui/
   ├─ HUD.js
   ├─ GaugeView.js
   ├─ UpgradePanel.js
   ├─ SettingsPanel.js
   └─ CompletionPanel.js
```

Tests may stay colocated as `*.test.js` or follow the existing project convention.

## Ownership rules

### `GameController`
Owns:
- gameplay state machine
- accepting/ignoring tap input
- player throw start/end
- miss reload
- calling reward/progression systems

Must not:
- calculate DOM layout
- own Three.js mesh construction
- define upgrade costs

### `GaugeController`
Pure gameplay model:
- normalized position
- direction
- update by `deltaSeconds`
- classify red/green/white
- apply precision upgrade widths

`GaugeView` renders this state. DOM pixel position must not be authoritative.

### `RewardCalculator`
Pure functions only. Inputs explicitly include:
- hit type
- boomerang count
- target count
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
- targets
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
- state is not `READY`
- upgrade/settings menu is open

Do not attach separate gameplay logic to every 3D object.

## Time handling

All timers use elapsed time/delta time, never frame counts:
- gauge motion
- success recovery
- miss reload
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
