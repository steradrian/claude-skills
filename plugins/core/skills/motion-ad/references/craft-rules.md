# Craft rules

These are what separate an art-directed ad from "elements fading in". Most are cheap to do and
obvious in the result. Style packs may override specific rules; everything else applies.

## Composition

- **Fill the frame.** Nearly every "amateur" frame has too much empty space. Scale hero elements
  up until they almost touch the safe zone; let supporting pieces bleed off the edges.
- **Layers of depth**: background texture (slow) → background type/shapes (slower parallax) →
  midground content → hero → blurred foreground pieces (fast parallax, `filter: blur(8-10px)`).
  Even two depth layers make a static frame feel shot, not drawn.
- **One hero per frame.** Size, contrast and motion all point at it. Everything else is quieter.
- **Scale contrast.** Pair huge type with small type; a giant number with a tiny caption. Mid-size
  everything is the default look to avoid.
- **Break the grid on purpose**: rotations of 2 to 14°, overlaps, pieces crossing each other.
  (Swiss/minimal packs invert this: strict grid, zero rotation.)
- **Background is never flat.** Texture, grain, a gradient with noise, faint body copy, a giant
  outlined word. Flat #fff or #000 reads as a placeholder.

## Motion grammar

- **Everything is a function of time.** Compute every property in `render(t, lt)`; never use CSS
  transitions or setTimeout. That's what makes scrubbing and MP4 rendering exact.
- **Anticipate, overshoot, settle.** Entrances use `out5` / `back`; exits use `in3`. Linear only
  for drifts and constant camera moves.
- **Slams**: scale 2.2 to 2.8 → 1 in 0.10 to 0.18s with `in3` or `back`, plus `AD.kick(t, 8-16)`
  exactly at the landing frame. The shake sells the weight.
- **Mixed frame rates** (hand-made styles): animate objects on twos with `AD.q12(lt)`, keep the
  camera smooth at full rate, add `AD.boil()` jitter to settled pieces so they stay alive.
- **Stagger** related elements 0.05 to 0.12s apart. Never all at once; never so slowly it drags.
- **Camera always moves** a little: a slow push-in (scale 1.0 → 1.08-1.14 over a scene) plus a
  degree of rotation drift. Add a punch-in (+0.04 to 0.07 scale, decaying) on big hits.
- **Secondary motion** on held heroes: bob (sin, 5 to 8px), drift, a boiling outline, a
  parallax background. A fully static hold looks frozen.
- **Transitions are events**: whip-pan with blur (`filter: blur(18-22px)` for 0.15s, big x
  offset), torn-paper wipe, light-leak burn (`film.leaks`), flash frame on hard cuts
  (`film.flashes`), match cut (same shape/position across the cut).
- **Rhythm**: fast-fast-hold. After a flurry, give the eye 0.8 to 1.5s to rest on something.
- **Typewriter** at 0.025 to 0.045s per character; clip-reveal handwriting over 0.3 to 0.5s.

## Typography

- 9:16 minimums: display ≥ 120px, secondary ≥ 64px, small print ≥ 36px (at 1080 wide).
- Two families usually, three for collage/editorial where mixing is the point.
- Type is an image: animate per letter (`AD.split`), mask, stamp, misregister, stroke-outline at
  giant size behind the content.
- Keep line lengths short: 2 to 5 words per line on vertical formats.
- Check every string fits at its largest animated scale (camera push-ins enlarge it ~12%).

## Texture & finish

- Grain always (strength by pack), vignette subtle, light leaks warm and rare.
- Paper-like materials get torn/cut edges and drop shadows (`AD.card`); stickers get a white
  border; print gets halftone or misregistration.
- Distress masks (`AD.mask`) on stamps and big print, lighter on logos.
- Shadows: two-layer (a soft wide one + a tight dark one). Single soft grey shadows look like UI.

## Hero objects

- Build heroes as layered SVG with patterned fills (see the shoe in `examples/offcut/`): separate
  panels, outlines, stitching/detail lines, a sticker/cut border, and parts that can animate
  independently (assembly, reveals).
- Proportions matter more than detail. Check the silhouette against a real product before adding
  texture: the reference shoe first looked like a slipper because its upper was 30% too low.
- With product photos: cut-outs with a paper/sticker border and shadow, composited into the
  style, never a rectangle photo dropped on a background.

## Performance

- Build DOM once; in render only set transforms, opacity, clip-path, text.
- Avoid animating `filter` except short blurs; avoid huge box-shadows; prefer `drop-shadow` on
  groups. Keep total nodes per scene under ~400.
