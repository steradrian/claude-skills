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

## Structure (hard rules: a reel that fails these is not done)
- [ ] At least 4 visually distinct scenes (different composition, not the same layout with changing data). A "scene" only
      counts if framing AND what's on screen AND the environment change; the same phone facing camera = one scene.
- [ ] The product works the way it really works (e.g. an in-app assistant is reached by opening the app, not by @-tagging
      it in a chat). Ask when unsure.
- [ ] Real camera travel: pull-back, push-in, pan, whip or zoom-through, not only elements animating in place.
- [ ] At least one set piece: a moment built to be remembered (flip clock, time-freeze, fly-through, tear-open).
- [ ] A story with a turn: hook → escalation → turn (a surprise, a stop, a reversal) → payoff → lockup.
- [ ] UI elements are crafted, not default: real materials (bevels, hinges, layered shadows), designed rings/cards.
  A list, clock or board changing state is a mechanic, never a whole reel.

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
