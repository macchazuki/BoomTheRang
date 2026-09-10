# Test Plan

Use Vitest for deterministic gameplay/progression logic. Three.js visual polish does not need pixel-perfect unit tests.

## Required unit tests

### Gauge
- normalized marker reflects at `0` and `1`
- red/green/white classification matches configured widths
- exact boundaries are deterministic
- precision upgrades keep widths valid and total 100%

### Rewards
- red = `0`
- green = base reward
- white = base × critical multiplier
- `boomerangCount × targetCount` applied exactly once
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
- multiple boomerangs/targets do not multiply combo steps

### Reload
- miss enters reload
- taps ignored throughout reload
- base reload = 5 s
- upgrade values reach 4.5/4/3/2 s correctly

### Upgrades
- cannot buy without enough XP
- cannot buy without prerequisites
- purchase deducts spendable XP only
- lifetime XP never decreases
- duplicate/max purchase rejected
- derived values update correctly

### Dog
- no throws before unlock
- base interval 10 s
- speed upgrades 8/6/4 s
- XP factors 25/40/60/100%
- dog chains across all targets
- Fetch Mastery crit chance uses injectable RNG
- dog does not change combo
- no catch-up/offline throws after a large resume delta

### Save
- fresh defaults
- round trip
- missing fields recover
- corrupted JSON recovers
- unknown fields/upgrades do not crash
- version path is explicit

## Integration tests

At minimum:
1. White tap with 1 boomerang/1 target awards expected XP.
2. Twin Throw doubles player hit count/reward.
3. Twin Throw + Second Dummy gives 4 rewarded hits per successful throw.
4. Red result awards 0 and locks player for reload.
5. Dog reward occurs while player is otherwise ready/throwing without corrupting player state.
6. Upgrade purchase is immediately reflected in calculations and saved state.

## Balance simulation

Create a deterministic development test/helper, e.g.:

`src/progression/optimalProgression.test.js`

The simulator should:
- advance logical time
- perform perfect white throws at the actual modeled cadence
- run dog timers after unlock
- purchase a defined progression-optimal route
- report acquisition time for named milestones

Assertions/tolerances:
- Better Training I ~1 min ±20 s
- Twin Throw ~30 min ±3 min
- Second Dummy ~45 min ±4 min
- Grandmaster completion path ~300 min ±20 min
- important purchase gaps generally increase over the run

The balance test is the source of truth for final XP costs.

## Manual mobile acceptance

Test at narrow portrait sizes:
- 320px CSS width
- common modern phone widths
- tall/notched display with safe areas

Verify:
- no horizontal scroll
- gauge readable
- targets not clipped
- all controls reachable
- menu tap never throws
- rapid multi-touch does not double-trigger
- background/resume does not grant dog/offline XP
- rotation/resize does not break scene
