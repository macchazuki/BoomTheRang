# Progression and Balance

## Current pacing goal

BoomTheRang uses a fast-start, steep-growth progression curve inspired by the pacing shape of Fortune Mill's first room:

- cheap purchases begin almost immediately;
- transformative mechanics arrive early;
- automation/helper upgrades arrive after the basic active-play engine is established;
- mid-game costs widen into tens of thousands of XP;
- late upgrades climb through hundreds of thousands;
- Grandmaster is the final `1,000,000 XP` blocker.

This is a pacing reference only. BoomTheRang keeps its existing one-time upgrade graph and damage/XP economy rather than copying Fortune Mill's systems directly.

## Required timing anchors

Measure using **optimal active play** and `optimalProgressionSimulator.js`.

Current targets:

- Better Training I: roughly `10–30 sec`;
- Twin Throw / 2 player boomerangs: roughly `1 min`;
- Combo Training: within roughly `3 min`;
- Mega Critical can be reached within `5 min` when prioritizing its branch;
- Dog Companion: early-mid game;
- later multi-boomerang unlocks must remain ordered;
- the single-target progression should complete within the simulator's intended session window.

These are tuning ranges, not timers. Do not gate upgrades by elapsed play time.

There is no target-count pacing anchor. The game has one target dummy for the entire run.

## Progression shape

Use widening cost bands instead of keeping most upgrades in one narrow range.

| Stage | Typical cost band | Examples |
|---|---:|---|
| Starter | `100–500 XP` | Better Training I, Quick Reload I, Steady Hands I |
| Early mechanics | `900–5,000 XP` | Twin Throw, Combo Training, early critical upgrades |
| First engine expansion | `6,000–35,000 XP` | precision follow-ups, Dog Companion, Better Training III, Triple Throw |
| Mid game | `50,000–160,000 XP` | Critical Training II, Ultra Critical, dog improvements |
| Late mechanics | `200,000–550,000 XP` | Quad Throw, Omega Critical, masteries, Fetch Mastery |
| End game | `650,000–1,000,000 XP` | final side upgrades and Grandmaster |

Important mechanic unlocks should generally be worth saving for before small convenience upgrades.

## Base balance constants

```text
baseXpPerTarget = 10
baseCriticalMultiplier = 2.0

gaugeOneWaySeconds = 1.35
successRecoverySeconds = 0.7
missReloadSeconds = 5.0

basePlayerBoomerangs = 1
baseTargets = 1
maxTargets = 1

dogBaseIntervalSeconds = 10
dogBaseXpFactor = 0.25
```

The base gauge uses 80% red / 17% green / 3% white.

## Reward formula

Player reward uses the production reward calculator:

```text
baseXpPerTarget
× boomerangCount for the resolved throw
× targetCount
× globalTrainingMultiplier
× zoneMultiplier
× comboMultiplier
× boomerangMasteryMultiplier
```

`targetCount` is always `1`, so target progression never changes reward scaling.

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

Again, `targetCount = 1` for the entire game.

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

- The game has exactly one target dummy from start to completion.
- `baseTargets` and `maxTargets` are both `1`.
- No target-count upgrade IDs or dependencies may exist.
- Twin Throw is the first major active multiplier and should arrive early.
- Combo Training follows Twin Throw.
- Dog remains supplemental; fully upgraded dog must not exceed optimal manual player earnings.
- Higher critical tiers should become progressively more expensive and more difficult to hit.
- No mandatory upgrade may reduce player power.
- No offline XP in v1.
