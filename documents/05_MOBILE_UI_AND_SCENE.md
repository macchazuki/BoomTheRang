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
│       single dummy      │
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
- exactly one target dummy centered in the upper third
- no player movement
- no camera controls

Do not add multi-target formations. The target count is fixed at `1` for the whole game.

## Gameplay input

- Tap/click anywhere in unobstructed gameplay area to resolve the current gauge area.
- Buttons/panels must stop propagation or otherwise not trigger throws.
- Use Pointer Events.
- No small "throw" button is required.
- With multiple boomerangs, each valid gauge area can be pressed once per sweep.

## Gauge presentation

Visually show:
- red outer regions
- green near-center regions
- white center region
- high-contrast moving marker

Animation can use CSS transform, but position/result comes from `GaugeController`.

Consumed timing areas should remain visually unavailable until the gauge sweep resets.

## Feedback

### Miss
- boomerang trajectory misses target
- text: `MISS`
- show reload countdown for the lost boomerang as needed
- no target reaction

### Green
- target recoil
- small hit particles/impact
- text: `HIT!`
- show awarded damage/XP

### White
- stronger recoil
- brighter impact/flash
- light screen shake
- text: `PERFECT!`
- show awarded damage/XP prominently

### Dog critical
- text: `GOOD BOY!`
- distinct but smaller feedback than player critical

Avoid effects that make the gauge or target unreadable.

## Boomerang trajectories

Use deterministic visual paths; gameplay result is already known before animation.

Successful path:
`player/dog -> single target -> owner`

Miss path:
curve beside the target -> return.

With multiple player boomerangs:
- each press throws one boomerang
- stagger/offset active curves slightly for readability when animations overlap
- damage/XP is computed from resolved gameplay data, not collision detection

Do not use mesh collisions as authoritative hit detection.

## UI panels

### HUD
Always show:
- spendable XP
- current combo once unlocked
- current reload state as needed

Optional compact display:
- boomerang count

Do not show target count as progression because it is always `1`.

### Upgrade panel
Each node/card shows:
- name
- concise effect/current -> next value
- XP cost
- locked prerequisite if unavailable
- purchased/max state

The skill tree contains no target-count nodes.

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
