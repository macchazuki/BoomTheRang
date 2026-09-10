# Ticket 07 — Complete Mobile Portrait UX and Accessibility

**Priority:** P1  
**Complexity:** Medium  
**Dependencies:** Tickets 02 and 05

## Goal

Make the existing DOM/Three.js shell reliable at real phone dimensions, with safe-area support, touch-safe controls, readable progression UI, and correct reduced-motion/input behavior.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/05_MOBILE_UI_AND_SCENE.md`
- `documents/07_TEST_PLAN.md`

## Primary files

- `src/style.css`
- `src/scenes/GameScene.js`
- `src/scenes/MainMenuScene.js`
- `src/ui/HUD.js`
- `src/ui/GaugeView.js`
- `src/ui/UpgradePanel.js`
- `src/ui/SettingsPanel.js`
- `src/ui/CompletionPanel.js`

## Required work

Portrait/mobile:
- treat portrait phone as authoritative;
- verify at 320px CSS width and common modern phone widths;
- apply safe-area insets to the gameplay screen as well as menu/modal content;
- prevent horizontal scrolling;
- ensure canvas, target formation, player, gauge, feedback, and bottom controls remain visible;
- support resize/rotation without corrupting scene composition;
- retain a sensible constrained portrait column on desktop.

Input:
- never require hover;
- use Pointer Events for gameplay;
- use comfortable touch targets (at least the existing ~44px target standard);
- ensure Skills/Settings/Close/Purchase controls cannot bubble into gameplay throws;
- handle rapid multi-touch/repeated taps without duplicate resolution;
- avoid browser gestures that interfere with intended gameplay while preserving normal control accessibility.

UI clarity:
- XP always readable;
- combo appears only after unlock;
- reload countdown is readable during misses;
- gauge zones and marker remain high contrast;
- upgrade cards communicate cost, purchased state, affordability, and unmet prerequisites;
- overlays remain scrollable on small displays without allowing background gameplay.

Accessibility:
- preserve useful labels/aria-live feedback;
- scope DOM queries to the owning screen/component rather than relying on unrelated global elements where practical;
- respect both the in-game reduced-motion setting and OS preference;
- avoid visual effects that obscure the gauge/targets.

## Explicitly out of scope

- final UI illustration/icon assets;
- visual reskin;
- new fonts/assets solely for art direction.

## Manual acceptance checklist

Verify:
- 320px portrait;
- one common ~360–390px phone width;
- tall/notched safe-area simulation;
- landscape/desktop resize for development;
- no horizontal scrolling;
- no clipped essential controls;
- menu/overlay taps never throw;
- background/resume does not grant dog/offline XP;
- 4 targets remain visible;
- 4 boomerangs can animate without overflowing the playable area.

## Acceptance criteria

- Manual checklist passes.
- Gameplay safe areas are correct on notched/home-indicator layouts.
- All essential controls are reachable by touch.
- Reduced-motion behavior works without changing authoritative game outcomes.
- `npm test` passes.
- `npm run build` passes.
