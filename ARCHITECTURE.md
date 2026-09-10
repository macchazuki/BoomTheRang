# BoomTheRang — Expected v1 Architecture

## Project tree

```text
BoomTheRang/
├─ index.html
├─ package.json
├─ vite.config.js
├─ .gitignore
├─ README.md
├─ ARCHITECTURE.md
└─ src/
   ├─ main.js
   ├─ game.js
   ├─ style.css
   ├─ app/
   │  └─ GameApp.js
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
   │  ├─ balance.js
   │  ├─ upgradeDefinitions.js
   │  ├─ ProgressionManager.js
   │  └─ optimalProgressionSimulator.js
   ├─ persistence/
   │  ├─ defaultSave.js
   │  └─ SaveManager.js
   ├─ ui/
   │  ├─ HUD.js
   │  ├─ GaugeView.js
   │  ├─ UpgradePanel.js
   │  ├─ SettingsPanel.js
   │  └─ CompletionPanel.js
   └─ tests/
      ├─ gameplayFlow.test.js
      └─ helpers.js
```

Colocated `*.test.js` files sit beside the pure logic they cover.

## Runtime composition

`main.js` creates one `GameApp`.

`GameApp` is the application shell. It owns:
- current screen;
- current scene/controller instances;
- animation frame;
- top-level visibility handling;
- transitions among main menu, gameplay, settings, and completion UI.

Gameplay composition:

```text
Pointer input
  -> GameController
     -> GaugeController.classify()
     -> ThrowController
     -> RewardCalculator
     -> GameState
     -> HUD / views / SaveManager

DogController timer
  -> ThrowController
  -> RewardCalculator
  -> GameState
  -> HUD / DogView / SaveManager
```

## Authoritative data

Only gameplay models hold authoritative values. DOM and Three.js objects mirror state.

Persisted:
- spendable XP;
- lifetime XP;
- purchased upgrades;
- completion flag;
- combo;
- statistics;
- settings.

Derived on load, not persisted:
- player boomerang count;
- target count;
- critical multiplier;
- reload duration;
- gauge widths;
- global training multiplier;
- dog interval;
- dog XP factor;
- combo cap;
- boomerang mastery multiplier.

## Gameplay state machine

`READY`
- gauge moves;
- one gameplay pointer input may stop it.

`PLAYER_THROW`
- result already known;
- view animates boomerang path;
- repeated taps ignored.

`MISS_RELOAD`
- miss cooldown counts down;
- taps ignored;
- return to `READY` at zero.

`FINAL_CHALLENGE`
- Grandmaster target shown;
- only a white result completes the challenge.

`PAUSED`
- manual input and automatic dog timer suspended;
- no catch-up rewards.

## Final challenge

Purchasing `grandmaster` starts the final challenge. The player must land one white-zone throw. Completion:
- sets `progression.gameCompleted = true`;
- triggers final multi-boomerang/dog visual sequence;
- opens completion statistics;
- permits continued play afterward.

## Implementation order

1. Pure core loop and gauge/reward tests.
2. Three.js presentation.
3. Early progression.
4. Dog.
5. Late progression/combo.
6. Save/settings.
7. Balance simulator and Grandmaster completion.

Do not create extra services until a concrete implementation need appears.
