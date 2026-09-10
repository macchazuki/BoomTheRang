# Mobile UI and Three.js Scene

## Orientation

Design target: portrait phone.

The game should still render safely in landscape/desktop for development, but portrait is authoritative.

Use CSS safe-area insets for notches/home indicators.

## Screen hierarchy

```text
┌─────────────────────────┐
│ XP / combo / progression│
│                         │
│       TARGET AREA       │
│      dummy formation    │
│                         │
│       throw space       │
│                         │
│        PLAYER  DOG      │
│                         │
│ ┌─────────────────────┐ │
│ │ RED GREEN WHITE ... │ │
│ │       marker        │ │
│ └─────────────────────┘ │
│ feedback / reload       │
│ Skills          Settings│
└─────────────────────────┘
```

## Scene

Recommended:
- fixed orthographic camera
- player anchored near bottom center
- dog beside player after unlock
- target formation in upper third
- no player movement
- no camera controls

Target layouts:
- 1: center
- 2: horizontal pair
- 3: shallow triangle
- 4: compact diamond/2x2-like formation

Keep target positions readable on narrow screens.

## Gameplay input

- Tap/click anywhere in unobstructed gameplay area to stop the gauge.
- Buttons/panels must stop propagation or otherwise not trigger throws.
- Use Pointer Events.
- No small "throw" button is required.
- Ignore repeated taps while a throw/reload is active.

## Gauge presentation

Visually show:
- red outer regions
- green near-center regions
- white center region
- high-contrast moving marker

Animation can use CSS transform, but position/result comes from `GaugeController`.

When gauge is locked, freeze marker until result feedback is established.

## Feedback

### Miss
- boomerang trajectory misses target
- text: `MISS`
- show reload countdown
- no target reaction

### Green
- target recoil
- small hit particles/impact
- text: `HIT!`
- show awarded XP

### White
- stronger recoil
- brighter impact/flash
- light screen shake
- text: `PERFECT!`
- show awarded XP prominently

### Dog critical
- text: `GOOD BOY!`
- distinct but smaller feedback than player critical

Avoid effects that make the gauge or next target unreadable.

## Boomerang trajectories

Use deterministic visual paths; gameplay result is already known before animation.

Successful path:
`player/dog -> targets in sequence -> owner`

Miss path:
curve beside targets -> return.

With multiple player boomerangs:
- stagger/offset curves slightly for readability
- all resolve the same player gauge result
- XP is computed from counts, not collision detection

Do not use mesh collisions as authoritative hit detection.

## UI panels

### HUD
Always show:
- spendable XP
- current combo once unlocked
- current reload countdown on miss

Optional compact display:
- boomerang count
- target count

### Upgrade panel
Each node/card shows:
- name
- concise effect/current -> next value
- XP cost
- locked prerequisite if unavailable
- purchased/max state

Do not show hidden future details if the UI becomes crowded; tree logic remains complete internally.

### Settings
Common v1 settings only:
- master volume
- music volume
- SFX volume
- vibration/haptics toggle if used
- reduced motion toggle

## Accessibility/mobile behavior

- minimum comfortable touch targets for controls
- never require hover
- respect `prefers-reduced-motion` where practical
- pause/suppress gameplay input when page is not visible
- avoid horizontal scrolling
- keep essential UI clear of safe-area insets
