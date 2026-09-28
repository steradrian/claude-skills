# Style pack: gritty-collage  (proven)

Cut-paper editorial collage: torn scraps, ransom-note letters, tape, rubber stamps, marker
annotations, halftone print, film grain. Looks handmade and slightly dangerous. Reference ad:
`examples/offcut/reference.html` (OFFCUT 01, 15s, 9:16).

## Palette logic
A limited print palette: one dark ink, one paper, ONE loud accent, one or two material neutrals,
at most one extra "fabric" colour. Brand colours replace the accent and/or paper.

Reference: ink `#161310` · paper `#ece4d3` · signal red `#d7301c` · kraft `#b88d5a` ·
photocopy grey `#b3afa5` · (fabric) denim `#2c3a57`.

Backgrounds alternate hard between ink, paper, accent and kraft from scene to scene: the colour
change itself is a transition.

## Type
- Display: Anton (condensed, slams), Archivo Black (wide, heavy).
- Editorial: Playfair Display italic 900 for captions and taglines (the "magazine" voice).
- Typewriter: Special Elite for labels, set-up lines, URLs; typed on at 0.03 to 0.045s/char.
- Hand: Permanent Marker for annotations only (2 to 3 words, red, with an arrow).
- Ransom lettering mixes all of the above on different paper scraps for the hook/logo moments.
Config fonts are preset by `new_project.py --style gritty-collage`.

## Textures & materials (components)
- `AD.card` torn/cut paper with fibre rim and two-layer shadow; vary `edges` per piece.
- `AD.tape` on corners of pieces that "hang" on the page.
- `TX.news` / `AD.newsText` faint body copy for newsprint depth (write real brand copy).
- Halftone fields (`AD.halftone`, `halftoneText`), stripes, grids, mottled kraft, speckle cork.
- Stamps with `AD.mask` distress, `mixBlendMode: multiply`.
- Misregistered two-colour logo (`AD.misregister`).
- Marker strokes (`markerPath` + `strokeReveal`) through words, circles around numbers.
- Giant outlined background words: `-webkit-text-stroke: 6px rgba(ink,.24); color: transparent`.

## Film settings
`{"grain": .6, "weave": 1, "dust": 1, "vignette": .4, "leakBase": .06}` plus leaks at the big
transitions and a flash on each hard cut. Grain much above .7 turns muddy on dark scenes.

## Motion grammar
- Objects animate **on twos** (`q12`), camera smooth. Settled pieces **boil** (±0.4 to 1°).
- Pieces fly in from off-frame with big rotation (±40 to 120°) and land with `out5`; each landing
  gets a small kick (2 to 5).
- Ransom letters slam one by one (0.07s stagger, scale 2.5→1, `back`), then a marker strike or circle.
- Stamps slam last in a scene (kick 12 to 18 + camera punch-in).
- Rapid proof section: 0.75s cuts with a background colour change and a flash frame per cut.

## Transitions
Torn-paper sheet wipe (sheet colour = next scene background) · whip-pan with blur · light-leak
burn · hard cut + flash frame · ransom letters snapping into a clean logo (chaos → order payoff).

## Signature moments (pick 2 or 3, not all)
1. Hook word in ransom letters + red marker strike.
2. Scraps assembling into the product (hero SVG parts fly in on twos).
3. Hand-written marker notes pointing at parts of the hero.
4. Rubber-stamped product name.
5. Ransom logo that snaps to a clean misregistered lockup at the end.

## Pitfalls seen in the reference build
- Ransom rows overflow easily: pre-measure with `AD.ransomWidth` and allow ~12% for camera push.
- Evenly spaced scraps look like a swatch board. Make them bigger, overlap them, let some bleed
  off-frame, add blurred foreground pieces.
- Grain + vignette + ambient leak together can turn black scenes brown; keep `leakBase` ≤ .06.
- Distress masks with too many holes make big numbers look dirty rather than printed.

## Defaults
```json
{"components": ["core", "collage"],
 "fonts": [{"family": "Anton", "google": "Anton"},
           {"family": "ArchivoBlack", "google": "Archivo Black"},
           {"family": "SpecialElite", "google": "Special Elite"},
           {"family": "Marker", "google": "Permanent Marker"},
           {"family": "PF", "google": "Playfair Display", "axes": "ital,wght@0,400..900;1,400..900"}],
 "palette": {"ink": "#161310", "paper": "#ece4d3", "red": "#d7301c", "kraft": "#b88d5a", "gray": "#b3afa5"},
 "film": {"grain": 0.6, "weave": 1, "dust": 1, "vignette": 0.4, "leakBase": 0.06},
 "background": "#161310"}
```
