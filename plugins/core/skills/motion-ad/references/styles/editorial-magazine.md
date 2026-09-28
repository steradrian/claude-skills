# Style pack: editorial-magazine  (spec-only)

A print magazine spread come alive: big serif cover lines, pull quotes, cropped duotone photo
boxes, folio numbers and rules. Confident, edited, unhurried — the opposite of a UI screen.

## Palette logic
Paper and ink carry the whole ad; one spot colour (a "house" red or mustard) runs kickers, rules
and folios the way a real masthead uses its one signature colour. Brand colour replaces the spot.

Reference: paper `#f7f5ef` · ink `#171512` · kicker red `#c1272d` · rule grey `#9a9488` ·
duotone navy `#223049`.

## Type
- Display serif: Fraunces (optical sizes, black weight), Playfair Display (black/bold) for cover
  lines and pull quotes.
- Kicker/folio/caption: Archivo, Inter — small caps, tracked out, 34–42px.
- Body/deck: Domine or Fraunces at text sizes for any set copy.

## Textures & materials
- `AD.photoBox(parent, {x,y,w,h,src?,duotone,caption})` — cropped box, duotone treatment when no
  photo is supplied, always paired with a caption + rule so it never reads as an empty block.
- `AD.coverLine(parent, {x,y,w,text,size})` — headline with kicker rule above it.
- `AD.pullQuote(parent, {x,y,w,text})` — large italic, opening quote glyph, hairline rule.
- `AD.folio(parent, {x,y,page,section})` — small tracked caps + line, bottom corner.
- Faint column-grid guides and a masthead wordmark for open/close beats.

## Film settings
`{"grain": .3, "weave": .5, "dust": .15, "vignette": .25, "leakBase": 0}` — light print grain,
no light leaks; the world is clean stock, not damaged film.

## Motion grammar
- Camera: elegant slow pushes only (scale 1.0→1.08 over a scene) — no shake, no handheld.
- Kickers type on; cover lines build word by word with a rule-wipe underneath.
- Pull quotes reveal via mask/clip-path, scaling in over a duotone photo box.
- Drop caps slam once, baseline-locked to the first text line, not the box top.
- Photo boxes get slow Ken Burns (scale + slight pan) as secondary motion under held text.

## Transitions
Page turn (3D `rotateY` flip with a shadow sweeping across the fold) · column wipe (vertical
clip-path like a turning page corner) · photo-box crop-zoom into full bleed · kicker rule-line
wipe on a hard cut · two-page spread sliding apart to reveal the next section.

## Components to build on first use (scripts/components/editorial-magazine.js)
- `AD.coverLine`, `AD.pullQuote`, `AD.photoBox`, `AD.folio` as above.
- `AD.pageTurn(fromEl, toEl, p)` — perspective flip helper; set `perspective` on the shared parent.
- `AD.dropCap(el, letter)` — oversized first letter, baseline-aligned.

## Signature moments
1. Masthead + kicker slam, page turn opens the spread.
2. Cover line kinetic build — word by word, rule wipe underneath each line.
3. Pull quote scale-reveal over a duotone photo box, slow camera push.
4. Two-page spread page-turn transition between sections.
5. Folio + rule outro, masthead returns for the closing logo lockup.

## Pitfalls
- `perspective` must live on the shared parent of the page-turn pair, not per-element, or the
  flip renders flat.
- Duotone boxes with no supplied photo need a caption + rule to justify the block — an empty
  color rectangle reads as a placeholder, not a photo.
- Serif at display sizes needs generous line-height/tracking; a 12% camera push-in on a tight
  headline will collide lines — check every string at its largest animated scale.
- Drop caps baseline-aligned to the box top instead of the first text line look broken, not set.

## Defaults
```json
{
  "components": ["core"],
  "fonts": [
    {"family": "Fraunces", "google": "Fraunces", "axes": "opsz,wght"},
    {"family": "Playfair Display", "google": "Playfair Display"},
    {"family": "Archivo", "google": "Archivo"},
    {"family": "Domine", "google": "Domine"}
  ],
  "palette": {
    "paper": "#f7f5ef",
    "ink": "#171512",
    "kickerRed": "#c1272d",
    "ruleGrey": "#9a9488",
    "duotoneNavy": "#223049"
  },
  "film": {"grain": 0.3, "weave": 0.5, "dust": 0.15, "vignette": 0.25, "leakBase": 0, "flicker": 0},
  "background": "#f7f5ef"
}
```
