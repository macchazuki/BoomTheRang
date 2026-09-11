# BoomTheRang

BoomTheRang is a mobile-first, portrait-oriented Three.js incremental timing game. Time the moving gauge to throw boomerangs at a single target dummy, deal damage, earn equal XP, buy upgrades, unlock a dog companion, and finish the Grandmaster white-zone challenge.

## Gameplay

- Red gauge result: miss and reload that boomerang.
- Green gauge result: hit the target.
- White gauge result: critical hit with increased damage.
- Damage dealt is awarded as XP and XP is the upgrade currency.
- Progression expands from 1 to 4 player boomerangs while the game keeps exactly 1 target dummy throughout.
- Multiple boomerangs are thrown with separate presses during the same gauge sweep.
- Combo upgrades reward consecutive successful manual throws.
- The dog companion throws automatically, has independent rate/damage upgrades, and never grants offline catch-up XP.
- Grandmaster is the final challenge; completing it records completion while allowing continued play.

There are no target-count upgrades or multi-target progression.

## Controls

Tap/click the gameplay area to throw one available boomerang using the current gauge area. A used area cannot be tapped again during that sweep. Use **Skills** to purchase upgrades and **Settings** to adjust game options. Gameplay pauses while gameplay overlays are open and while the document is hidden.

## Development

The project uses JavaScript ES modules, Three.js, Vite, Vitest, HTML/CSS, and `localStorage` persistence.

```bash
npm ci
npm test
npm run build
npm run dev
```

`npm test` includes unit, integration, lifecycle, Grandmaster, persistence, and deterministic progression-balance coverage. The production build is created with Vite.

## Architecture

Key ownership remains intentionally small and explicit:

- `GameController` owns gameplay state transitions and pointer acceptance.
- `GaugeController` owns normalized gauge timing and classification.
- `RewardCalculator` owns pure damage/XP/combo formulas.
- `ProgressionManager` owns upgrade requirements, purchases, and derived effects.
- `DogController` owns automatic dog timing only.
- `SaveManager` is the persistence boundary.
- Three.js scene/entity classes own presentation, not authoritative rewards.

See `ARCHITECTURE.md`, `FUNCTION_INDEX.md`, and `/documents` for implementation responsibilities and product handover details.
