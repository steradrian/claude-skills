# Style pack: risograph-print  (spec-only)

Two or three flat spot-colour ink layers on uncoated paper, overprinting into a third hue where
they cross, with coarse riso grain and a persistent, deliberate misregistration wobble.

## Palette logic
Two spot inks minimum, three at most — pick from real riso ink names, never a full-colour gamut.
Where two layers overlap they multiply into a mixed third colour; that overlap IS the palette's
third colour, not a separately chosen hex. Brand colour becomes the dominant spot ink.

Reference: fluorescent pink `#ff48b0` · mint `#00b39f` · sunflower `#ffe11a` · riso paper
`#f1ece0` · line ink `#1c1a17` (used sparingly, for linework only, never as a fourth spot fill).

## Type
- Bold geometric sans, stencil-cut feel: Archivo Black, Space Grotesk (bold/black).
- Labels/registration text: Space Mono, uppercase, tracked.
- Two families only — riso type is about flat colour blocks, not mixing voices.

## Textures & materials
- `AD.risoLayer(parent, {color, path/svg, x,y,w,h, seed})` — flat spot shape, multiply blend,
  coarse riso grain, small persistent per-layer misregister jitter (own component, not shared).
- `AD.stencilShape(parent, {path, color, x,y, scale})` — cutout shapes used as pop-in hero forms.
- `AD.overprintText(parent, str, {x,y,size, colorA, colorB, offset})` — two offset colour copies
  of the same word that overprint into the mixed third hue where they overlap.
- `AD.regMarks(parent)` — crop marks + colour-swatch dots, corner framing device.

## Film settings
`{"grain": .55, "weave": 0, "dust": .2, "vignette": .1, "leakBase": 0}` — coarse riso dot grain
specifically (not fine film grain), minimal vignette, no light leaks: flat print, not photography.

## Motion grammar
- Hard-edged movement only — no soft blur transitions, this is a print medium.
- Layers drop/stamp onto the page (a printing-press "thunk"), not graceful flight.
- Persistent misregistration wobble on every spot layer: ±2–4px, independent seed per layer,
  running the whole time it's on screen — this is the pack's idle state, not an accent.
- Overprint reveals live: as two colour copies of type/shape slide together, the overlap zone
  visibly shifts to the multiplied third colour.
- Registration marks/colour dots animate in as a framing beat, not decoration on every frame.

## Transitions
Press-stamp wipe (a colour plate slams down covering frame, lifts to reveal next scene) ·
spot-colour swap (background plate slides off revealing the next colour beneath) · stencil iris
(a stencil shape scales up as a mask) · registration-mark flash cut · misprint-split (frame
doubles into two offset colour copies, then snaps into the next scene).

## Components to build on first use (scripts/components/risograph-print.js)
- `AD.risoLayer`, `AD.stencilShape`, `AD.overprintText`, `AD.regMarks` as above.
- `AD.pressStamp(el, t, p)` — stamp-drop transition helper (covers, holds, lifts).

## Signature moments
1. Overprint text reveal — two colour copies slide together, overlap resolves to the mixed hue.
2. Press-stamp transition — a flat colour plate slams down, lifts to the next scene.
3. Stencil shapes popping onto the page, wobbling with persistent misregistration.
4. Registration marks + colour-swatch dots animating into a corner.
5. Spot-colour background swap wipe between scenes.

## Pitfalls
- Multiply blend over an already-dark background goes muddy — keep multiply layers over the
  light paper base only, never stack two spot layers directly on the ink neutral.
- Misregistration jitter beyond ~4px reads as rendering error, not print character — keep it small.
- More than three spot colours stops reading as riso and becomes generic flat illustration.
- Riso grain must be the coarse dot pattern, not fine film grain, or the medium reads wrong.

## Defaults
```json
{
  "components": ["core"],
  "fonts": [
    {"family": "Archivo Black", "google": "Archivo Black"},
    {"family": "Space Grotesk", "google": "Space Grotesk"},
    {"family": "Space Mono", "google": "Space Mono"}
  ],
  "palette": {
    "pink": "#ff48b0",
    "mint": "#00b39f",
    "sunflower": "#ffe11a",
    "paper": "#f1ece0",
    "lineInk": "#1c1a17"
  },
  "film": {"grain": 0.55, "weave": 0, "dust": 0.2, "vignette": 0.1, "leakBase": 0, "flicker": 0},
  "background": "#f1ece0"
}
```
