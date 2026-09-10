# Ticket 05 — Complete Save, Settings, and Lifecycle Behavior

**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** Tickets 02, 03, and 04

## Goal

Make v1 persistence and browser lifecycle behavior reliable: safe localStorage load/save, restoration of progression, periodic/important-event saves, settings persistence, and no offline/catch-up progression.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/05_MOBILE_UI_AND_SCENE.md`
- `documents/06_SAVE_DATA.md`
- `documents/07_TEST_PLAN.md`

## Primary files

- `src/persistence/defaultSave.js`
- `src/persistence/SaveManager.js`
- `src/persistence/SaveManager.test.js`
- `src/gameplay/GameState.js`
- `src/app/GameApp.js`
- `src/ui/SettingsPanel.js`
- `src/gameplay/GameController.js`
- `src/gameplay/DogController.js`

## Required work

Verify and complete the v1 save schema:
- `version`;
- `xp`;
- `lifetimeXp`;
- every canonical upgrade ID;
- `progression.gameCompleted`;
- current combo;
- all documented statistics;
- master/music/SFX volume values;
- haptics toggle;
- reduced-motion toggle.

Persistence rules:
- use `boomTheRang.save.v1`;
- save after upgrade purchase;
- save after major progression/completion;
- periodic save during active play (target 15–30 s; current scaffold uses 20 s);
- save on document hide;
- malformed/corrupted storage must never prevent startup;
- missing fields receive defaults;
- unknown fields/upgrades are ignored;
- unsafe numeric values are clamped/sanitized;
- XP never becomes negative;
- lifetime XP is never below spendable XP;
- migration path remains explicit by numeric version;
- derived progression values are rebuilt after load rather than saved.

Lifecycle:
- active play time increments only while gameplay is running, visible, and not paused by a menu/modal;
- page hide pauses gameplay/dog and saves;
- page resume resets frame timing so elapsed hidden time is not processed;
- no offline dog throws or offline XP;
- save/load of a late-game state correctly restores 1–4 counts, dog state, combo capability, and completion state through derivation.

Settings:
- changes persist immediately;
- reduced-motion setting is consumed by gameplay animation code;
- haptics are only emitted when the setting is enabled and the platform supports them, if haptic feedback is implemented;
- do not add sound/music asset content in this ticket. Keep volume values ready for an audio pass rather than inventing an audio asset system.

## Tests to convert from TODO

Implement all `SaveManager.test.js` contracts:
- fresh defaults;
- round trip;
- missing fields;
- corrupted JSON;
- unknown fields/upgrades;
- numeric/settings clamps;
- explicit version handling.

Add lifecycle tests around visibility/pause behavior using fakes where practical.

## Constraints

- `SaveManager` remains the only localStorage boundary.
- No offline earnings.
- Do not persist derived values.
- No art assets.

## Acceptance criteria

- A corrupt localStorage value falls back safely to a playable fresh state.
- A valid save round-trips without losing canonical data.
- Late-game upgrade ownership restores correct derived effects.
- Hiding/resuming cannot grant dog XP or inflate active play time.
- All save TODO tests are real passing tests.
- `npm test` passes.
- `npm run build` passes.
