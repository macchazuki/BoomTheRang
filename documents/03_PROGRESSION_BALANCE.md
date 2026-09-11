# Progression and Balance

## Current pacing goal

BoomTheRang uses a fast-start, steep-growth progression curve inspired by the pacing shape of Fortune Mill's first room:

- cheap purchases begin almost immediately;
- transformative mechanics arrive early;
- automation/helper upgrades arrive after the basic active-play engine is established;
- mid-game costs widen into tens of thousands of XP;
- late upgrades climb through hundreds of thousands;
- Grandmaster is the final `1,000,000 XP` blocker.

This is a pacing reference only. BoomTheRang keeps its existing one-time upgrade graph and XP economy rather than copying Fortune Mill's systems directly.

## Required timing anchors

Measure using **optimal active play** and `optimalProgressionSimulator.js`.

Current v1 targets:

- Better Training I: roughly `10–30 sec`;
- Twin Throw / 2 player boomerangs: roughly `1 min`;
- Second Dummy / 2 targets: roughly `1.5–2.25 min`;
- Combo Training: within roughly `3 min`;
- Mega Critical can be reached within `5 min` when prioritizing its branch;
- Dog Companion: early-mid game, around the first several minutes;
- later multi-boomerang and multi-target unlocks must remain ordered;
- full optimal progression should remain roughly `30–100 min` for the current fast-progression build.

These are tuning ranges, not timers. Do not gate upgrades by elapsed play time.

## Progression shape

Use widening cost bands instead of keeping most upgrades in one narrow range.

| Stage | Typical cost band | Examples |
|---|---:|---|
| Starter | `100–500 XP` | Better Training I, Quick Reload I, Steady Hands I |
| Early mechanics | `900–5,000 XP` | Twin Throw, Second Dummy, Combo Training, early critical upgrades |
| First engine expansion | `6,000–35,000 XP` | precision follow-ups, Dog Companion, Better Training III, Triple Throw |
| Mid game | `50,000–160,000 XP` | Third Dummy, Critical Training II, Ultra Critical, dog improvements |
| Late mechanics | `200,000–550,000 XP` | Quad Throw, Omega Critical, Fourth Dummy, masteries, Fetch Mastery |
| End game | `650,000–1,000,000 XP` | final side upgrades and Grandmaster |

Important mechanic unlocks should generally be worth saving for before small convenience upgrades, matching the Fortune Mill pattern of prioritizing new engines and helpers over minor local gains.

## Base balance constants

```text
baseXpPerTarget = 10
baseCriticalMultiplier = 2.0

gaugeOneWaySeconds = 1.35
successRecoverySeconds = 0.7
missReloadSeconds = 5.0

basePlayerBoomerangs = 1
baseTargets = 1

dogBaseIntervalSeconds = 10
dogBaseXpFactor = 0.25
```

The base gauge uses 80% red / 17% green / 3% white. With the gauge restarting from an edge, first entry into the 3% center white zone occurs at roughly 48.5% of a one-way sweep.

Use the real implemented timing in the simulator rather than relying on hand-calculated approximations.

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
- Green `zoneMultiplier = 1`;
- White uses the current base critical multiplier;
- higher critical layers use their configured multiplier;
- Combo defaults to `1`;
- Boomerang Mastery defaults to `1`.

Dog reward per automatic throw:

```text
baseXpPerTarget
× targetCount
× dogXpFactor
× globalTrainingMultiplier
× dogCriticalMultiplier
```

Round final awarded XP once, after all multipliers.

## Lifetime XP

Maintain:
- `xp` — spendable;
- `lifetimeXp` — cumulative, never decremented.

Purchasing:

```text
xp -= cost
lifetimeXp unchanged
```

Use lifetime XP only for analytics or explicit unlock gates. Do not use current spendable XP to decide whether content has ever been reached.

## Cost ownership

Do not scatter literal upgrade costs through source files.

`src/progression/balance.js` is the single source of tuneable upgrade costs. Upgrade definitions reference those values.

When changing costs:
1. preserve the widening cost bands;
2. run the deterministic progression tests;
3. verify the early timing anchors;
4. verify the critical branch can still reach Mega Critical within five minutes;
5. keep Grandmaster at the intended end-game scale unless the progression target changes explicitly.

## Progression invariants

- Twin Throw is the first major multiplier and should arrive early.
- Second Dummy compounds the value of multiple boomerangs.
- Combo Training follows shortly after the second target.
- Dog remains supplemental; fully upgraded dog must not exceed optimal manual player earnings.
- Higher critical tiers should become progressively more expensive and more difficult to hit.
- White timing remains the best baseline active-play choice before higher critical layers are considered.
- No mandatory upgrade may reduce player power.
- No offline XP in v1.
