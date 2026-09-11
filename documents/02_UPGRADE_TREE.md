# Upgrade Tree

## Rules

- XP is spendable currency.
- Track `lifetimeXp` separately; it never decreases.
- Upgrade definitions must be data-driven.
- Keep gameplay math out of UI components.
- Assistance upgrades improve consistency but are not required for theoretical optimal play.
- Major boomerang unlocks are the strongest active multipliers.
- The game always has exactly one target dummy. There are no target-count upgrades.

## Tree overview

```text
Better Training I
├─ Training
│  ├─ Better Training II
│  │  ├─ Better Training III
│  │  └─ Critical Training I
│  │     ├─ Mega Critical
│  │     └─ Critical Training II  [also requires Triple Throw]
│  │        └─ Critical Mastery
│  └─ ...
│
├─ Precision / Recovery
│  ├─ Quick Reload I -> II -> III -> Recovery Mastery
│  └─ Steady Hands I -> II -> Perfect Window I -> II
│
└─ Active Progression
   └─ Twin Throw
      ├─ Triple Throw
      │  └─ Quad Throw            [also requires Combo Training]
      ├─ Combo Training
      │  └─ Quad Throw
      │     └─ Combo Mastery
      │        └─ Boomerang Mastery [also requires Quad Throw]
      └─ Dog Companion
         ├─ Dog Training I -> II
         └─ Fast Fetch I -> II
                \          /
                 Fetch Mastery
                 ├─ Dog Training III
                 └─ Fast Fetch III

Grandmaster requires:
- Boomerang Mastery
- Fetch Mastery
```

Cross-category critical tiers continue through Mega -> Ultra -> Omega according to their explicit prerequisites below.

## Upgrade definitions

### Training

| ID | Effect | Prerequisite |
|---|---|---|
| `betterTraining1` | Global earned damage `+20%` | none |
| `betterTraining2` | Additional `+25%` | Better Training I |
| `betterTraining3` | Additional `+35%` | Better Training II |
| `criticalTraining1` | Player critical multiplier `2.0x -> 2.25x` | Better Training II |
| `criticalTraining2` | `2.25x -> 2.5x` | Critical Training I + Triple Throw |
| `criticalMastery` | `2.5x -> 3.0x` | Critical Training II |
| `megaCritical` | Add Mega Crit layer | Critical Training I |
| `ultraCritical` | Add Ultra Crit layer | Mega Critical + Critical Training II |
| `omegaCritical` | Add Omega Crit layer | Ultra Critical + Critical Mastery |

Global Training bonuses are additive with each other, then applied as one multiplier.

### Precision / recovery

| ID | Effect | Prerequisite |
|---|---|---|
| `quickReload1` | Miss reload `5.0 -> 4.5 s` | Better Training I |
| `quickReload2` | `4.5 -> 4.0 s` | Quick Reload I |
| `quickReload3` | `4.0 -> 3.0 s` | Quick Reload II |
| `recoveryMastery` | `3.0 -> 2.0 s` | Quick Reload III |
| `steadyHands1` | Total green width `17% -> 19%` | Better Training I |
| `steadyHands2` | `19% -> 21%` | Steady Hands I |
| `perfectWindow1` | White width `3% -> 4%`; subtract equally from green | Steady Hands II |
| `perfectWindow2` | White width `4% -> 5%`; subtract equally from green | Perfect Window I |

Never expand green/white by shrinking total gauge size. Zone widths must continue totaling 100%.

### Player boomerangs

| ID | Effect | Prerequisite |
|---|---|---|
| `twinThrow` | Player boomerangs `1 -> 2` | Better Training I |
| `tripleThrow` | `2 -> 3` | Twin Throw |
| `quadThrow` | `3 -> 4` | Combo Training + Triple Throw |
| `boomerangMastery` | Player-boomerang damage `+50%` | Quad Throw + Combo Mastery |

Hard cap for v1: `4` player boomerangs.

### Target dummy

The game uses exactly one target dummy from start to finish.

- `baseTargets = 1`
- `maxTargets = 1`
- No `secondDummy`, `thirdDummy`, or `fourthDummy` skill exists.
- No skill may depend on a target-count upgrade.
- Player and dog throws always resolve against the same single target.

### Combo

| ID | Effect | Prerequisite |
|---|---|---|
| `comboTraining` | `+2%` player damage per combo step, max `+20%`; white adds 2 steps | Twin Throw |
| `comboMastery` | Maximum combo damage bonus `20% -> 50%` | Quad Throw + Combo Training |

### Dog companion

`dogCompanion` requires Twin Throw.

Base dog:
- Visible beside player.
- Automatically throws every `10 s`.
- Dog throw always hits the single target; no gauge.
- Base dog damage per hit = `25%` of normal base hit damage.
- Dog does not use player critical multiplier or player combo.
- Global Training multiplier does apply to dog damage.
- Dog timer is independent of player throws.
- Pause dog timer while game is paused/backgrounded; no offline earnings in v1.

Dog upgrades:

| ID | Effect | Prerequisite |
|---|---|---|
| `dogTraining1` | Dog damage factor `25% -> 40%` | Dog Companion |
| `dogTraining2` | `40% -> 60%` | Dog Training I |
| `fastFetch1` | Dog interval `10 -> 8 s` | Dog Companion |
| `fastFetch2` | `8 -> 6 s` | Fast Fetch I |
| `fetchMastery` | Dog gains `10%` independent critical chance; dog critical = `2x` | Dog Training II + Fast Fetch II |
| `dogTraining3` | Dog damage factor `60% -> 100%` | Fetch Mastery |
| `fastFetch3` | Dog interval `6 -> 4 s` | Fetch Mastery |

Hard minimum dog interval: `4 s`.

Use `GOOD BOY!` as the dog-critical feedback text.

## Grandmaster

`grandmaster` requires:
- Boomerang Mastery
- Fetch Mastery

Effect:
- Unlock final challenge.
- Does not need a permanent damage multiplier.
- Completion of the final white-zone throw marks `gameCompleted = true`.

## Cost ownership

All costs and lifetime-XP gates must live in one balance/config module, not inside upgrade UI or entity classes. See `03_PROGRESSION_BALANCE.md`.
