# BoomTheRang Agent Guide

## Read first

Before implementing a task, read:
1. `ARCHITECTURE.md`
2. the directly affected source module(s)
3. the matching colocated `*.test.js`
4. the original `/documents` handover file in the real repository when available

Do not scan or rewrite unrelated modules by default.

## Architecture rules

- Keep JavaScript ES modules, Three.js, Vite, Vitest, and HTML/CSS.
- Do not add React/Vue/Svelte, a state library, a tween library, or a physics/collision dependency without a demonstrated need.
- `GameController` owns gameplay state transitions and pointer acceptance.
- `GaugeController` owns normalized gauge position/classification.
- `RewardCalculator` contains pure XP/combo formulas.
- `ProgressionManager` owns upgrade requirements, purchases, and derived effects.
- `balance.js` owns tuneable numeric values and upgrade costs.
- `SaveManager` is the localStorage boundary.
- Three.js entity/view classes never own XP, progression, hit detection, or authoritative results.
- UI classes never calculate upgrade/reward rules.
- All timers use elapsed seconds, never frame counts.
- Never grant offline/catch-up dog XP.
- Player hit detection is resolved before visual animation; do not use mesh collisions for rewards.

## Implementation style

- Prefer small explicit functions over new abstraction layers.
- Add tests with behavior changes.
- Keep save schema data-only and versioned.
- Preserve portrait-first mobile behavior and Pointer Events.
- Dispose Three.js GPU resources and browser listeners owned by a class.
- Keep TODO comments until the described responsibility is actually implemented and tested.

## Completion checklist

A v1 implementation is complete when:
- core timing/reload/reward loop works;
- 1-4 boomerangs and 1-4 target formations work;
- full upgrade graph works;
- dog automation/upgrades work;
- combo and mastery branches work;
- save/settings work safely;
- Grandmaster final white-zone challenge and statistics work;
- deterministic balance tests hit ~1m, ~30m, ~45m, and ~5h anchors;
- build/tests pass;
- narrow portrait manual acceptance passes.
