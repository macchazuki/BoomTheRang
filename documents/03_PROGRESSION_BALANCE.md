# Progression and Balance

## Required timing anchors

Measured using **optimal active play** and a progression-optimal purchase route.

- First purchased upgrade: ~`1 min`
- Twin Throw / 2 player boomerangs: ~`30 min`
- Second Dummy / 2 targets: ~`45 min`
- Main progression completion: ~`300 min` (5 hours)
- Time between important purchases should trend upward.

Acceptable tuning tolerance for v1:
- 1-minute upgrade: ±20 seconds
- 30-minute milestone: ±3 minutes
- 45-minute milestone: ±4 minutes
- 5-hour completion: ±20 minutes

## What "optimal play" means

For the balance simulator:
- Every manual throw lands in white.
- Player buys the progression-optimal upgrade when affordable.
- No misses.
- No idle/offline time.
- Dog operates whenever unlocked.
- Assistance upgrades that do not increase theoretical perfect-play XP may be skipped by the optimal route.

Do not measure the 5-hour target using wall-clock sessions with menus/background time.

## Timing spine

Use these as tuning targets, not hard-coded timers:

| Time | Intended progression point |
|---:|---|
| 1m | Better Training I |
| 3m | early recovery upgrade |
| 6m | early precision upgrade |
| 10m | Better Training II |
| 15m | Critical Training I |
| 21m | Quick Reload II / prerequisite completion |
| 30m | **Twin Throw** |
| 45m | **Second Dummy** |
| 62m | **Dog Companion** |
| 82m | first dog XP upgrade |
| 105m | first dog speed upgrade |
| 130m | **Triple Throw** |
| 160m | **Third Dummy** |
| 190–195m | **Combo Training / mid-late mastery** |
| 225m | **Quad Throw** |
| 260m | **Fourth Dummy** |
| 300m | **Grandmaster/final completion path** |

Dog and mastery side nodes can be purchased between these points. Tune their costs so completing required Grandmaster prerequisites still lands near 300 minutes.

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

Initial costs should be generated/tuned against the balance simulator. A rough seed for the early spine, using the base timing above, is:

| Upgrade | Seed cost XP |
|---|---:|
| Better Training I | 800 |
| Quick Reload I | 2,000 |
| Steady Hands I | 3,000 |
| Better Training II | 4,000 |
| Critical Training I | 6,000 |
| Quick Reload II | 8,000 |
| Twin Throw | 12,000 |
| Second Dummy | 40,000 |

These are **seed values**, not locked requirements. Actual animation/gauge cadence determines final values.

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
