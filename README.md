# BoomTheRang Architecture Scaffold

This ZIP is a target code architecture for the completed v1 game described by the repository handover documents.

It is intentionally a **scaffold, not a finished game**:
- files and module boundaries are established;
- classes/functions have documented responsibilities and signatures;
- upgrade IDs and progression concepts are fully represented;
- methods contain safe placeholder behavior or `TODO` notes where implementation belongs;
- Vitest files enumerate the required behavior with `it.todo(...)` tests.

## Intended stack

- JavaScript ES modules
- Three.js
- Vite
- Vitest
- HTML/CSS UI
- `localStorage` persistence

No UI framework, state-management package, tween library, or collision-based hit logic is required.

## Key ownership rules

- `GameController` orchestrates gameplay state and input.
- `GaugeController` owns normalized timing-gauge logic.
- `RewardCalculator` is pure reward math.
- `ProgressionManager` owns upgrade purchasing and derived effects.
- `DogController` owns automatic dog timing.
- `GameState` owns mutable save/run state.
- Three.js `*View` classes render only.
- DOM UI classes render information and menus only.
- `SaveManager` is the only localStorage persistence boundary.
- `balance.js` is the only home for tuneable gameplay/progression numbers.

Read `ARCHITECTURE.md` for the complete file map and implementation contracts.

## Applying this scaffold

This ZIP is meant to be overlaid/merged onto the existing BoomTheRang repository.
Keep the repository's existing `package-lock.json` and CI/deployment files; this scaffold
does not replace them because the handover architecture does not require build-pipeline changes.
