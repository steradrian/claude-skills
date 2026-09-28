# Style pack: neon-nightlife  (spec-only)

Dark, wet, electric. Neon tube lettering flickering on, glow bleeding into haze, chromatic edges,
fast cuts. Energy of a club door at 1am.

## Palette logic
Near-black base with blue or purple undertone plus two neon hues that don't fight. Reference:
night `#07060c`, haze `#1a1030`, neon pink `#ff2e88`, cyan `#26f0ff`, acid yellow `#e8ff3a`
(use pink+cyan or pink+yellow, not all three). Glow = same hue at lower alpha, wide blur.

## Type
- Neon: a rounded mono-line or script (e.g. Monoton, Neonderthaw, or a bold rounded sans rendered
  as outline + glow). Keep neon words short (1 to 2 words).
- Punch: a heavy condensed sans for slams (Anton, Bebas Neue, Big Shoulders Display).
- Small: a mono (JetBrains Mono / Space Mono) for tickers, times and prices.

## Components to build on first use (scripts/components/neon.js)
- `neonText(parent, str, {x,y,size,color,font})`: stacked text-shadows (0 0 4px, 0 0 12px,
  0 0 40px, 0 0 90px) + a stroke core; `neonFlicker(el, t, seed)` for tube ignition (random on/off
  frames over 0.3s, then steady with rare dips).
- `haze(parent)`: drifting radial gradients with noise, screen blend.
- `rgbSplit(el, amt)`: duplicated layers offset in red/cyan with `mix-blend-mode: screen`.
- `scanTicker(parent, text)`: scrolling mono ticker strip.
- `reflection(el)`: flipped, blurred, faded copy under neon for a wet-floor look.

## Film settings
`{"grain": .35, "weave": .4, "dust": .2, "vignette": .5, "leakBase": 0, "leakColors": ["rgba(255,46,136,.8)","rgba(38,240,255,.6)","rgba(255,255,255,.7)"], "flicker": .08}`

## Motion grammar
- Tube ignition flicker for reveals; hard cuts on beat with 1-frame white/pink flashes.
- Slams with chromatic split that decays (rgbSplit amt 18px → 0 over 0.2s) + kick 10 to 14.
- Camera: fast push-ins, slight dutch angle (±3°), occasional whip.
- Background haze always drifting; neon hums (small opacity noise 0.9 to 1.0).

## Transitions
Flash cut · glitch slice (horizontal bands offset for 2 to 3 frames) · neon fade-out-to-dark then
ignition in the next scene · light streak wipe.

## Signature moments
Brand name igniting letter by letter · a price or date slamming with RGB split · a ticker of
event info across the bottom third.

## Pitfalls
Glow on everything = mush; reserve it for 1 to 2 elements per frame. Keep text inside safe
zones: glow extends the visual box. Pure #000 backgrounds look flat; use the tinted night colour
plus haze.

## Defaults
```json
{"components": ["core"],
 "fonts": [{"family": "Neon", "google": "Monoton"},
           {"family": "Anton", "google": "Anton"},
           {"family": "Mono", "google": "JetBrains Mono", "axes": "wght@400..700"}],
 "palette": {"night": "#07060c", "haze": "#1a1030", "pink": "#ff2e88", "cyan": "#26f0ff", "acid": "#e8ff3a"},
 "film": {"grain": 0.35, "weave": 0.4, "dust": 0.2, "vignette": 0.5, "leakBase": 0, "flicker": 0.08,
          "leakColors": ["rgba(255,46,136,.8)", "rgba(38,240,255,.6)", "rgba(255,255,255,.7)"]},
 "background": "#07060c"}
```
