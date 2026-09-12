# Core Game Design

## Core loop

1. Gauge sweeps left/right.
2. Player taps anywhere in the gameplay area.
3. The pressed gauge area is resolved.
4. Result is classified.
5. One available boomerang is thrown.
6. Resolve miss/hit/critical against the single target dummy.
7. Award XP if applicable.
8. Continue the sweep until it reaches the end, then reset available gauge areas.

## Gauge

Base zone widths across the full gauge:
- Red: 80% total
- Green: 17% total
- White: 3% total

Layout:

`40% red | 8.5% green | 3% white | 8.5% green | 40% red`

Base one-way sweep duration: `1.35 s`.

Use normalized gauge position `[0, 1]` for gameplay logic. Rendering must not determine the result.

With multiple boomerangs, the gauge is split into one timing area per currently available boomerang. Each valid press consumes that area for the current sweep and throws one boomerang. The sweep resets only when it reaches the end.

### Result rules

| Zone | Result | Base reward |
|---|---|---:|
| Red | Miss | 0 XP |
| Green | Hit | 1x XP |
| White | Critical | 2x XP |

Base XP per successful boomerang hit: `10`.

Critical multiplier can be upgraded later.

## Throw/recovery

### Miss
- Boomerang visibly passes beside the target.
- Award 0 XP.
- That boomerang is unavailable for the base `5.0 s` miss reload.
- Other available boomerangs may still be used during the same sweep.
- Show remaining reload time as needed.

### Hit / critical
- The thrown boomerang attacks the single target dummy and returns.
- Each successful boomerang awards exactly one target hit before damage multipliers.
- The consumed timing area cannot be pressed again during the same sweep.

## Multiple boomerangs, single target

The game has exactly **one target dummy for the entire game**.

There are no target-count upgrades and no multi-target progression.

Rewarded target hits per successful boomerang press:

`1`

Over a full successful sweep, the maximum number of rewarded hits equals the number of available player boomerangs.

Examples:
- 1 boomerang = up to 1 hit per sweep
- 2 boomerangs = up to 2 hits per sweep
- 4 boomerangs = up to 4 hits per sweep

Do not roll separate target selection or create target chains.

## Combo

Unlocked later.

- Green successful throw: combo `+1`.
- White successful throw: combo `+2`.
- Red miss: combo resets to `0`.
- Count combo per **boomerang press/result**, not per target.
- Base Combo Training: `+2% player damage per combo step`, capped at `+20%`.
- Combo Mastery raises cap to `+50%`.
- Dog throws do not alter or use the player's combo.

## Game states

Use explicit states; do not infer readiness from animations.

Suggested states:
- `READY` — gauge active; valid presses accepted.
- `PLAYER_THROW` — resolved throw animation if needed.
- `MISS_RELOAD` — retained for any full-lock reload state if used.
- `FINAL_CHALLENGE` — Grandmaster end sequence.
- `PAUSED` — menus/background interruption as needed.

Dog throws run independently from the player's state except during pause/final sequence.

## Final progression

At the final Grandmaster unlock:
- Start a final challenge.
- Present the special Grandmaster target.
- Require one white-zone throw.
- On success, play a final multi-boomerang/dog sequence.
- Show completion statistics.
- Allow continued play afterward; no prestige/reset is required for v1.

## Out of scope for v1

Do not add unless separately requested:
- Offline XP
- Prestige/reset system
- Additional currencies
- Ads/IAP
- Moving enemies/combat health
- Additional target dummies
- Player movement
- Free camera controls
- Multiplayer
