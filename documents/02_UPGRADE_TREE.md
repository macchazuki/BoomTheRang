# Upgrade Tree

## Rules

- XP is spendable currency.
- Track `lifetimeXp` separately; it never decreases.
- Upgrade definitions must be data-driven.
- Keep gameplay math out of UI components.
- Assistance upgrades improve consistency but are not required for theoretical optimal play.
- Major boomerang/target unlocks are the strongest active multipliers.

## Tree overview

```text
Better Training I
├─ Training
│  ├─ Better Training II
│  │  └─ Better Training III
│  └─ Critical Training I
│     └─ Critical Training II
│        └─ Critical Mastery
│
├─ Precision / Recovery
│  ├─ Quick Reload I
│  │  └─ Quick Reload II
│  │     └─ Quick Reload III
│  │        └─ Recovery Mastery
│  └─ Steady Hands I
│     └─ Steady Hands II
│        └─ Perfect Window I
│           └─ Perfect Window II
│
└─ Active Progression
   └─ Twin Throw
      └─ Second Dummy
         ├─ Dog Companion
         │  ├─ Dog Training I -> II
         │  └─ Fast Fetch I -> II
         │       \              /
         │        -> Fetch Mastery
         │             ├─ Dog Training III
         │             └─ Fast Fetch III
         │
         └─ Triple Throw
            └─ Third Dummy
               └─ Combo Training
                  └─ Quad Throw
                     └─ Fourth Dummy
                        ├─ Combo Mastery
                        └─ Boomerang Mastery

Grandmaster requires:
- Boomerang Mastery
- Fetch Mastery
- Fourth Dummy
```

## Upgrade definitions

### Training

| ID | Effect | Prerequisite |
|---|---|---|
| `betterTraining1` | Global earned XP `+20%` | none |
| `betterTraining2` | Global earned XP additional `+25%` | Better Training I |
| `betterTraining3` | Global earned XP additional `+35%` | Better Training II |
| `criticalTraining1` | Player critical multiplier `2.0x -> 2.25x` | Better Training II |
| `criticalTraining2` | `2.25x -> 2.5x` | Critical Training I + Third Dummy |
| `criticalMastery` | `2.5x -> 3.0x` | Critical Training II |

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

| ID | Effect | Prerequisite | Target timing |
|---|---|---|---:|
| `twinThrow` | Player boomerangs `1 -> 2` | Better Training II + Quick Reload II | ~30 min |
| `tripleThrow` | `2 -> 3` | Second Dummy | ~130 min |
| `quadThrow` | `3 -> 4` | Combo Training + Third Dummy | ~225 min |
| `boomerangMastery` | Player-boomerang XP `+50%` | Fourth Dummy + Combo Mastery | late game |

Hard cap for v1: `4` player boomerangs.

### Targets

| ID | Effect | Prerequisite | Target timing |
|---|---|---|---:|
| `secondDummy` | Targets `1 -> 2` | Twin Throw | ~45 min |
| `thirdDummy` | `2 -> 3` | Triple Throw | ~160 min |
| `fourthDummy` | `3 -> 4` | Quad Throw | ~260 min |

Hard cap for v1: `4` targets.

### Combo

| ID | Effect | Prerequisite |
|---|---|---|
| `comboTraining` | `+2%` player XP per combo step, max `+20%`; white adds 2 steps | Third Dummy + Critical Training II |
| `comboMastery` | Maximum combo bonus `20% -> 50%` | Fourth Dummy + Combo Training |

### Dog companion

`dogCompanion` unlock target: about `60–65 min`.

Base dog:
- Visible beside player.
- Automatically throws every `10 s`.
- Dog throw always hits; no gauge.
- Dog boomerang chains through all unlocked targets.
- Base dog XP per target = `25%` of normal base hit XP.
- Dog does not use player critical multiplier or player combo.
- Global Training XP multiplier does apply to dog XP.
- Dog timer is independent of player throws.
- Pause dog timer while game is paused/backgrounded; no offline earnings in v1.

Dog upgrades:

| ID | Effect | Prerequisite |
|---|---|---|
| `dogTraining1` | Dog XP factor `25% -> 40%` | Dog Companion |
| `dogTraining2` | `40% -> 60%` | Dog Training I |
| `fastFetch1` | Dog interval `10 -> 8 s` | Dog Companion |
| `fastFetch2` | `8 -> 6 s` | Fast Fetch I |
| `fetchMastery` | Dog gains `10%` independent critical chance; dog critical = `2x` dog XP | Dog Training II + Fast Fetch II |
| `dogTraining3` | Dog XP factor `60% -> 100%` | Fetch Mastery |
| `fastFetch3` | Dog interval `6 -> 4 s` | Fetch Mastery |

Hard minimum dog interval: `4 s`.

Use `GOOD BOY!` as the dog-critical feedback text.

## Grandmaster

`grandmaster` requires:
- Boomerang Mastery
- Fetch Mastery
- Fourth Dummy

Effect:
- Unlock final challenge.
- Does not need a permanent XP multiplier.
- Completion of the final white-zone throw marks `gameCompleted = true`.

## Cost ownership

All costs and lifetime-XP gates must live in one balance/config module, not inside upgrade UI or entity classes. See `03_PROGRESSION_BALANCE.md`.
