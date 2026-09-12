# Test Plan

Use Vitest for deterministic gameplay/progression logic. Three.js visual polish does not need pixel-perfect unit tests.

## Required unit tests

### Gauge
- normalized marker sweep/reset behavior is deterministic
- red/green/white classification matches configured widths
- exact boundaries are deterministic
- precision upgrades keep widths valid and total 100%
- multiple boomerang timing areas are consumed independently

### Rewards
- red = `0`
- green = base reward
- white = base × critical multiplier
- target count remains exactly `1`
- Training multiplier applied to player and dog
- Boomerang Mastery applies to player only
- combo applies to player only
- final XP rounding happens once

### Combo
- green adds 1
- white adds 2
- miss resets
- normal cap is 20%
- mastery cap is 50%
- target count never multiplies combo steps

### Reload
- a missed boomerang enters reload
- other available boomerangs can continue during the sweep
- base reload = 5 s
- upgrade values reach 4.5/4/3/2 s correctly

### Upgrades
- cannot buy without enough XP
- cannot buy without prerequisites
- purchase deducts spendable XP only
- lifetime XP never decreases
- duplicate/max purchase rejected
- `secondDummy`, `thirdDummy`, and `fourthDummy` do not exist
- every prerequisite references a real current upgrade ID
- derived `targetCount` is always `1`

### Dog
- no throws before unlock
- base interval 10 s
- speed upgrades 8/6/4 s
- damage factors 25/40/60/100%
- dog hits the single target
- Fetch Mastery crit chance uses injectable RNG
- dog does not change combo
- no catch-up/offline throws after a large resume delta

### Save
- fresh defaults
- round trip
- missing fields recover
- corrupted JSON recovers
- unknown/removed upgrade IDs do not crash and are discarded
- version path is explicit

## Integration tests

At minimum:
1. White tap with 1 boomerang/1 target awards expected XP.
2. Twin Throw provides two independent presses against the same target.
3. A consumed gauge area cannot fire twice in the same sweep.
4. A missed boomerang reloads without restoring at the gauge reset.
5. Dog reward occurs independently and hits only the single target.
6. Upgrade purchase is immediately reflected in calculations and saved state.
7. Full late-game progression still derives `targetCount = 1`.

## Balance simulation

Use `src/progression/optimalProgression.test.js` and `optimalProgressionSimulator.js`.

The simulator should:
- advance logical time
- perform perfect white throws at the actual modeled cadence
- run dog timers after unlock
- purchase a defined progression-optimal route containing only current upgrade IDs
- report acquisition time for named milestones

Assertions/tolerances should verify:
- Better Training I arrives very early
- Twin Throw arrives around the 1 minute mark
- Combo Training follows shortly after Twin Throw
- Triple Throw -> Quad Throw -> Boomerang Mastery remain ordered
- the route completes within the configured simulator session
- deterministic runs produce identical milestones

There are no multi-target timing milestones.

## Manual mobile acceptance

Test at narrow portrait sizes:
- 320px CSS width
- common modern phone widths
- tall/notched display with safe areas

Verify:
- no horizontal scroll
- gauge readable
- exactly one target dummy is rendered during normal play
- target is not clipped
- all controls reachable
- menu tap never throws
- rapid multi-touch does not double-trigger one consumed area
- background/resume does not grant dog/offline XP
- rotation/resize does not break scene
