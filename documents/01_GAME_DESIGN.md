# Core Game Design

## Core loop

1. Gauge sweeps left/right.
2. Player taps anywhere in the gameplay area.
3. Gauge locks.
4. Result is classified.
5. Player throws boomerang(s).
6. Resolve miss/hit/critical.
7. Award XP if applicable.
8. Complete recovery/return.
9. Restart gauge.

## Gauge

Base zone widths across the full gauge:
- Red: 80% total
- Green: 17% total
- White: 3% total

Layout:

`40% red | 8.5% green | 3% white | 8.5% green | 40% red`

Base one-way sweep duration: `1.35 s`.

The marker reflects at each edge; it does not teleport.

Use normalized gauge position `[0, 1]` for gameplay logic. Rendering must not determine the result.

### Result rules

| Zone | Result | Base reward |
|---|---|---:|
| Red | Miss | 0 XP |
| Green | Hit | 1x XP |
| White | Critical | 2x XP |

Base XP per boomerang-target hit: `10`.

Critical multiplier can be upgraded later.

## Throw/recovery

### Miss
- Boomerang visibly passes beside the target(s).
- Award 0 XP.
- Start base `5.0 s` miss reload.
- Ignore gameplay taps until reload finishes.
- Show remaining reload time.

### Hit / critical
- Every player boomerang follows the current target chain.
- Each boomerang awards XP for each target hit.
- Use approximately `0.7 s` success recovery/return before the next ready cycle.
- Restart/reset the gauge consistently after the throw. For balance simulation, assume the next sweep starts from an edge.

## Multiple boomerangs and targets

Rewarded player hits per successful throw:

`playerBoomerangCount × targetCount`

Examples:
- 1 boomerang × 1 target = 1 hit
- 2 × 1 = 2 hits
- 2 × 2 = 4 hits
- 4 × 4 = 16 hits

A single tap produces one gauge result. That result applies to all player boomerangs in that throw.

Target chaining:
`Player -> Target 1 -> Target 2 -> ... -> Player`

Do not roll separate accuracy for individual player boomerangs.

## Combo

Unlocked later.

- Green successful throw: combo `+1`.
- White successful throw: combo `+2`.
- Red miss: combo resets to `0`.
- Count combo per **throw**, not per boomerang or target.
- Base Combo Training: `+2% player XP per combo step`, capped at `+20%`.
- Combo Mastery raises cap to `+50%`.
- Dog throws do not alter or use the player's combo.

## Game states

Use explicit states; do not infer readiness from animations.

Suggested states:
- `READY` — gauge active; tap accepted.
- `PLAYER_THROW` — player boomerang animation/resolution.
- `MISS_RELOAD` — miss cooldown; tap ignored.
- `FINAL_CHALLENGE` — Grandmaster end sequence.
- `PAUSED` — menus/background interruption as needed.

Dog throws run independently from the player's state except during pause/final sequence.

## Final progression

At the final Grandmaster unlock (~5 hours optimal):
- Start a final challenge.
- Present a special Grandmaster target.
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
- Player movement
- Free camera controls
- Multiplayer
