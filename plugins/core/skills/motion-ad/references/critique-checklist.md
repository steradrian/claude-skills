# Critique checklist

Run on the contact sheet (`shoot.py --every 0.5 --sheet`) and on any still that looks off. Be the
harsh creative director: "fine" is a fail. For every failed item write the fix, then do it.

## Automatic checks (from shoot.py output)
- [ ] No JS-ERROR lines.
- [ ] No OVERFLOW on settled frames (mid-slam hits can be acceptable; check the still).
- [ ] No SAFE-ZONE hits for key text or the logo (texture/background type should carry `data-bleed`).

## Per frame
- [ ] Is there one obvious hero? Point at it in under half a second.
- [ ] Is the frame filled? Less than ~30% dead space; supporting pieces bleed off edges.
- [ ] At least two depth layers visible; background isn't flat.
- [ ] Text readable at phone size (look at the contact-sheet thumbnail; if you squint to read
      it, it's too small or too low-contrast).
- [ ] Nothing important is covered by another element unintentionally.
- [ ] The hero object's silhouette reads as what it is (not a blob, not the wrong proportions).

## Across the sequence
- [ ] The first frame (t=0.2) is already interesting.
- [ ] The concept's arc is legible from the contact sheet alone, without the storyboard.
- [ ] Rhythm varies: fast sections and holds; no three consecutive beats with the same layout.
- [ ] Every text beat is on screen long enough (0.5s + words/3).
- [ ] Transitions are motivated, not just cuts or fades everywhere.
- [ ] Palette and type are consistent with the approved style frame.
- [ ] The end card holds ≥1.5s, logo + line + CTA all fully legible; loops cleanly if looping.

## Craft
- [ ] Entrances have overshoot/settle; slams have camera shake on the landing frame.
- [ ] Camera is never fully static in a scene.
- [ ] Hand-made styles: objects on twos, boil on held pieces.
- [ ] Grain/film visible but not muddy (look at the darkest and the lightest frames).

## Brand & truth
- [ ] Every claim is user-supplied or approved ([CLAIM] placeholders resolved).
- [ ] Brand colours/fonts used where provided; logo not distorted.
- [ ] No other brands' logos, characters or copyrighted material.

## Log format (critique-log.md)
```
Round 2
- 1.9s: "WASTE." overflows right edge at camera push → size 236 → 178
- 7.3s: shoe reads as slipper → upper scaled 1.42x vertically
```
