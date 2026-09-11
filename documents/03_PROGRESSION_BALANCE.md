# Progression and Balance

## Required timing anchors

Measured using **optimal active play** and a progression-optimal purchase route.

- First purchased upgrade: ~`40 sec`
- Twin Throw / 2 player boomerangs: ~`18 min`
- Second Dummy / 2 targets: ~`27 min`
- Main progression completion: ~`180 min` (3 hours)
- Time between important purchases should trend upward.

Acceptable tuning tolerance for v1:
- First upgrade: ±15 seconds
- 18-minute milestone: ±2 minutes
- 27-minute milestone: ±3 minutes
- 3-hour completion: ±15 minutes

## What "optimal play" means

For the balance simulator:
- Every manual throw lands in white.
- Player buys the progression-optimal upgrade when affordable.
- No misses.
- No idle/offline time.
- Dog operates whenever unlocked.
- Assistance upgrades that do not increase theoretical perfect-play XP may be skipped by the optimal route.

Do not measure the 3-hour target using wall-clock sessions with menus/background time.

## Timing spine

Use these as tuning targets, not hard-coded timers:

| Time | Intended progression point |
|---:|---|
| 0.7m | Better Training I |
| 2m | early recovery upgrade |
| 4m | early precision upgrade |
| 6m | Better Training II |
| 9m | Critical Training I |
| 13m | Quick Reload II / prerequisite completion |
| 18m | **Twin Throw** |
| 27m | **Second Dummy** |
| 37m | **Dog Companion** |
| 49m | first dog XP upgrade |
| 63m | first dog speed upgrade |
| 78m | **Triple Throw** |
| 96m | **Third Dummy** |
| 114–120m | **Combo Training / mid-late mastery** |
| 135m | **Quad Throw** |
| 156m | **Fourth Dummy** |
| 180m | **Grandmaster/final completion path** |

Dog and mastery side nodes can be purchased between these points. Tune their costs so completing required Grandmaster prerequisites still lands near 180 minutes.

## Base balance constants

Recommended starting values:

```text
baseXpPerTarget = 10
baseCriticalMultiplier = 2.0

gaugeOneWaySeconds = 1.6
successRecoverySeconds = 0.7
missReloadSeconds = 5.0

basePlayerBoomerangs = 1
baseTargets = 1

dogBaseIntervalSeconds = 10
dogBaseXpFactor = 0.25
```

With the gauge restarting from an edge, first entry into the 5% center white zone occurs at roughly 47.5% of a one-way sweep. A perfect-play throw cycle is therefore roughly `0.76 s gauge wait + 0.7 s recovery ≈ 1.46 s`.

Use the real implemented timing in the simulator; do not permanently rely on this approximation.

## Reward formula

Player reward for one successful throw:

```text
baseXpPerTarget
× playerBoomerangCount
× targetCount
× globalTrainingMultiplier
× zoneMultiplier
× comboMultiplier
× boomerangMasteryMultiplier
```

Where:
- Green `zoneMultiplier = 1`
- White uses current critical multiplier
- Combo defaults to `1`
- Boomerang Mastery defaults to `1`

Dog reward per automatic throw:

```text
baseXpPerTarget
× targetCount
× dogXpFactor
× globalTrainingMultiplier
× dogCriticalMultiplier
```

Dog critical multiplier is `1` normally and `2` when Fetch Mastery crits.

Round final awarded XP to an integer once, after all multipliers.

## Lifetime XP

Maintain:
- `xp` — spendable
- `lifetimeXp` — cumulative, never decremented

Use `lifetimeXp` for analytics/unlock gates where needed. Do not use current spendable XP to decide whether content should be visible.

Purchasing:
```text
xp -= cost
lifetimeXp unchanged
```

## Cost strategy

Do not scatter literal costs through source files.

Store each upgrade's:
- `costXp`
- optional `unlockLifetimeXp`
- prerequisites

in one balance/definitions file.

The v1 easier-progression pass reduces upgrade costs to roughly 60% of the original five-hour curve. Early reference costs are:

| Upgrade | Cost XP |
|---|---:|
| Better Training I | 480 |
| Quick Reload I | 1,800 |
| Steady Hands I | 1,800 |
| Better Training II | 3,000 |
| Critical Training I | 3,600 |
| Quick Reload II | 5,700 |
| Twin Throw | 8,100 |
| Second Dummy | 24,000 |

For later upgrades, derive seed cost approximately as:

`current optimal XP/min × desired minutes since previous progression purchase`

Then run the simulator and adjust.

## Progression invariants

- Twin Throw should feel like the first transformative multiplier.
- Second Dummy multiplies Twin Throw through chaining.
- Dog remains supplemental; fully upgraded dog must not exceed optimal manual player earnings.
- White timing must remain the highest optimal active XP/min choice.
- No mandatory upgrade may reduce player power.
- Do not make green/white zones so large that timing becomes trivial.
- No offline XP in v1.
