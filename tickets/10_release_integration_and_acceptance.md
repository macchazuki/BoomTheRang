# Ticket 10 — Release Integration and v1 Acceptance

**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** Tickets 01–09

## Goal

Perform the final cross-system pass so the repository is a finished v1 implementation rather than an architecture scaffold with individually completed subsystems.

## Read first

- `AGENTS.md`
- `documents/00_README.md`
- `documents/07_TEST_PLAN.md`
- `documents/08_IMPLEMENTATION_SEQUENCE.md`
- direct source files implicated by any failure found during this ticket

Do not scan/rewrite unrelated modules unless a failing acceptance case points to them.

## Required work

### Automated contract closure

- Search the repository for required `it.todo(...)` cases.
- Replace/remove TODO tests only when the underlying contract is genuinely implemented and tested.
- Search for TODO/no-op production methods that correspond to required v1 behavior.
- Do not remove TODO comments by cosmetic cleanup if the behavior is still missing.
- Keep future-version TODOs such as a v1→v2 migration placeholder if they are intentionally outside v1.

### Cross-system integration

Verify in one composed gameplay flow:
- fresh start;
- gauge hit/critical/miss;
- miss reload;
- XP gain/spend;
- upgrade purchase;
- 2/3/4 boomerangs;
- 2/3/4 targets;
- combo;
- dog unlock/upgrades/critical;
- pause via upgrades/settings;
- hide/resume;
- save/reload;
- Grandmaster unlock/challenge/completion;
- continued play after completion.

Ensure transitions do not:
- double-award XP;
- lose upgrades;
- corrupt combo;
- advance dog while paused;
- grant offline XP;
- leak duplicate Pointer Event listeners;
- leave disposed Three.js objects/listeners active.

### Resource/lifecycle cleanup

Exercise repeated:
- main menu → game;
- game modal open/close;
- visibility hide/show;
- dispose/recreate gameplay if any path does so.

Fix concrete listener/GPU/resource leaks without introducing a generalized lifecycle framework.

### Final mobile acceptance

Perform the manual checks from Ticket 07 and `documents/07_TEST_PLAN.md`, including 320px portrait.

### CI/build

The existing workflow already runs tests and the production build. Do not redesign deployment unless it is actually broken by the implementation.

Run:
```bash
npm ci
npm test
npm run build
```

## Documentation cleanup

After the implementation is genuinely complete:
- update `README.md` so it no longer describes the repository as only an architecture scaffold;
- update `FUNCTION_INDEX.md` only where public responsibilities/signatures changed;
- keep `/documents` as the product/implementation handover source unless the implementation intentionally supersedes a documented detail.

Do not rewrite documentation merely for style.

## Explicitly out of scope

- final art assets;
- visual reskin;
- prestige/offline XP/additional currencies/ads/IAP/multiplayer;
- new gameplay systems listed as out of scope in `01_GAME_DESIGN.md`.

## Acceptance criteria

- No required v1 behavior remains represented only by `it.todo(...)`.
- No required production method remains a no-op placeholder.
- Core integration flow works from fresh save through post-Grandmaster continued play.
- Manual narrow-phone acceptance passes.
- No offline/catch-up dog XP is possible.
- CI-relevant test/build commands pass.
- README accurately describes the implementation state.
