# BoomTheRang — Implementation Handover

## Purpose

Implementation specification for the mobile-first portrait Three.js incremental timing game discussed with the user.

Use this file as the entry point. Read only the document relevant to the task being implemented.

## Repository snapshot

Repository: `macchazuki/BoomTheRang`

Current stack:
- JavaScript ES modules
- Three.js
- Vite
- Vitest
- HTML/CSS UI

Current files worth checking before implementation:
- `package.json` — scripts/dependencies
- `index.html` — existing main-menu markup
- `src/main.js` — current application entry point
- `src/game.js` — current game constants/helpers
- `src/game.test.js` — existing test style
- `src/style.css` — current responsive/menu styling

Current `src/` is small. Most gameplay architecture below is **new structure to create**, not existing files.

Before changing code:
1. Read repository `AGENTS.md` if one exists at implementation time.
2. Read only the current files directly touched by the task.
3. Preserve Vite/Three.js/Vitest unless a change is necessary.
4. Do not add a UI framework for this implementation.

## Document map

| File | Read when implementing |
|---|---|
| `01_GAME_DESIGN.md` | Core loop, rules, states, rewards |
| `02_UPGRADE_TREE.md` | Skill tree, dog, prerequisites, effects |
| `03_PROGRESSION_BALANCE.md` | 1m/30m/45m/5h targets and balancing method |
| `04_ARCHITECTURE.md` | New modules, ownership, data flow |
| `05_MOBILE_UI_AND_SCENE.md` | Portrait layout, input, Three.js scene, feedback |
| `06_SAVE_DATA.md` | Persistent state and save rules |
| `07_TEST_PLAN.md` | Unit/integration/balance acceptance tests |
| `08_IMPLEMENTATION_SEQUENCE.md` | Recommended task order and completion criteria |

## Fixed product requirements

- Three.js game.
- Mobile-first.
- Portrait-first layout.
- Player at bottom; target dummy/dummies at top.
- Timing gauge moves back and forth.
- Gauge zones: red, smaller green, smallest white.
- Tap anywhere in gameplay to stop gauge and throw.
- Red = miss, no XP, 5-second reload.
- Green = hit and XP.
- White = critical hit and 2x XP at base.
- XP is the upgrade currency.
- Incremental progression.
- First upgrade at about 1 minute of optimal play.
- 2 player boomerangs at about 30 minutes.
- 2 target dummies at about 45 minutes.
- Main progression finishes at about 5 hours of optimal play.
- Later upgrades take progressively longer to obtain.
- Dog companion automatically throws its own boomerang.
- Dog throw rate and dog XP are independently upgradable.

## Product principle

Active timing remains the main source of progress. Automation assists the player but never makes the gauge irrelevant.
