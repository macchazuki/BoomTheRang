# BoomTheRang — Remaining Implementation Tickets

Repository: `macchazuki/BoomTheRang`  
Audited branch: `main`  
Audited commit: `dcb0a27b168aa2e698bbd6b1e248f5e778e4b1bb`  
Audit date: `2026-09-10`

## Scope

These tickets cover the remaining work required to turn the current architecture scaffold into the v1 game described in `/documents`.

Explicitly excluded:
- new art assets;
- replacing primitive placeholder meshes with final models/sprites;
- textures, illustrations, icons, character art, target art, dog art, or environment art;
- asset-production pipelines that exist only to support those art assets.

Procedural motion, layout, hit feedback, screen shake, primitive geometry, DOM/CSS presentation, and Three.js behavior are still in scope because they are implementation work rather than asset creation.

## Current repository state

The repository is intentionally an architecture scaffold rather than a finished game. Most target files/classes already exist, and much of the pure gameplay logic has preliminary implementations. However:
- the key Vitest suites are still `it.todo(...)` contracts;
- Three.js throw/reaction animations are placeholders/no-ops;
- the optimal progression simulator is explicitly unimplemented;
- late-game XP costs are explicitly placeholders;
- Grandmaster visual/final-flow work is incomplete;
- final mobile/accessibility/manual acceptance has not been completed.

Basic CI/deployment does **not** need a new ticket: `.github/workflows/ci.yml` already runs `npm ci`, `npm test`, `npm run build`, and deploys the verified `main` build.

There were no open GitHub issues or pull requests at audit time.

## Recommended implementation order

| # | Ticket | Priority | Depends on |
|---|---|---|---|
| 01 | Core gameplay logic and unit tests | P0 | — |
| 02 | Gameplay state machine and input flow | P0 | 01 |
| 03 | Progression and full upgrade tree | P0 | 01 |
| 04 | Dog automation and integration | P0 | 01, 03 |
| 05 | Save, settings, and lifecycle | P0 | 02, 03, 04 |
| 06 | Three.js gameplay animation and feedback | P1 | 02, 04 |
| 07 | Mobile portrait UX and accessibility | P1 | 02, 05 |
| 08 | Grandmaster final challenge | P1 | 02, 03, 05, 06 |
| 09 | Optimal progression simulator and balance tuning | P0 | 01, 03, 04 |
| 10 | Release integration and acceptance | P0 | 01–09 |

Tickets 06 and 09 can run in parallel after their dependencies are complete.

## Agent handoff rule

For every ticket:
1. Read root `AGENTS.md`.
2. Read `/documents/00_README.md`.
3. Read only the specific handover documents named by that ticket.
4. Inspect only the affected files and their direct imports/dependents.
5. Implement the ticket and convert its relevant `it.todo(...)` contracts into real tests.
6. Run `npm test` and `npm run build` before handoff.
7. Do not add frameworks, tween libraries, physics/collision libraries, or unrelated abstractions.

## Definition of v1 complete

All tickets are complete when:
- timing/reload/reward gameplay is functional and tested;
- 1–4 player boomerangs and 1–4 targets work;
- the complete upgrade graph works;
- dog automation and dog upgrades work;
- save/settings/lifecycle handling is safe;
- the Grandmaster white-zone challenge can be completed;
- deterministic progression reaches the required ~1m / ~30m / ~45m / ~5h anchors;
- no required acceptance tests remain as `it.todo(...)`;
- narrow portrait manual acceptance passes;
- `npm test` and `npm run build` pass.
