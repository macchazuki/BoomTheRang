# BoomTheRang

BoomTheRang is a mobile-first, portrait-oriented Three.js incremental timing game. Stop the moving gauge to throw boomerangs at target dummies, earn XP, buy upgrades, unlock a dog companion, and finish the Grandmaster white-zone challenge.

## Gameplay

- Red gauge result: miss, no XP, and a reload delay.
- Green gauge result: hit and earn XP.
- White gauge result: critical hit with increased XP.
- XP is both the earned progression resource and the upgrade currency.
- Progression expands from 1 to 4 player boomerangs and from 1 to 4 target dummies.
- Combo upgrades reward consecutive successful manual throws.
- The dog companion throws automatically, has independent rate/XP upgrades, and never grants offline catch-up XP.
- Grandmaster is the final challenge; completing it records completion while allowing continued play.

The deterministic balance simulator targets the intended progression anchors: the first upgrade at about 1 minute, Twin Throw at about 30 minutes, Second Dummy at about 45 minutes, and Grandmaster completion at about 5 hours of optimal play.

## Controls

Tap/click the gameplay area to stop the gauge and throw. Use **Skills** to purchase upgrades and **Settings** to adjust game options. Gameplay pauses while gameplay overlays are open and while the document is hidden.

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
- `RewardCalculator` owns pure XP/combo formulas.
- `ProgressionManager` owns upgrade requirements, purchases, and derived effects.
- `DogController` owns automatic dog timing only.
- `SaveManager` is the persistence boundary.
- Three.js scene/entity classes own presentation, not authoritative rewards.

See `ARCHITECTURE.md`, `FUNCTION_INDEX.md`, and `/documents` for implementation responsibilities and product handover details.
