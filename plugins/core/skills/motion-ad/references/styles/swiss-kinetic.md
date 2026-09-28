# Style pack: swiss-kinetic  (spec-only)

International Typographic Style in motion: a visible grid, giant grotesk type, flat colour
fields, hard cuts locked to a beat. Confident, precise, zero decoration. The type is the image.

## Palette logic
Two or three flat colours at full saturation plus black/white. No gradients, no textures beyond
very light grain. Colour fields change on cuts. Reference: white `#f2f1ec` · black `#0e0e0e` ·
signal orange `#ff4a1c` · electric blue `#2f4bff` (use one accent per ad, maybe two).

## Type
- One grotesk family in 2 to 3 weights: e.g. Inter Tight, Archivo, Space Grotesk, Instrument Sans,
  or the brand's sans. Display 300 to 600px, tracking -0.04em; small labels 36 to 44px.
- Words break across lines deliberately; numbers can be enormous and cropped by the frame.
- Sentence case or all lowercase for statements; caps only for tiny labels aligned to the grid.

## Grid
12-column grid with 60px margins (9:16). Every element snaps to column edges and a baseline of
24px. Optional: show the grid as hairlines for a beat, then hide it.

## Film settings
`{"grain": .15, "weave": 0, "dust": 0, "vignette": 0, "leakBase": 0, "flicker": 0}`

## Motion grammar
- No rotation, no boil, no shake (or only a 1-frame 4px kick on the biggest hit).
- Moves are fast and exact: 0.25 to 0.4s with `expo` or `out5`; nothing bounces.
- Masked line reveals: each line slides up from behind a mask (overflow hidden container,
  translateY 100% → 0), staggered 0.06s.
- Per-letter tracking animations: letter-spacing from 0.4em → -0.04em.
- Scale cuts: a word fills the screen, cut to the same word at 20% size in a corner.
- Colour-block wipes: a flat rectangle sweeps across (x from -W to 0) revealing the next scene.

## Transitions
Hard cut on beat · colour-block wipe · mask reveal · match cut on a shape or letter · grid snap
(elements slide along the grid into the next composition).

## Components to build on first use (scripts/components/swiss.js)
- `maskLines(parent, lines, {x,y,w,size,font,lineHeight})` returns line containers for slide-up reveals.
- `colorWipe(parent, color, dir)` full-frame block for wipes.
- `gridOverlay(parent, cols, margin)` hairline grid you can fade in/out.
- `counter(el, from, to, p, format)` numeric roll for stats.

## Signature moments
A statement set huge across three lines and revealed line by line on the beat · a number that
counts up and fills the frame · the logo built from grid-aligned blocks.

## Pitfalls
Without texture the ad lives on timing: sync every cut to `beats` or a strict 0.5s grid. Too many
colours kills it. Centred layouts look generic; align left to the grid.

## Defaults
```json
{"components": ["core"],
 "fonts": [{"family": "Grotesk", "google": "Inter Tight", "axes": "wght@300..800"}],
 "palette": {"white": "#f2f1ec", "black": "#0e0e0e", "orange": "#ff4a1c", "blue": "#2f4bff"},
 "film": {"grain": 0.15, "weave": 0, "dust": 0, "vignette": 0, "leakBase": 0, "flicker": 0},
 "background": "#f2f1ec"}
```
