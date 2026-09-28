# Style pack: hand-drawn-doodle  (spec-only)

A notebook page come alive: marker and pencil lines that never quite sit still, scribble fills,
sticky notes, torn edges. Everything looks drawn in front of you, not placed.

## Palette logic
Notebook paper as the base, graphite/black for primary linework, 2–3 marker colours used like
real Sharpies (cap at 2 active colours per scene). Brand colour becomes the lead marker colour.

Reference: paper `#faf6ec` · notebook grid `#dce6f0` · graphite ink `#2a2823` · marker red
`#e8433f` · marker blue `#2e6fe0` · sticky-note yellow `#fff59b`.

## Type
- Handwriting display: Caveat, Kalam, Patrick Hand, Gochi Hand — headlines and labels.
- Contrast sans (only when a "typed" UI bit needs to read against the hand-drawn world):
  Space Grotesk, small sizes only.

## Textures & materials
- `AD.notebookBg(parent, {ruled|grid, holes})` — ruled or grid paper, spiral-binding holes on
  the left edge.
- `AD.stickyNote(parent, {x,y,w,h,color,rot,text})` — coloured square, slight curl, drop shadow.
- `AD.scribbleFill(parent, {path,color,density})` — animated cross-hatch fill, not an instant fill.
- `AD.doodleArrow(parent, {x1,y1,x2,y2,curve})` — hand-drawn pointer/underline annotation.
- Pencil eraser smudge, torn notebook-page edge for exits.

## Film settings
`{"grain": .4, "weave": 1, "dust": .2, "vignette": .2, "leakBase": 0}` — pencil/paper grain, no
light leaks; instead a soft warm desk-lamp gradient toward one corner.

## Motion grammar
- Every line draws live with `strokeReveal`, ~0.4–0.8s per shape — never appears instantly.
- Boiling applies continuously to ALL active linework, not just settled pieces (the trait that
  separates this pack from gritty-collage's boil-on-hold-only rule) — cap to ~15–20 boiling
  paths per scene for performance.
- Scribble fills sweep in as back-and-forth strokes over time, speed scaled to shape area so
  small shapes don't finish before the eye registers them.
- Sticky notes fly in and "slap" down: overshoot rotation, small `kick` on landing.
- Camera stays mostly static with subtle handheld drift — this is a desktop world, not cinematic.

## Transitions
Scribble-out wipe (a scribble scratches across the frame, then reveals the next) · sticky-note
peel (a note peels up off a corner revealing the scene beneath) · pencil-eraser wipe (an eraser
rectangle wipes the scene away) · doodle-circle iris (a hand-drawn circle draws around new
content, outside fades) · loose notebook page turn.

## Components to build on first use (scripts/components/hand-drawn-doodle.js)
- `AD.doodleShape(parent, {path, strokeColor, fillScribble?})` — stroke reveal + optional scribble.
- `AD.boilLine(el, seed)` — continuous per-frame path jitter wrapper.
- `AD.stickyNote`, `AD.notebookBg`, `AD.scribbleFill`, `AD.doodleArrow` as above.

## Signature moments
1. Hero shape/logo drawn live stroke by stroke, then scribble-filled.
2. Sticky notes slapping onto the page in sequence, each with a hand-written line.
3. Arrows/underlines drawing on to annotate a claim or number.
4. Eraser-wipe transition between scenes.
5. Constant gentle boil on every active line — the connective tissue that never lets it go static.

## Pitfalls
- Boiling every path every frame across a busy scene is expensive — cap active boiling paths and
  bake dense scribble fills as a single path instead of many small ones.
- Scribble-fill speed not scaled to area finishes small shapes instantly, killing the hand-made read.
- Handwriting fonts have inconsistent baselines/kerning at display sizes — check every headline
  string manually, never trust default line-height.
- More than 2 marker colours active in one scene reads cluttered, not playful.

## Defaults
```json
{
  "components": ["core"],
  "fonts": [
    {"family": "Caveat", "google": "Caveat"},
    {"family": "Patrick Hand", "google": "Patrick Hand"},
    {"family": "Space Grotesk", "google": "Space Grotesk"}
  ],
  "palette": {
    "paper": "#faf6ec",
    "grid": "#dce6f0",
    "graphite": "#2a2823",
    "markerRed": "#e8433f",
    "markerBlue": "#2e6fe0",
    "stickyYellow": "#fff59b"
  },
  "film": {"grain": 0.4, "weave": 1, "dust": 0.2, "vignette": 0.2, "leakBase": 0, "flicker": 0},
  "background": "#faf6ec"
}
```
