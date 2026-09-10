# Ticket 06 — Implement Three.js Gameplay Animation and Feedback

**Priority:** P1  
**Complexity:** Large  
**Dependencies:** Tickets 02 and 04

## Goal

Replace the current visual no-ops with deterministic procedural gameplay presentation using the existing primitive meshes. Do **not** create or import final art assets.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/01_GAME_DESIGN.md`
- `documents/04_ARCHITECTURE.md`
- `documents/05_MOBILE_UI_AND_SCENE.md`

## Primary files

- `src/scenes/GameScene.js`
- `src/entities/PlayerView.js`
- `src/entities/BoomerangView.js`
- `src/entities/TargetDummyView.js`
- `src/entities/DogView.js`
- `src/gameplay/ThrowController.js`
- `src/ui/HUD.js`
- `src/style.css`

## Current unfinished hooks

The scaffold currently leaves the important presentation hooks as TODO/no-op behavior, including:
- boomerang hit/miss path interpolation;
- boomerang frame updates;
- player throw pose;
- target recoil/impact reaction;
- dog throw flourish;
- `GameScene.playPlayerThrow(...)`;
- `GameScene.playDogThrow(...)`;
- Grandmaster presentation hooks (final challenge itself is Ticket 08).

## Required work

Player throw presentation:
- invoke the player throw pose;
- successful path follows `Player -> Target 1 -> Target 2 -> ... -> Player`;
- miss path visibly passes beside the target formation and returns;
- multiple player boomerangs use small deterministic offsets/staggers for readability;
- result is already known before animation; animation never determines hits or XP;
- all boomerangs return/reset cleanly.

Target feedback:
- MISS causes no target recoil;
- HIT gives a small readable recoil/impact;
- CRITICAL gives stronger feedback than HIT;
- keep effects lightweight and readable on narrow portrait screens.

Dog presentation:
- dog throw is visually independent/non-blocking;
- dog path chains through every target then returns;
- critical gets a small distinct flourish compatible with `GOOD BOY!`.

Reduced motion:
- honor the in-game setting and `prefers-reduced-motion`;
- replace large movement/shake with shorter/subtler feedback rather than breaking gameplay state.

Implementation guidance:
- use deterministic interpolation over elapsed seconds;
- no tween dependency is needed;
- visual duration may be independent from authoritative recovery state unless explicitly coordinated;
- dispose temporary geometries/materials/listeners;
- keep object ownership inside scene/view classes.

## Explicitly out of scope

- new models;
- sprites;
- textures;
- character/dog/target/environment art;
- importing an art asset package;
- collision-based hit detection.

Primitive meshes may remain ugly; they only need to make gameplay behavior readable.

## Acceptance criteria

- Green/white throws visibly hit every target in chain and return.
- Miss visibly bypasses targets and awards/recoils nothing.
- 4 boomerangs × 4 targets remains understandable without affecting reward math.
- Dog animation never blocks manual input.
- Reduced motion meaningfully reduces movement/shake.
- No reward/state logic is moved into Three.js views.
- No required presentation TODO/no-op remains in the listed non-Grandmaster hooks.
- `npm test` passes.
- `npm run build` passes.
