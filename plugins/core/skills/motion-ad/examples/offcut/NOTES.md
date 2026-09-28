# OFFCUT 01 reference ad (15s, 9:16, gritty-collage)

**`engine/` is the canonical example: imitate it.** `engine/scenes.js` is the whole ad written
against the engine API (`references/engine-api.md`); `engine/helpers.js` shows how a project keeps
its own hero (the multi-panel shoe SVG) out of the shared components; `engine/ad.config.json`
carries the shots, leaks and flashes; `engine/brief.md` and `engine/storyboard.md` are filled the
way a real project's should be. Build it with `scripts/build.py examples/offcut/engine`.

`reference.html` is the historical source: the original single-file build this skill was
extracted from, fonts removed so it is cheap to read. `reference-with-fonts.html` is the same page
with fonts inlined (270 KB of base64): open it in a browser to watch the original, never read it.
Neither is a template.

| time | scene | techniques worth stealing |
|------|-------|---------------------------|
| 0.00-2.55 | "They called it" typed, WASTE. ransom slam, red marker strike | ransom on twos + kick per letter, rough-filter marker, slow push + rotate |
| 2.20-2.55 | torn cream sheet wipes up | sheet colour = next scene bg, so the swap is invisible (`AD.tornWipe`) |
| 2.55-5.30 | seven taped fabric scraps fly in, typed labels, "all of it." | parallax per piece, blurred foreground scraps, giant outlined background word, whip-pan out with blur |
| 5.30-8.55 | shoe assembles panel by panel, marker notes, "We called it", OFFCUT 01 stamp | SVG parts with fill-box transforms, patterned panel fills, sticker border, stamp slam + punch-in |
| 8.55-11.55 | four 0.75s proof cuts: 83%, 0 new leather, no two pairs alike, hand-cut macro | sub-cuts in one scene, flash frames, halftone shadow number, pattern shuffle every 0.1s, 2.7x macro pan |
| 11.55-15.0 | ransom OFFCUT → clean misregistered logo, shoe drop, tagline, stamp, URL, run-out | chaos → order snap with big kick, back-eased drop, end fade to black that loops into the black opening |

Differences between `engine/` and `reference.html`: the engine port keeps every timing, copy line
and technique, but re-fits the type to the 9:16 safe zones the original ignored (WASTE. and the
end-card lockup are sized with `ransomWidth` and centred on x 505; the bottom 400 px hold no
copy, so the scene 2 bottom row, the proof-cut captions and the end-card stamp/URL moved up; the
scene 1 camera push is 1.08 instead of 1.14).

Build history worth knowing: first pass had WASTE. overflowing the frame, the shoe reading as a
slipper (upper 30% too low), scene 2 looking like a swatch board, and grain too heavy. All were
found only by rendering stills. That's why Phase 6 exists.
