# Save Data

## Storage

Use `localStorage` for v1.

Recommended key:
`boomTheRang.save.v1`

Save:
- after every upgrade purchase
- after major progression unlock/completion
- periodically during active play (e.g. 15–30 s)
- on `visibilitychange` when hiding

No offline XP in v1.

## Schema

Suggested shape:

```js
{
  version: 1,

  xp: 0,
  lifetimeXp: 0,

  upgrades: {
    betterTraining1: false,
    // ...all upgrade IDs
  },

  progression: {
    gameCompleted: false
  },

  gameplay: {
    combo: 0
  },

  stats: {
    manualThrows: 0,
    hits: 0,
    criticals: 0,
    misses: 0,
    dogThrows: 0,
    dogCriticals: 0,
    targetsHit: 0,
    xpEarnedFromPlayer: 0,
    xpEarnedFromDog: 0,
    longestCombo: 0,
    activePlaySeconds: 0
  },

  settings: {
    masterVolume: 1,
    musicVolume: 1,
    sfxVolume: 1,
    haptics: true,
    reducedMotion: false
  }
}
```

## Derived values

Do **not** save values that can be derived from purchased upgrades unless necessary.

Derive on load:
- player boomerang count
- target count
- critical multiplier
- reload duration
- gauge zone widths
- dog interval
- dog XP factor
- global XP multiplier
- combo cap

This prevents stale saves after balance changes.

## Validation

On load:
- parse in `try/catch`
- verify object/version
- fill missing fields with defaults
- clamp numeric values to safe ranges
- ignore unknown upgrade IDs
- never allow negative XP
- if corrupted beyond repair, fall back to a fresh save

Do not let malformed localStorage prevent game startup.

## Active play time

`activePlaySeconds` increments only while:
- gameplay is running
- document is visible
- game is not paused by an open modal/menu

Use this for completion/statistics, not browser wall-clock elapsed time.

## Future migration

All saves require a numeric `version`.

If schema changes:
`migrateV1ToV2(oldSave) -> newSave`

Never silently reinterpret old fields with incompatible meaning.
